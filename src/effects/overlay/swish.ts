import {CgCommand, Effect, EffectGroup} from '@lappis/cg-manager';

export interface SwishOverlayEffectOptions {
    number: string;
}

export class SwishOverlayEffect extends Effect {
    private options: SwishOverlayEffectOptions;

    public constructor(group: EffectGroup, options: SwishOverlayEffectOptions, template: string) {
        super(group);

        this.options = options;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, { number: this.options.number });
        cmd.allocate(this.layer);

        this.executor.execute(cmd)
            // .catch(err => Logger.error(`Failed to add swish effect: ${JSON.stringify(err)}`));
    }

    public get layer() {
        return this.layers[0];
    }

    public activate() {
        if (!super.activate()) return;
        return this.executor.execute(
            CgCommand
                .play()
                .allocate(this.layer),
        );
    }

    public minimize() {
        return this.executor.execute(
            CgCommand
                .next()
                .allocate(this.layer),
        );
    }

    public deactivate() {
        if (!super.deactivate()) return;
        return this.executor.execute(
            CgCommand
                .stop()
                .allocate(this.layer),
        );
    }

    public setNumber(number: string) {
        this.options.number = number;
        return this.executor.execute(
            CgCommand
                .update({ number: this.options.number })
                .allocate(this.layer),
        );
    }

    public getMetadata(): {} {
        return {
            number: this.options.number,
        };
    }
}