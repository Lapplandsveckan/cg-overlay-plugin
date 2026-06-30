import { CgCommand, type EffectGroup, type Logger } from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';
import { HealthCheckedEffect } from '../health-checked-effect';
import type { HealthMonitor } from '../../healthcheck';

export interface SwishOverlayEffectOptions {
    number: string;
    labels?: string;
    fromBelow?: boolean;
    healthType?: string;
}

export class SwishOverlayEffect extends HealthCheckedEffect {
    private options: Omit<SwishOverlayEffectOptions, 'healthType'>;
    private logger: Logger;

    public constructor(
        group: EffectGroup,
        options: SwishOverlayEffectOptions,
        template: string,
        logger: Logger,
        health: HealthMonitor,
    ) {
        const { healthType, ...effectOptions } = options;
        super(group, health, healthType ?? 'swish');

        this.logger = logger;
        this.options = effectOptions;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, this.options);
        cmd.allocate(this.layer);
        execChecked(
            this.logger,
            'add swish effect',
            this.executor.execute(cmd),
        );
    }

    public update(options: Omit<SwishOverlayEffectOptions, 'healthType'>) {
        this.options = options;
        execChecked(
            this.logger,
            'update swish effect',
            this.executor.execute(
                CgCommand.update(options).allocate(this.layer),
            ),
        );
    }

    public get layer() {
        return this.layers[0];
    }

    public activate() {
        if (!super.activate()) return;

        this.armHealth();
        execChecked(
            this.logger,
            'update swish hcId',
            this.executor.execute(
                CgCommand.update({ hcId: this.hcId }).allocate(this.layer),
            ),
        );

        return execChecked(
            this.logger,
            'play swish effect',
            this.executor.execute(CgCommand.play().allocate(this.layer)),
        );
    }

    public minimize() {
        // Ensure base tracks this as active so a subsequent deactivate()
        // actually fires the stop command. Returns false when already
        // active — fine, we just want the side-effect of flipping the flag.
        super.activate();
        return execChecked(
            this.logger,
            'minimize swish effect',
            this.executor.execute(CgCommand.next().allocate(this.layer)),
        );
    }

    public deactivate() {
        if (!super.deactivate()) return;
        this.disarmHealth();
        return execChecked(
            this.logger,
            'stop swish effect',
            this.executor.execute(CgCommand.stop().allocate(this.layer)),
        );
    }

    public setNumber(number: string) {
        this.options.number = number;
        return execChecked(
            this.logger,
            'set swish number',
            this.executor.execute(
                CgCommand.update({ number: this.options.number }).allocate(
                    this.layer,
                ),
            ),
        );
    }

    public getMetadata(): Record<string, unknown> {
        return {
            number: this.options.number,
        };
    }
}
