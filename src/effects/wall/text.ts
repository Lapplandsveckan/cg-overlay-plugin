import {CgCommand, Effect, EffectGroup} from '@lappis/cg-manager';

export interface TextWallEffectOptions {
    text: string;
}

export class TextWallEffect extends Effect {
    private options: TextWallEffectOptions;

    public constructor(group: EffectGroup, options: TextWallEffectOptions, template: string) {
        super(group);

        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, { text: this.options.text });
        cmd.allocate(this.layer);

        this.executor.execute(cmd);
        //    .catch(err => Logger.error(`Failed to add namnskylt effect: ${JSON.stringify(err)}`));
    }

    public get layer() {
        return this.layers[0];
    }

    public update(data: TextWallEffectOptions) {
        return this.executor.execute(
            CgCommand
                .update(data)
                .allocate(this.layer),
        );
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
            text: this.options.text,
        };
    }
}
