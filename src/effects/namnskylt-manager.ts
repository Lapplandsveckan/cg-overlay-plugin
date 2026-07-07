import { type Effect, type Logger, type PluginAPI } from '@lappis/cg-manager';
import { type NamnskyltOverlayEffect } from './overlay/namnskylt';
import type LappisOverlayPlugin from '../index';
import { SidePair } from './side-pair';
import {
    CHANNELS,
    GROUPS,
    LOAD_DELAY,
    delay,
    getGroup,
} from '../overlay-constants';

export default class NamnskyltManager {
    private api: PluginAPI;
    private logger: Logger;
    private plugin: LappisOverlayPlugin;
    private overlayManager: any;

    private namnskylt: SidePair<NamnskyltOverlayEffect> | null = null;
    private namnskyltName: string | null = null;
    private namnskyltStartedAt: number | null = null;
    private namnskyltDuration: number | null = null;

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

    private async loadThenActivate(
        pair: SidePair<NamnskyltOverlayEffect>,
        isCurrent: () => boolean,
    ) {
        await delay(LOAD_DELAY);
        if (isCurrent()) {
            pair.activate();
        } else {
            pair.dispose();
        }
    }

    public initialize() {
        // No-op, namnskylt is created on-demand
    }

    public dispose() {
        if (this.namnskylt) {
            this.namnskylt.dispose();
            this.namnskylt = null;
        }
        this.namnskyltName = null;
        this.namnskyltStartedAt = null;
        this.namnskyltDuration = null;
    }

    public show(name: string) {
        const pair = this.makeSidePair<NamnskyltOverlayEffect>(
            'overlay-namnskylt',
            GROUPS.OVERLAY,
            channel => ({
                name,
                healthType:
                    channel === CHANNELS.LEFT
                        ? 'namnskylt-left'
                        : 'namnskylt-right',
            }),
        );
        this.namnskylt = pair;
        this.namnskyltName = name;
        this.overlayManager.broadcastOverlay();
        this.loadThenActivate(pair, () => this.namnskylt === pair);

        // Only the left side needs to report state — both sides transition
        // in lockstep, and guarding against a superseded pair keeps a
        // rapid re-trigger from clobbering the caption with a stale state.
        pair.left.onState = (s: number) => {
            if (this.namnskylt !== pair) return;
            this.overlayManager.setCaptionNamnskyltState(s);
            if (s === 1) {
                this.namnskyltStartedAt = Date.now();
                this.namnskyltDuration = 10000;
                this.overlayManager.broadcastOverlay();
            }
        };

        const clearOnDone = () => {
            if (this.namnskylt === pair) {
                this.namnskylt = null;
                this.namnskyltName = null;
                this.namnskyltStartedAt = null;
                this.namnskyltDuration = null;
                this.overlayManager.broadcastOverlay();
            }
        };
        pair.left.onAutoDeactivate = clearOnDone;
        pair.right.onAutoDeactivate = clearOnDone;
    }

    public hide() {
        if (!this.namnskylt) return;
        const pair = this.namnskylt;
        this.namnskylt = null;
        this.namnskyltName = null;
        this.namnskyltStartedAt = null;
        this.namnskyltDuration = null;
        this.overlayManager.broadcastOverlay();
        pair.deactivate();
    }

    public getState() {
        return {
            on: this.namnskylt !== null,
            name: this.namnskyltName,
            startedAt: this.namnskyltStartedAt,
            totalDuration: this.namnskyltDuration,
        };
    }

    public getSidePair(): SidePair<NamnskyltOverlayEffect> | null {
        return this.namnskylt;
    }
}
