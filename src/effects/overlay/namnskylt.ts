import { CgCommand, type EffectGroup, type Logger } from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';
import { HealthCheckedEffect } from '../health-checked-effect';
import type { HealthMonitor } from '../../healthcheck';

export interface NamnskyltOverlayEffectOptions {
    name: string;
    healthType?: string;
    totalDuration?: number;
    largeDuration?: number;
}

export class NamnskyltOverlayEffect extends HealthCheckedEffect {
    private options: Required<
        Pick<
            NamnskyltOverlayEffectOptions,
            'name' | 'totalDuration' | 'largeDuration'
        >
    >;
    private logger: Logger;
    public onAutoDeactivate?: () => void;

    public constructor(
        group: EffectGroup,
        options: NamnskyltOverlayEffectOptions,
        template: string,
        logger: Logger,
        health: HealthMonitor,
    ) {
        const { healthType, name, totalDuration, largeDuration } = options;
        super(group, health, healthType ?? 'namnskylt');

        this.logger = logger;
        this.options = {
            name,
            totalDuration: totalDuration ?? 10000,
            largeDuration: largeDuration ?? 3000,
        };
        this.allocateLayers(1);
        this.executor.executeAllocations();

        // Only send name in CG ADD; hcId is sent via update right before play
        // in activate() so it follows the same path as all other overlay effects.
        const cmd = CgCommand.add(template, false, { name });
        cmd.allocate(this.layer);
        execChecked(
            this.logger,
            'add namnskylt effect',
            this.executor.execute(cmd),
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
            'update namnskylt hcId',
            this.executor.execute(
                CgCommand.update({ hcId: this.hcId }).allocate(this.layer),
            ),
        );

        setTimeout(() => {
            if (!this.active) return;
            this.minimize();

            setTimeout(() => {
                this.deactivate();
                this.onAutoDeactivate?.();
            }, this.options.totalDuration - this.options.largeDuration);
        }, this.options.largeDuration);

        return execChecked(
            this.logger,
            'play namnskylt effect',
            this.executor.execute(CgCommand.play().allocate(this.layer)),
        );
    }

    private minimize() {
        return execChecked(
            this.logger,
            'minimize namnskylt effect',
            this.executor.execute(CgCommand.next().allocate(this.layer)),
        );
    }

    public deactivate() {
        if (!super.deactivate()) return;
        this.disarmHealth();

        setTimeout(() => {
            if (this.active) return;
            this.dispose();
        }, 1000);

        return execChecked(
            this.logger,
            'stop namnskylt effect',
            this.executor.execute(CgCommand.stop().allocate(this.layer)),
        );
    }

    public getMetadata(): Record<string, unknown> {
        return {
            name: this.options.name,
        };
    }
}
