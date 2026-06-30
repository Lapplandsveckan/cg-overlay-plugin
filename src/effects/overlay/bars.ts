import { CgCommand, type EffectGroup, type Logger } from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';
import { HealthCheckedEffect } from '../health-checked-effect';
import type { HealthMonitor } from '../../healthcheck';

export interface BarsOverlayEffectOptions {
    healthType?: string;
}

export class BarsOverlayEffect extends HealthCheckedEffect {
    private logger: Logger;

    public constructor(
        group: EffectGroup,
        options: BarsOverlayEffectOptions,
        template: string,
        logger: Logger,
        health: HealthMonitor,
    ) {
        super(group, health, options.healthType ?? 'bars');

        this.logger = logger;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, {});
        cmd.allocate(this.layer);
        execChecked(this.logger, 'add bars effect', this.executor.execute(cmd));
    }

    public get layer() {
        return this.layers[0];
    }

    public activate() {
        if (!super.activate()) return;

        this.armHealth();
        execChecked(
            this.logger,
            'update bars hcId',
            this.executor.execute(
                CgCommand.update({ hcId: this.hcId }).allocate(this.layer),
            ),
        );

        return execChecked(
            this.logger,
            'play bars effect',
            this.executor.execute(CgCommand.play().allocate(this.layer)),
        );
    }

    public deactivate() {
        if (!super.deactivate()) return;
        this.disarmHealth();
        return execChecked(
            this.logger,
            'stop bars effect',
            this.executor.execute(CgCommand.stop().allocate(this.layer)),
        );
    }

    public getMetadata(): Record<string, unknown> {
        return {};
    }
}
