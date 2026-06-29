import { CgCommand, Effect, type EffectGroup } from '@lappis/cg-manager';

// How long the normal transition holds before triggering its slide-off exit.
const HOLD_DURATION = 3000;
// How long the fast sweep animation runs before the effect self-resets.
const SWEEP_DURATION = 1500;

export interface VideoTransitionOverlayEffectOptions {
    direction?: 'left' | 'right';
    fast?: boolean;
}

export class VideoTransitionOverlayEffect extends Effect {
    private options: VideoTransitionOverlayEffectOptions;

    public constructor(
        group: EffectGroup,
        options: VideoTransitionOverlayEffectOptions,
        template: string,
    ) {
        super(group);

        this.options = options;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        // Pass direction to the template so the animation knows which way to slide.
        const cmd = CgCommand.add(template, false, {
            direction: options.direction ?? 'left',
            fast: options.fast ?? false,
        });
        cmd.allocate(this.layer);

        this.executor.execute(cmd);
        // .catch(err => Logger.error(`Failed to add videotransition effect: ${JSON.stringify(err)}`));
    }

    public get layer() {
        return this.layers[0];
    }

    public update(opts: { fast?: boolean }) {
        if (opts.fast !== undefined) this.options.fast = opts.fast;
        return this.executor.execute(
            CgCommand.update({ fast: this.options.fast ?? false }).allocate(
                this.layer,
            ),
        );
    }

    public activate() {
        if (!super.activate()) return;

        const holdMs = this.options.fast ? SWEEP_DURATION : HOLD_DURATION;
        setTimeout(() => {
            if (!this.active) return;
            this.deactivate();
        }, holdMs);

        return this.executor.execute(CgCommand.play().allocate(this.layer));
    }

    public deactivate() {
        if (!super.deactivate()) return;
        return this.executor.execute(CgCommand.stop().allocate(this.layer));
    }

    public getMetadata(): Record<string, unknown> {
        return { direction: this.options.direction, fast: this.options.fast };
    }
}
