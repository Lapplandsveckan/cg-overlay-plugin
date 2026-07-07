import { CgCommand, type EffectGroup, type Logger } from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';
import { HealthCheckedEffect } from '../health-checked-effect';
import type { HealthMonitor } from '../../healthcheck';
import type { VideoIntroMode } from '../../overlay-types';

// How long the normal transition holds before triggering its slide-off exit.
const HOLD_DURATION = 3000;
// How long the fast sweep animation runs before the effect self-resets.
const SWEEP_DURATION = 1500;

export interface VideoTransitionOverlayEffectOptions {
    direction?: 'left' | 'right';
    // Mirrors the video session's intro mode so each template can derive its
    // own behavior from it (e.g. the side pair sweeps on 'fast'; the wall
    // skips its fade-in on 'cut'/'fade', which have no hold window to
    // animate into).
    mode?: VideoIntroMode;
    // Skip the auto-hide timer — the wall's copy stays up as the background
    // behind the routed video for the whole session, not just the cut cover.
    persistent?: boolean;
    healthType?: string;
}

export class VideoTransitionOverlayEffect extends HealthCheckedEffect {
    private options: Omit<
        VideoTransitionOverlayEffectOptions,
        'healthType' | 'persistent'
    >;
    private persistent: boolean;
    private logger: Logger;

    public constructor(
        group: EffectGroup,
        options: VideoTransitionOverlayEffectOptions,
        template: string,
        logger: Logger,
        health: HealthMonitor,
    ) {
        const { healthType, persistent, ...effectOptions } = options;
        super(group, health, healthType ?? 'videotransition');

        this.logger = logger;
        this.options = effectOptions;
        this.persistent = persistent ?? false;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        // Pass direction to the template so the animation knows which way to slide.
        const cmd = CgCommand.add(template, false, {
            direction: options.direction ?? 'left',
            mode: options.mode ?? 'regular',
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

    public update(opts: { mode?: VideoIntroMode }) {
        if (opts.mode !== undefined) this.options.mode = opts.mode;
        return execChecked(
            this.logger,
            'update videotransition effect',
            this.executor.execute(
                CgCommand.update({
                    mode: this.options.mode ?? 'regular',
                }).allocate(this.layer),
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

        if (!this.persistent) {
            const holdMs =
                this.options.mode === 'fast' ? SWEEP_DURATION : HOLD_DURATION;
            setTimeout(() => {
                if (!this.active) return;
                this.deactivate();
            }, holdMs);
        }

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
        return {
            direction: this.options.direction,
            mode: this.options.mode,
        };
    }
}
