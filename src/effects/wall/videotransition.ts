import {CgCommand, Effect, EffectGroup} from '@lappis/cg-manager';

export interface VideoTransitionWallEffectOptions {

}

export class VideoTransitionWallEffect extends Effect {
    private options: VideoTransitionWallEffectOptions;

    public constructor(group: EffectGroup, options: VideoTransitionWallEffectOptions, template: string) {
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

        setTimeout(() => {
            if (!this.active) return;

            this.emit('transition:ready');
            this.executor.execute(
                CgCommand
                    .next()
                    .allocate(this.layer),
            );
        }, 2000);

        return this.executor.execute(
            CgCommand
                .play()
                .allocate(this.layer),
        );
    }

    public deactivate() {
        if (!super.deactivate()) return;

        setTimeout(() => {
            if (this.active) return;
            this.dispose();
        }, 1000);

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