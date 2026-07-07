import { type Effect, type Logger, type PluginAPI } from '@lappis/cg-manager';
import { type SwishOverlayEffect } from './overlay/swish';
import type LappisOverlayPlugin from '../index';
import { SidePair } from './side-pair';
import { CHANNELS, GROUPS, getGroup } from '../overlay-constants';

export default class SwishManager {
    private api: PluginAPI;
    private logger: Logger;
    private plugin: LappisOverlayPlugin;
    private overlayManager: any;

    private swish: SidePair<SwishOverlayEffect> | null = null;
    private wallSwish: SwishOverlayEffect | null = null;
    private swishState = -1;
    private swishNumber = '';

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
        this.swish?.dispose();
        this.swish = this.makeSidePair<SwishOverlayEffect>(
            'overlay-swish',
            GROUPS.OVERLAY,
            channel => ({
                number: '123 607 27 97',
                healthType:
                    channel === CHANNELS.LEFT ? 'swish-left' : 'swish-right',
            }),
        );

        this.wallSwish?.dispose();
        this.wallSwish = this.api.createEffect(
            'wall-swish',
            getGroup(CHANNELS.WALL, GROUPS.OVERLAY),
            { number: '123 607 27 97', healthType: 'wall-swish' },
        ) as SwishOverlayEffect;
    }

    public initialize() {
        this.build();
    }

    public dispose() {
        if (this.swish) {
            this.swish.dispose();
            this.swish = null;
        }

        if (this.wallSwish) {
            this.wallSwish.dispose();
            this.wallSwish = null;
        }
    }

    public toggle(
        number?: string,
        labels?: string,
        highlightIntro?: boolean,
        fromBelow?: boolean,
    ) {
        if (highlightIntro) {
            this.swishState = (this.swishState + 1) % 3;
        } else {
            // default: 2-step cycle, show minimized then dismiss.
            this.swishState = this.swishState === 1 ? 2 : 1;
        }

        labels = labels || '';
        this.swishNumber = number || '';
        this.swish?.update({ number: this.swishNumber, labels, fromBelow });
        this.wallSwish?.update({
            number: this.swishNumber,
            labels,
            fromBelow,
        });

        switch (this.swishState) {
            case 0:
                this.overlayManager.touchRecyclable('swish');
                this.swish?.activate();
                this.wallSwish?.activate();
                break;
            case 1:
                this.overlayManager.touchRecyclable('swish');
                this.swish?.each(
                    (e: SwishOverlayEffect) => e.minimize(),
                    'minimize',
                );
                break;
            case 2:
                this.swish?.deactivate();
                this.wallSwish?.deactivate();
                break;
        }

        this.overlayManager.broadcastOverlay();
    }

    public stop() {
        this.swishState = 2;
        this.swishNumber = '';
        this.swish?.deactivate();
        this.wallSwish?.deactivate();
        this.overlayManager.broadcastOverlay();
    }

    public getState(): number {
        return this.swishState;
    }

    public getNumber(): string {
        return this.swishNumber;
    }

    public getSidePair(): SidePair<SwishOverlayEffect> | null {
        return this.swish;
    }

    public rebuild() {
        this.build();
    }

    public isOnAir(): boolean {
        return this.swishState === 0 || this.swishState === 1;
    }

    public replay() {
        this.swish?.activate();
        this.wallSwish?.activate();
        if (this.swishState === 1) {
            this.swish?.each(
                (e: SwishOverlayEffect) => e.minimize(),
                'minimize',
            );
        }
    }
}
