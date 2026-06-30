import {
    CgCommand,
    Effect,
    MixerCommand,
    type EffectGroup,
    type Logger,
} from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';

// Normalized y-translate applied when a namnskylt is on-air, so the two
// lower-thirds don't overlap.
const PUSH_UP_OFFSET = 0.08;
const OFFSET_TWEEN = { type: 'ease-in-out' as const, duration: 250 };

// CaptionKit's lower-third is an external page (captionkit.io) loaded directly
// by CasparCG's HTML producer, so unlike the other overlay effects it does not
// extend HealthCheckedEffect — that page can't post back to our /_cg/ack
// healthcheck endpoint, and arming health for it would just trip false
// recoveries.
export class CaptionOverlayEffect extends Effect {
    private logger: Logger;
    private pushedUp = false;
    // Tracks the last y-offset actually sent, so re-activating or re-toggling
    // to the same state doesn't fire a redundant mixer command.
    private lastAppliedY = 0;

    public constructor(group: EffectGroup, template: string, logger: Logger) {
        super(group);

        this.logger = logger;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, {});
        cmd.allocate(this.layer);
        execChecked(
            this.logger,
            'add caption effect',
            this.executor.execute(cmd),
        );
    }

    public get layer() {
        return this.layers[0];
    }

    public activate() {
        if (!super.activate()) return;

        this.applyOffset();
        return execChecked(
            this.logger,
            'play caption effect',
            this.executor.execute(CgCommand.play().allocate(this.layer)),
        );
    }

    public deactivate() {
        if (!super.deactivate()) return;
        return execChecked(
            this.logger,
            'stop caption effect',
            this.executor.execute(CgCommand.stop().allocate(this.layer)),
        );
    }

    public setOffset(up: boolean) {
        this.pushedUp = up;
        this.applyOffset();
    }

    private applyOffset() {
        const y = this.pushedUp ? -PUSH_UP_OFFSET : 0;
        if (y === this.lastAppliedY) return;
        this.lastAppliedY = y;

        execChecked(
            this.logger,
            'apply caption offset',
            this.executor.execute(
                MixerCommand.create()
                    /* eslint-disable camelcase */
                    .fill({ x: 0, y, x_scale: 1, y_scale: 1 }, OFFSET_TWEEN)
                    /* eslint-enable camelcase */
                    .allocate(this.layer),
            ),
        );
    }

    public getMetadata(): Record<string, unknown> {
        return {};
    }
}
