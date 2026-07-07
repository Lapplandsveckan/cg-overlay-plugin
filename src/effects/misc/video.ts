import {
    ClearCommand,
    type Command,
    Effect,
    type EffectGroup,
    MixerCommand,
    PauseCommand,
    PlayCommand,
    Transform,
    LoadBGCommand,
    ResumeCommand,
    type Logger,
} from '@lappis/cg-manager';
import { type MediaDoc } from '@lappis/cg-manager/dist/types/scanner/db';
import { execChecked } from '../../diagnostics';
import { DEFAULT_CHANNEL_FPS } from './fps';

type Tuple<T, N extends number> = N extends N
    ? number extends N
        ? T[]
        : _TupleOf<T, N, []>
    : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N
    ? R
    : _TupleOf<T, N, [T, ...R]>;

export interface VideoEffectOptions {
    media: MediaDoc;
    loop?: boolean;
    disposeOnStop?: boolean;
    holdLastFrame?: boolean;
    transform?: Tuple<number, 8>;
    logger?: Logger;

    seekSec?: number;
    lengthSec?: number;
    volume?: number;
    channelFps?: number;
}

// SEEK/LENGTH are in channel frames, not seconds; channelFps comes from
// resolveChannelFps in src/overlay.ts, else DEFAULT_CHANNEL_FPS.
function secToFrames(sec: number, fps: number): number {
    return Math.round(sec * fps);
}

export class VideoEffect extends Effect {
    protected options: VideoEffectOptions;
    private logger: Logger | null;

    public constructor(group: EffectGroup, options: VideoEffectOptions) {
        super(group);

        this.options = options;
        this.logger = options.logger ?? null;
        this.allocateLayers();

        if (options.transform)
            this.setTransform(Transform.fromArray(options.transform));
    }

    protected playing: boolean = false;
    protected paused: boolean = false;

    protected startedTime: number = -1;
    protected pausedTime: number = -1;
    protected pausedDuration: number = 0;
    protected clipDuration: number;

    protected getFps(): number {
        return this.options.channelFps ?? DEFAULT_CHANNEL_FPS;
    }

    protected getPlayoutOptions() {
        const { loop, seekSec, lengthSec } = this.options;
        const fps = this.getFps();
        return {
            loop,
            seek: seekSec ? secToFrames(seekSec, fps) : undefined,
            length: lengthSec ? secToFrames(lengthSec, fps) : undefined,
        };
    }

    public activate(play: boolean = true) {
        if (!super.activate()) return;

        let commandType = LoadBGCommand;
        if (play) commandType = PlayCommand;

        const cmd = commandType.video(
            this.options.media.id,
            this.getPlayoutOptions(),
        );
        cmd.allocate(this.layer);

        const result = this.executor.execute(cmd);
        if (play) this.handlePlay();
        if (this.logger)
            execChecked(
                this.logger,
                `activate video "${this.options.media.id}"`,
                result,
            );
        return result;
    }

    protected get layer() {
        return this.layers[0];
    }

    public play() {
        if (!this.active) return this.activate(true);
        if (this.playing) return;
        if (this.canceled) return;

        const cmd = PlayCommand.video(
            this.options.media.id,
            this.getPlayoutOptions(),
        );
        cmd.allocate(this.layer);

        const result = this.executor.execute(cmd);
        this.handlePlay();
        if (this.logger)
            execChecked(
                this.logger,
                `play video "${this.options.media.id}"`,
                result,
            );
        return result;
    }

    public waitForFinish() {
        if (this.canceled) return Promise.resolve();
        return new Promise<void>(resolve => {
            if (!this.active) return resolve();
            this.once('video:finish', resolve);
        });
    }

    private canceled: boolean = false;
    public cancel() {
        if (!this.active) return;
        this.canceled = true;
        this.emit('video:finish');
        this.deactivate();
    }

    private playTimeout: any;

