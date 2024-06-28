import {BasicChannel, CasparPlugin, Logger, PluginAPI} from '@lappis/cg-manager';
import {SwishOverlayEffect} from './effects/overlay/swish';
import {SwishWallEffect} from './effects/wall/swish';
import {VideoTransitionWallEffect} from './effects/wall/videotransition';
import {BarsOverlayEffect} from './effects/overlay/bars';
import {InsamlingOverlayEffect, InsamlingOverlayEffectOptions} from './effects/overlay/insamling';
import {VideoEffect} from './effects/misc/video';
import {RouteEffect} from './effects/misc/route';
import LappisOverlayPlugin from './index';

export const CHANNELS = {
    MAIN: 1,
    WALL: 2,
    VIDEO: 3,
};

export const GROUPS = {
    OVERLAY: 'overlay',
    VIDEO: 'video',
    PRESENTATION: 'presentation',
    MOTION: 'motion',
};

export const getGroup = (channel: number, group: string) => `${channel}:${group}`;

export default class OverlayManager {
    private api: PluginAPI;
    private logger: Logger;
    private plugin: LappisOverlayPlugin;

    constructor(instance: LappisOverlayPlugin) {
        this.plugin = instance;
        this.api = instance['api'];
        this.logger = instance['logger'];
    }

    private swish: { overlay: SwishOverlayEffect, wall: SwishWallEffect } = null;
    private swishState = -1;

    private bars: BarsOverlayEffect = null;
    private barsState = 0;

    private insamling: InsamlingOverlayEffect = null;
    private insamlingState = 0;

    private videoTransition: VideoTransitionWallEffect = null;
    private videoTransitionState = 0;

    public initialize() {
        this.swish = {
            overlay: this.api.createEffect('overlay-swish', getGroup(CHANNELS.MAIN, GROUPS.OVERLAY), {
                number: '070 797 78 20',
            }) as SwishOverlayEffect,
            wall: this.api.createEffect('wall-swish', getGroup(CHANNELS.WALL, GROUPS.OVERLAY), {
                number: '070 797 78 20',
            }) as SwishWallEffect,
        };

        this.bars = this.api.createEffect('overlay-bars', getGroup(CHANNELS.MAIN, GROUPS.OVERLAY), {}) as BarsOverlayEffect; // TODO: special group so it is underneeth all overlays
        this.insamling = this.api.createEffect('overlay-insamling', getGroup(CHANNELS.VIDEO, GROUPS.OVERLAY), {}) as InsamlingOverlayEffect; // TODO: special group so it is underneeth all overlays
    }

    public dispose() {
        if (this.swish) {
            this.swish.overlay.dispose();
            this.swish.wall.dispose();
            this.swish = null;
        }

        if (this.bars) {
            this.bars.dispose();
            this.bars = null;
        }

        if (this.insamling) {
            this.insamling.dispose();
            this.insamling = null;
        }

        if (this.videoTransition) {
            this.videoTransition.dispose();
            this.videoTransition = null;
        }
    }

    private videoSession: null | {
        main: RouteEffect,
        wall: RouteEffect,
        stop: () => void,
    } = null;

    private externalEnabledVideoSession: boolean = false;
    public togglePresentationMode() {
        this.externalEnabledVideoSession = !this.externalEnabledVideoSession;

        if (this.externalEnabledVideoSession) return this.startVideoSession();
        if (this.plugin.video.playing) return Promise.resolve();

        this.stopVideoSession();
        return Promise.resolve();
    }

