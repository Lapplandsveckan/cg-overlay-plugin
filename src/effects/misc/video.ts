import {
    ClearCommand,
    type Command,
    Effect,
    type EffectGroup,
    PauseCommand,
    PlayCommand,
    Transform,
    LoadBGCommand,
    ResumeCommand,
    type Logger,
} from '@lappis/cg-manager';
import { type MediaDoc } from '@lappis/cg-manager/dist/types/scanner/db';
import { execChecked } from '../../diagnostics';

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

    public activate(play: boolean = true) {
        if (!super.activate()) return;

        let commandType = LoadBGCommand;
        if (play) commandType = PlayCommand;

        const cmd = commandType.video(this.options.media.id, {
            loop: this.options.loop,
        });
        cmd.allocate(this.layer);

        if (play) this.handlePlay();
        const result = this.executor.execute(cmd);
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

        const cmd = PlayCommand.video(this.options.media.id, {
            loop: this.options.loop,
        });
        cmd.allocate(this.layer);

        this.handlePlay();
        const result = this.executor.execute(cmd);
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

    protected handlePlay() {
        this.playing = true;
        this.paused = false;

        this.emit('video:play');

        const duration = this.options.media.mediainfo.format.duration;
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
            const duration = this.clipDuration * 1000 - playTime;
            this.playTimeout = setTimeout(() => this.handleFinish(), duration);
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

    public getMetadata(): Record<string, unknown> {
        return {
            playing: this.playing,
            loop: this.options.loop ?? false,

            startedTime: this.startedTime,
            pausedTime: this.pausedTime,

            pausedDuration: this.pausedDuration,
            clipDuration: this.clipDuration * 1000,

            playDuration: this.playing
                ? Date.now() - this.startedTime - this.pausedDuration
                : 0,
            now: Date.now(),
        };
    }
}
