import {CgCommand, Effect, EffectGroup} from '@lappis/cg-manager';

export interface NamnskyltWallEffectOptions {
    name: string;

    totalDuration?: number;
}

export class NamnskyltWallEffect extends Effect {
    private options: NamnskyltWallEffectOptions;

    public constructor(group: EffectGroup, options: NamnskyltWallEffectOptions, template: string) {
        super(group);

        this.options = Object.assign({
            totalDuration: 10000,
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
        setTimeout(() => this.deactivate(), this.options.totalDuration);

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
            name: this.options.name,
        };
    }
}