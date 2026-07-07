import { type Effect, type Logger, type PluginAPI } from '@lappis/cg-manager';
import { type BarsOverlayEffect } from './overlay/bars';
import type LappisOverlayPlugin from '../index';
import { SidePair } from './side-pair';
import { CHANNELS, GROUPS, getGroup } from '../overlay-constants';

export default class BarsManager {
    private api: PluginAPI;
    private logger: Logger;
    private plugin: LappisOverlayPlugin;
    private overlayManager: any;

    private bars: SidePair<BarsOverlayEffect> | null = null;
    private barsState = 0;

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
        this.bars?.dispose();
        this.bars = this.makeSidePair<BarsOverlayEffect>(
            'overlay-bars',
            GROUPS.BARS,
            channel => ({
                healthType:
                    channel === CHANNELS.LEFT ? 'bars-left' : 'bars-right',
            }),
        );
    }

    public initialize() {
        this.build();
    }

    public dispose() {
        if (this.bars) {
            this.bars.dispose();
            this.bars = null;
        }
    }

    public toggle() {
        this.barsState = 1 - this.barsState;

        switch (this.barsState) {
            case 0:
                this.bars?.deactivate();
                break;
            case 1:
                this.overlayManager.touchRecyclable('bars');
                this.bars?.activate();
                break;
        }

        this.overlayManager.broadcastOverlay();
    }

    public stop() {
        this.barsState = 0;
        this.bars?.deactivate();
        this.overlayManager.broadcastOverlay();
    }

    public getState(): number {
        return this.barsState;
    }

    public getSidePair(): SidePair<BarsOverlayEffect> | null {
        return this.bars;
    }

    public rebuild() {
        this.build();
    }

    public isOnAir(): boolean {
        return this.barsState === 1;
    }

    public replay() {
        this.bars?.activate();
    }
}
