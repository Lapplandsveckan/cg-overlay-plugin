import { CgCommand, Effect, type EffectGroup } from '@lappis/cg-manager';

export interface VideoTransitionOverlayEffectOptions {
    direction?: 'left' | 'right';
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
        });
        cmd.allocate(this.layer);

        this.executor.execute(cmd);
        // .catch(err => Logger.error(`Failed to add videotransition effect: ${JSON.stringify(err)}`));
    }

    public get layer() {
        return this.layers[0];
    }

    public activate() {
        if (!super.activate()) return;

        setTimeout(() => {
            if (!this.active) return;
            this.deactivate();
        }, 3000);

        return this.executor.execute(CgCommand.play().allocate(this.layer));
    }

    public deactivate() {
        if (!super.deactivate()) return;
        return this.executor.execute(CgCommand.stop().allocate(this.layer));
    }

    public getMetadata(): Record<string, unknown> {
        return { direction: this.options.direction };
    }
}
