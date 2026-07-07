import { type Effect, type Logger, type PluginAPI } from '@lappis/cg-manager';
import { type VideoTransitionOverlayEffect } from './overlay/videotransition';
import type LappisOverlayPlugin from '../index';
import { SidePair } from './side-pair';
import { CHANNELS, GROUPS, getGroup } from '../overlay-constants';

export default class VideoTransitionManager {
    private api: PluginAPI;
    private logger: Logger;
    private plugin: LappisOverlayPlugin;
    private overlayManager: any;

    private videoTransition: SidePair<VideoTransitionOverlayEffect> | null =
        null;
    private videoTransitionState = 0;

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
        this.videoTransition?.dispose();
        this.videoTransition = this.makeSidePair<VideoTransitionOverlayEffect>(
            'overlay-videotransition',
            GROUPS.PRESENTATION,
            channel => ({
                direction: channel === CHANNELS.LEFT ? 'left' : 'right',
                healthType:
                    channel === CHANNELS.LEFT
                        ? 'videotransition-left'
                        : 'videotransition-right',
            }),
        );
    }

    public initialize() {
        this.build();
    }

    public dispose() {
        if (this.videoTransition) {
            this.videoTransition.dispose();
            this.videoTransition = null;
        }
    }

    public toggle(fast = false) {
        if (this.videoTransitionState === 1) {
            this.videoTransitionState = 0;
            return;
        }

        this.videoTransitionState = 1;
        this.overlayManager.touchRecyclable('videotransition');
        this.videoTransition?.update({ fast });
        this.videoTransition?.activate();
    }

    public getState(): number {
        return this.videoTransitionState;
    }

    public getSidePair(): SidePair<VideoTransitionOverlayEffect> | null {
        return this.videoTransition;
    }

    public rebuild() {
        this.build();
    }

    public isOnAir(): boolean {
        return this.videoTransitionState === 1;
    }

    public replay() {
        this.videoTransition?.update({ fast: false });
        this.videoTransition?.activate();
    }
}
