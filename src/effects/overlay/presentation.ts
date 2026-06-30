import { CgCommand, type EffectGroup, type Logger } from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';
import { HealthCheckedEffect } from '../health-checked-effect';
import type { HealthMonitor } from '../../healthcheck';

export interface PresentationOverlayEffectOptions {
    text: string;
    reference: string;
    heading?: boolean;
    healthType?: string;
}

export class PresentationOverlayEffect extends HealthCheckedEffect {
    private options: Omit<PresentationOverlayEffectOptions, 'healthType'>;
    private logger: Logger;

    public constructor(
        group: EffectGroup,
        options: PresentationOverlayEffectOptions,
        template: string,
        logger: Logger,
        health: HealthMonitor,
    ) {
        const { healthType, ...effectOptions } = options;
        super(group, health, healthType ?? 'presentation');

        this.logger = logger;
        this.options = effectOptions;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, this.options);
        cmd.allocate(this.layer);
        execChecked(
            this.logger,
            'add presentation effect',
            this.executor.execute(cmd),
        );
    }

    public get layer() {
        return this.layers[0];
    }

    public update(
        options: Partial<Omit<PresentationOverlayEffectOptions, 'healthType'>>,
    ) {
        this.options = { ...this.options, ...options };
        return execChecked(
            this.logger,
            'update presentation effect',
            this.executor.execute(
                CgCommand.update(this.options).allocate(this.layer),
            ),
        );
    }

    public activate() {
        if (!super.activate()) return;

        this.armHealth();
        execChecked(
            this.logger,
            'update presentation hcId',
            this.executor.execute(
                CgCommand.update({ hcId: this.hcId }).allocate(this.layer),
            ),
        );

        return execChecked(
            this.logger,
            'play presentation effect',
            this.executor.execute(CgCommand.play().allocate(this.layer)),
        );
    }

    public deactivate() {
        if (!super.deactivate()) return;
        this.disarmHealth();
        return execChecked(
            this.logger,
            'stop presentation effect',
            this.executor.execute(CgCommand.stop().allocate(this.layer)),
        );
    }

    public getMetadata(): Record<string, unknown> {
        return {
            text: this.options.text,
            reference: this.options.reference,
            heading: this.options.heading,
        };
    }
}