    protected getEffectiveDuration(): number | undefined {
        const duration = this.options.media.mediainfo?.format?.duration;
        if (duration === undefined) return undefined;

        const seek = this.options.seekSec ?? 0;
        const length = this.options.lengthSec ?? duration - seek;
        return Math.max(0, Math.min(length, duration - seek));
    }

    protected applyVolume() {
        const { volume } = this.options;
        if (volume === undefined) return;

        const cmd = MixerCommand.create().volume(volume).allocate(this.layer);

        const result = this.executor.execute(cmd);
        if (this.logger)
            execChecked(
                this.logger,
                `set volume for video "${this.options.media.id}"`,
                result,
            );
    }

    protected handlePlay() {
        this.playing = true;
        this.paused = false;

        this.emit('video:play');
        this.applyVolume();

        const duration = this.getEffectiveDuration();
        if (duration === undefined) return;

        this.startedTime = Date.now();
        this.clipDuration = duration;
        if (this.options.loop) return;

        this.playTimeout = setTimeout(
            () => this.handleFinish(),
            duration * 1000,
        );
    }

    protected handleFinish() {
        if (!this.active) return;
        this.emit('video:finish');

        this.playing = false;
        if (!this.options.holdLastFrame) this.deactivate();
    }

    public pause() {
        if (!this.active) return;
        if (!this.playing) return;
        this.emit('video:pause');

        this.playing = false;
        this.paused = true;

        clearTimeout(this.playTimeout); // TODO: only pause the timeout
        this.pausedTime = Date.now();

        const cmd = new PauseCommand(this.layer);
        const result = this.executor.execute(cmd);
        if (this.logger)
            execChecked(
                this.logger,
                `pause video "${this.options.media.id}"`,
                result,
            );
        return result;
    }

    public resume() {
        if (!this.active) return;
        if (!this.paused) return;
        this.emit('video:resume');

        this.playing = true;
        this.paused = false;

        const playTime =
            this.pausedTime - this.startedTime - this.pausedDuration;
        this.pausedDuration += Date.now() - this.pausedTime;
        this.pausedTime = -1;

        if (!this.options.loop) {
            const remaining = this.clipDuration * 1000 - playTime;
            this.playTimeout = setTimeout(() => this.handleFinish(), remaining);
        }

        const cmd = new ResumeCommand(this.layer);
        const result = this.executor.execute(cmd);
        if (this.logger)
            execChecked(
                this.logger,
                `resume video "${this.options.media.id}"`,
                result,
            );
        return result;
    }

    public deactivate() {
        if (!super.deactivate()) return;
        this.emit('video:deactivate');

        clearTimeout(this.playTimeout);
        this.playing = false;

        const cmd: Command = new ClearCommand(this.layer);
        const result = this.executor.execute(cmd);
        if (this.logger)
            execChecked(
                this.logger,
                `deactivate video "${this.options.media.id}"`,
                result,
            );
        if (this.options.disposeOnStop)
            result.then(() => !this.active && this.dispose());

        return result;
    }

    public getRemainingTime(): number {
        if (!this.playing || this.options.loop || !this.clipDuration) return 0;
        const elapsed =
            (Date.now() - this.startedTime - this.pausedDuration) / 1000;
        return Math.max(0, this.clipDuration - elapsed);
    }

    public getMetadata(): Record<string, unknown> {
        const now = Date.now();
        let playDuration = 0;
        if (this.playing)
            playDuration = now - this.startedTime - this.pausedDuration;
        else if (this.paused)
            playDuration =
                this.pausedTime - this.startedTime - this.pausedDuration;

        return {
            playing: this.playing,
            paused: this.paused,
            loop: this.options.loop ?? false,

            startedTime: this.startedTime,
            pausedTime: this.pausedTime,

            pausedDuration: this.pausedDuration,
            clipDuration: this.clipDuration * 1000,

            playDuration,
            now,

            seekSec: this.options.seekSec,
            lengthSec: this.options.lengthSec,
            volume: this.options.volume,
        };
    }
}
