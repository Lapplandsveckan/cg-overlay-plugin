import {CgCommand, Effect, EffectGroup} from '@lappis/cg-manager';

export interface NamnskyltOverlayEffectOptions {
    name: string;

    totalDuration?: number;
    largeDuration?: number;
}

export class NamnskyltOverlayEffect extends Effect {
    private options: NamnskyltOverlayEffectOptions;

    public constructor(group: EffectGroup, options: NamnskyltOverlayEffectOptions, template: string) {
        super(group);

        this.options = Object.assign({
            totalDuration: 10000,
            largeDuration: 3000,
        }, options);
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, { name: this.options.name });
        cmd.allocate(this.layer);

        this.executor.execute(cmd)
            // .catch(err => Logger.error(`Failed to add namnskylt effect: ${JSON.stringify(err)}`));
    }

    public get layer() {
        return this.layers[0];
    }

    public activate() {
        if (!super.activate()) return;

        setTimeout(() => {
            if (!this.active) return;
            this.minimize();

            setTimeout(() => this.deactivate(), this.options.totalDuration - this.options.largeDuration);
        }, this.options.largeDuration);

        return this.executor.execute(
            CgCommand
                .play()
                .allocate(this.layer),
        );
    }

    private minimize() {
        return this.executor.execute(
            CgCommand
                .next()
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
            name: this.options.name,
        };
    }
}