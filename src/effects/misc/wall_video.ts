import {
    ClearCommand,
    Command,
    Effect,
    EffectGroup,
    PauseCommand,
    PlayCommand,
    Transform,
    LoadBGCommand,
    ResumeCommand,
    PlayoutOptions,
} from '@lappis/cg-manager';
import { MediaDoc } from '@lappis/cg-manager/dist/types/scanner/db';


type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N ? R : _TupleOf<T, N, [T, ...R]>;

export interface WallVideoEffectOptions {
    media: MediaDoc;
    loop?: boolean;
    disposeOnStop?: boolean;
    transform?: Tuple<number, 8>;
}

export class WallVideoEffect extends Effect {
    protected options: WallVideoEffectOptions;

    public constructor(group: EffectGroup, options: WallVideoEffectOptions) {
        super(group);

        this.options = options;
        this.allocateLayers();

        if (options.transform) this.setTransform(Transform.fromArray(options.transform));
    }

    protected playing: boolean = false;
    protected paused: boolean = false;

    public activate(play: boolean = true) {
        if (!super.activate()) return;

        let commandType = LoadBGCommand;
        if (play) commandType = PlayCommand;

        const cmd = commandType.video(this.options.media.id, { loop: this.options.loop });
        cmd.allocate(this.layer);

        if (play) this.handlePlay();
        return this.executor.execute(cmd);
    }

    protected get layer() {
        return this.layers[0];
    }

    public play() {
        if (!this.active) return this.activate(true);
        if (this.playing) return;
        if (this.canceled) return;

        const cmd = PlayCommand.video(this.options.media.id, { loop: this.options.loop });
        cmd.allocate(this.layer);

        this.handlePlay();
        return this.executor.execute(cmd);
    }

    private canceled: boolean = false;
    public cancel() {
        if (!this.active) return;
        this.canceled = true;
        this.emit('video:finish');
        this.deactivate();
    }

    protected handlePlay() {
        this.playing = true;
        this.paused = false;

        this.emit('video:play');
    }

    public pause() {
        if (!this.active) return;
        if (!this.playing) return;
        this.emit('video:pause');

        this.playing = false;
        this.paused = true;

        const cmd = new PauseCommand(this.layer);
        return this.executor.execute(cmd);
    }

    public resume() {
        if (!this.active) return;
        if (!this.paused) return;
        this.emit('video:resume');

        this.playing = true;
        this.paused = false;

        const cmd = new ResumeCommand(this.layer);
        return this.executor.execute(cmd);
    }

    public deactivate() {
        if (!super.deactivate()) return;
        this.emit('video:deactivate');

        this.playing = false;

        const cmd: Command = new ClearCommand(this.layer);
        const result = this.executor.execute(cmd);
        if (this.options.disposeOnStop) result.then(() => !this.active && this.dispose());

        return result;
    }

    public getMetadata(): {} {
        return {
            playing: this.playing,
            now: Date.now(),
        };
    }
}
