import {
    CgCommand,
    Effect,
    type EffectGroup,
    type Logger,
} from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';
import { type CaptionStreamConfig } from '../../captionkit';

// The caption template opens its own EventSource to CaptionKit's realtime
// feed client-side, so unlike the other overlay effects this one does not
// extend HealthCheckedEffect — that stream is external and out of our
// control, and arming health for it would just trip false recoveries.
export class CaptionOverlayEffect extends Effect {
    private logger: Logger;
    // Mirrors the namnskylt's own state (0 hidden / 1 full / 2 minimized) so
    // the caption template can push its text up in lockstep, instead of the
    // one-shot mixer nudge this used to apply.
    private namnskyltState = 0;

    public constructor(
        group: EffectGroup,
        template: string,
        options: CaptionStreamConfig,
        logger: Logger,
    ) {
        super(group);

        this.logger = logger;
        this.allocateLayers(1);
        this.executor.executeAllocations();

        const cmd = CgCommand.add(template, false, {
            ...options,
            namnskyltState: this.namnskyltState,
        });
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

        execChecked(
            this.logger,
            'update caption namnskylt state',
            this.executor.execute(
                CgCommand.update({
                    namnskyltState: this.namnskyltState,
                }).allocate(this.layer),
            ),
        );
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

    // Drops whatever text/backlog the template is showing and reconnects its
    // realtime stream with a fresh cursor. Not gated on `active` — the
    // template's stream runs regardless of play/stop, so this is used both
    // while shown and while deactivated (e.g. before resuming after a video).
    public clear() {
        return execChecked(
            this.logger,
            'clear caption effect',
            this.executor.execute(CgCommand.next().allocate(this.layer)),
        );
    }

    public setNamnskyltState(state: number) {
        this.namnskyltState = state;
        if (!this.active) return;

        execChecked(
            this.logger,
            'update caption namnskylt state',
            this.executor.execute(
                CgCommand.update({ namnskyltState: state }).allocate(
                    this.layer,
                ),
            ),
        );
    }

    public getMetadata(): Record<string, unknown> {
        return {};
    }
}
