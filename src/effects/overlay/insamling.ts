import { CgCommand, type EffectGroup, type Logger } from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';
import { HealthCheckedEffect } from '../health-checked-effect';
import type { HealthMonitor } from '../../healthcheck';

export interface InsamlingOverlayEffectOptions {
    goal?: number;
    now?: number;
    healthType?: string;
}

export class InsamlingOverlayEffect extends HealthCheckedEffect {
    private options: Omit<InsamlingOverlayEffectOptions, 'healthType'>;
    private logger: Logger;

    public constructor(
        group: EffectGroup,
        options: InsamlingOverlayEffectOptions,
        template: string,
        logger: Logger,
        health: HealthMonitor,
    ) {
        const { healthType, ...effectOptions } = options;
        super(group, health, healthType ?? 'insamling');

        this.logger = logger;
        this.options = effectOptions;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, this.options);
        cmd.allocate(this.layer);
        execChecked(
            this.logger,
            'add insamling effect',
            this.executor.execute(cmd),
        );
    }

    public update(options: Omit<InsamlingOverlayEffectOptions, 'healthType'>) {
        this.options = options;
        execChecked(
            this.logger,
            'update insamling effect',
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
            'update insamling hcId',
            this.executor.execute(
                CgCommand.update({ hcId: this.hcId }).allocate(this.layer),
            ),
        );

        return execChecked(
            this.logger,
            'play insamling effect',
            this.executor.execute(CgCommand.play().allocate(this.layer)),
        );
    }

    public deactivate() {
        if (!super.deactivate()) return;
        this.disarmHealth();
        return execChecked(
            this.logger,
            'stop insamling effect',
            this.executor.execute(CgCommand.stop().allocate(this.layer)),
        );
    }

    public getMetadata(): Record<string, unknown> {
        return {};
    }
}