    public startVideoSession() {
        if (this.videoSession) {
            this.logger.warn('Video session already running');
            return Promise.resolve();
        }

        const width = 0.54;

        const mainEffect = this.api.createEffect('lappis-route', `${CHANNELS.MAIN}:video`, {
            source: new BasicChannel(CHANNELS.VIDEO),
            disposeOnStop: true,
        }) as RouteEffect;

        const wallEffect = this.api.createEffect('lappis-route', `${CHANNELS.WALL}:video`, {
            source: new BasicChannel(CHANNELS.VIDEO),
            disposeOnStop: true,
            transform: [0, 0, 1, 1, 0.5 - (width / 2), 0, 0.5 + (width / 2), 1],
        }) as RouteEffect;

        this.videoSession = {main: mainEffect, wall: wallEffect, stop: () => null};
        if (this.videoTransitionState !== 1) this.toggleVideoTransition();

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.videoSession.stop = () => null;
                resolve();

                mainEffect.activate();
                wallEffect.activate();
            }, 3000);

            this.videoSession.stop = () => {
                clearTimeout(timeout);
                reject(new Error('Video session stopped'));
            }
        });
    }

    public stopVideoSession() {
        if (this.externalEnabledVideoSession) return;
        if (!this.videoSession) return this.logger.warn('No video session to stop');
        if (this.videoTransitionState !== 0) this.toggleVideoTransition();

        this.videoSession.main.deactivate();
        this.videoSession.wall.deactivate();

        this.videoSession.stop();
        this.videoSession = null;
    }

    public playVideo(video: string) {
        const media = this.api.getFileDatabase().get(video);
        if (!media) throw new Error('Video not found');

        return this.api.createEffect('lappis-video', `${CHANNELS.VIDEO}:video`, {
            media,
            holdLastFrame: true,
            disposeOnStop: true,
        }) as VideoEffect;
    }

    public showNamnskylt(name: string) {
        const overlay = this.api.createEffect('overlay-namnskylt', '1:overlay', { name });
        const wall = this.api.createEffect('wall-namnskylt', '2:overlay', { name });

        Promise
            .all([wall.activate(), overlay.activate()])
            .catch(err => {
                this.logger.error('Failed to activate namnskylt effect');
                this.logger.error(err);
            });
    }

    public toggleVideoTransition() {
        if (this.videoTransitionState === 1) {
            this.videoTransitionState = 0;
            this.videoTransition
                .deactivate()
                .catch(err => {
                    this.logger.error('Failed to deactivate videotransition effect');
                    this.logger.error(err);
                });

            this.videoTransition = null;
            return;
        }

        this.videoTransitionState = 1;

        const overlay = this.api.createEffect('overlay-videotransition', '1:presentation', {});
        const wall = this.api.createEffect('wall-videotransition', '2:presentation', {});

        Promise
            .all([wall.activate(), overlay.activate()])
            .catch(err => {
                this.logger.error('Failed to activate videotransition effect');
                this.logger.error(err);
            });

        this.videoTransition = wall as VideoTransitionWallEffect;
    }

    public toggleSwish(number?: string) {
        this.swishState = (this.swishState + 1) % 3;

        if (number) {
            this.swish.overlay.update({ number });
            this.swish.wall.update({ number });
        }

        switch (this.swishState) {
            case 0:
                Promise
                    .all([this.swish.overlay.activate(), this.swish.wall.activate()])
                    .catch(err => {
                        this.logger.error('Failed to activate swish effect');
                        this.logger.error(err);
                    });
                break;
            case 1:
                this.swish.overlay
                    .minimize()
                    .catch(err => {
                        this.logger.error('Failed to minimize swish effect');
                        this.logger.error(err);
                    });
                break;
            case 2:
                Promise
                    .all([this.swish.overlay.deactivate(), this.swish.wall.deactivate()])
                    .catch(err => {
                        this.logger.error('Failed to deactivate swish effect');
                        this.logger.error(err);
                    });
                break;
        }
    }

    public toggleBars() {
        this.barsState = 1 - this.barsState;

        switch (this.barsState) {
            case 0:
                this.bars
                    .deactivate()
                    .catch(err => {
                        this.logger.error('Failed to deactivate bars effect');
                        this.logger.error(err);
                    });
                break;
            case 1:
                this.bars
                    .activate()
                    .catch(err => {
                        this.logger.error('Failed to activate bars effect');
                        this.logger.error(err);
                    });
                break;
        }
    }

    public async toggleInsamling(options?: InsamlingOverlayEffectOptions) {
        this.insamlingState = 1 - this.insamlingState;

        if (options)
            this.insamling.update(options);

        switch (this.insamlingState) {
            case 0:
                if (this.externalEnabledVideoSession) await this.togglePresentationMode();
                this.insamling
                    .deactivate()
                    .catch(err => {
                        this.logger.error('Failed to deactivate insamling effect');
                        this.logger.error(err);
                    });
                break;
            case 1:
                if (!this.externalEnabledVideoSession) await this.togglePresentationMode();
                this.insamling
                    .activate()
                    .catch(err => {
                        this.logger.error('Failed to activate insamling effect');
                        this.logger.error(err);
                    });
                break;
        }
    }
}