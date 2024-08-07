import {CgCommand, Effect, EffectGroup} from '@lappis/cg-manager';

export interface BarsOverlayEffectOptions {

}

export class BarsOverlayEffect extends Effect {
    private options: BarsOverlayEffectOptions;

    public constructor(group: EffectGroup, options: BarsOverlayEffectOptions, template: string) {
        super(group);

        this.options = options;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false);
        cmd.allocate(this.layer);

        this.executor.execute(cmd);
        // .catch(err => Logger.error(`Failed to add videotransition effect: ${JSON.stringify(err)}`));
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

    public deactivate() {
        if (!super.deactivate()) return;

        return this.executor.execute(
            CgCommand
                .stop()
                .allocate(this.layer),
        );
    }

    public getMetadata(): {} {
        return {

        };
    }
}