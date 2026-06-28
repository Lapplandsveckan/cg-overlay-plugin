import { CgCommand, Effect, type EffectGroup } from '@lappis/cg-manager';

export interface PresentationOverlayEffectOptions {
    text: string;
    reference: string;
    heading?: boolean;
}

export class PresentationOverlayEffect extends Effect {
    private options: PresentationOverlayEffectOptions;

    public constructor(
        group: EffectGroup,
        options: PresentationOverlayEffectOptions,
        template: string,
    ) {
        super(group);

        this.options = options;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, options);
        cmd.allocate(this.layer);

        this.executor.execute(cmd);
    }

    public get layer() {
        return this.layers[0];
    }

    public update(options: Partial<PresentationOverlayEffectOptions>) {
        this.options = { ...this.options, ...options };
        return this.executor.execute(
            CgCommand.update(this.options).allocate(this.layer),
        );
    }

    public activate() {
        if (!super.activate()) return;

        return this.executor.execute(CgCommand.play().allocate(this.layer));
    }

    public deactivate() {
        if (!super.deactivate()) return;

        return this.executor.execute(CgCommand.stop().allocate(this.layer));
    }

    public getMetadata(): Record<string, unknown> {
        return {
            text: this.options.text,
            reference: this.options.reference,
            heading: this.options.heading,
        };
    }
}
