import { type Effect, type Logger, type PluginAPI } from '@lappis/cg-manager';
import { type CaptionOverlayEffect } from './overlay/caption';
import type LappisOverlayPlugin from '../index';
import { SidePair } from './side-pair';
import { CHANNELS, GROUPS, getGroup } from '../overlay-constants';

export default class CaptionManager {
    private api: PluginAPI;
    private logger: Logger;
    private plugin: LappisOverlayPlugin;
    private overlayManager: any;

    private caption: SidePair<CaptionOverlayEffect> | null = null;
    private captionState = 0;
    private namnskyltState = 0;

    constructor(overlayManager: any, instance: LappisOverlayPlugin) {
        this.overlayManager = overlayManager;
        this.plugin = instance;
        this.api = instance['api'];
        this.logger = instance['logger'];
    }

    private makeSidePair<T extends Effect>(
        effectName: string,
        group: string,
        optsFor: (channel: number) => object,
    ): SidePair<T> {
        return new SidePair<T>(
            this.api.createEffect(
                effectName,
                getGroup(CHANNELS.LEFT, group),
                optsFor(CHANNELS.LEFT),
            ) as T,
            this.api.createEffect(
                effectName,
                getGroup(CHANNELS.RIGHT, group),
                optsFor(CHANNELS.RIGHT),
            ) as T,
            this.plugin,
        );
    }

    private build() {
        this.caption?.dispose();
        this.caption = this.makeSidePair<CaptionOverlayEffect>(
            'overlay-caption',
            GROUPS.OVERLAY,
            () => this.plugin.captionkit.getStreamConfig(),
        );
        this.caption.each((e: CaptionOverlayEffect) =>
            e.setNamnskyltState(this.namnskyltState),
        );
    }

    public initialize() {
        this.build();
    }

    public dispose() {
        if (this.caption) {
            this.caption.dispose();
            this.caption = null;
        }
    }

    public toggle() {
        this.captionState = 1 - this.captionState;

        switch (this.captionState) {
            case 0:
                this.caption?.deactivate();
                break;
            case 1:
                this.overlayManager.touchRecyclable('caption');
                // Seed the effect's internal state so activate() sends the
                // current namnskylt state along with CG PLAY, in case a
                // namnskylt went up while captions were off.
                this.caption?.each((e: CaptionOverlayEffect) =>
                    e.setNamnskyltState(this.namnskyltState),
                );
                this.caption?.activate();
                break;
        }

        this.overlayManager.broadcastOverlay();
    }

    public stop() {
        this.captionState = 0;
        this.caption?.deactivate();
        this.overlayManager.broadcastOverlay();
    }

    public clear() {
        this.caption?.each((e: CaptionOverlayEffect) => e.clear());
    }

    // Hide captions on-air without touching captionState/UI, e.g. while a
    // video plays. No-op if captions aren't enabled.
    public suspend() {
        if (this.captionState !== 1) return;
        this.caption?.deactivate();
    }

    // Re-show captions after suspend(), but only if they were left
    // enabled. Clears first so playback starts fresh instead of flashing
    // whatever backlog piled up while hidden.
    public resume() {
        if (this.captionState !== 1 || !this.caption) return;

        this.overlayManager.touchRecyclable('caption');
        this.caption.each((e: CaptionOverlayEffect) =>
            e.setNamnskyltState(this.namnskyltState),
        );
        this.clear();
        this.caption.activate();
    }

    // Mirrors the namnskylt's own state (0 hidden / 1 full / 2 minimized) onto
    // the caption, which pushes its text up in lockstep so the two lower-thirds
    // don't overlap.
    public setNamnskyltState(state: number) {
        this.namnskyltState = state;
        if (this.captionState === 1) {
            this.caption?.each((e: CaptionOverlayEffect) =>
                e.setNamnskyltState(state),
            );
        }
    }

    // Rebuild the caption pair after its settings (channel/language/etc.)
    // change, re-activating it if it was on-air so the new display URL takes
    // effect.
    public rebuild() {
        const wasOnAir = this.captionState === 1;
        this.build();
        if (wasOnAir && this.caption) {
            this.overlayManager.touchRecyclable('caption');
            this.caption.activate();
        }
    }

    public getState(): number {
        return this.captionState;
    }

    public getSidePair(): SidePair<CaptionOverlayEffect> | null {
        return this.caption;
    }

    public rebuildEffect() {
        this.build();
    }

    public isOnAir(): boolean {
        return this.captionState === 1;
    }

    public replay() {
        this.caption?.activate();
    }
}
