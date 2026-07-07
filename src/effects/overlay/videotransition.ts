import { CgCommand, type EffectGroup, type Logger } from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';
import { HealthCheckedEffect } from '../health-checked-effect';
import type { HealthMonitor } from '../../healthcheck';

// How long the normal transition holds before triggering its slide-off exit.
const HOLD_DURATION = 3000;
// How long the fast sweep animation runs before the effect self-resets.
const SWEEP_DURATION = 1500;

export interface VideoTransitionOverlayEffectOptions {
    direction?: 'left' | 'right';
    fast?: boolean;
    healthType?: string;
}

export class VideoTransitionOverlayEffect extends HealthCheckedEffect {
    private options: Omit<VideoTransitionOverlayEffectOptions, 'healthType'>;
    private logger: Logger;

    public constructor(
        group: EffectGroup,
        options: VideoTransitionOverlayEffectOptions,
        template: string,
        logger: Logger,
        health: HealthMonitor,
    ) {
        const { healthType, ...effectOptions } = options;
        super(group, health, healthType ?? 'videotransition');

        this.logger = logger;
        this.options = effectOptions;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        // Pass direction to the template so the animation knows which way to slide.
        const cmd = CgCommand.add(template, false, {
            direction: options.direction ?? 'left',
            fast: options.fast ?? false,
        });
        cmd.allocate(this.layer);
        execChecked(
            this.logger,
            'add videotransition effect',
            this.executor.execute(cmd),
        );
    }

    public get layer() {
        return this.layers[0];
    }

    public update(opts: { fast?: boolean }) {
        if (opts.fast !== undefined) this.options.fast = opts.fast;
        return execChecked(
            this.logger,
            'update videotransition effect',
            this.executor.execute(
                CgCommand.update({ fast: this.options.fast ?? false }).allocate(
                    this.layer,
                ),
            ),
        );
    }

    public activate() {
        if (!super.activate()) return;

        this.armHealth();
        execChecked(
            this.logger,
            'update videotransition hcId',
            this.executor.execute(
                CgCommand.update({ hcId: this.hcId }).allocate(this.layer),
            ),
        );

        const holdMs = this.options.fast ? SWEEP_DURATION : HOLD_DURATION;
        setTimeout(() => {
            if (!this.active) return;
            this.deactivate();
        }, holdMs);

        return execChecked(
            this.logger,
            'play videotransition effect',
            this.executor.execute(CgCommand.play().allocate(this.layer)),
        );
    }

    public deactivate() {
        if (!super.deactivate()) return;
        this.disarmHealth();
        return execChecked(
            this.logger,
            'stop videotransition effect',
            this.executor.execute(CgCommand.stop().allocate(this.layer)),
        );
    }

    public getMetadata(): Record<string, unknown> {
        return { direction: this.options.direction, fast: this.options.fast };
    }
}
