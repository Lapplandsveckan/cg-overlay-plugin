import {Logger, PluginAPI} from '@lappis/cg-manager';
import {SwishOverlayEffect} from './effects/overlay/swish';
import {BarsOverlayEffect} from './effects/overlay/bars';
import {InsamlingOverlayEffect, InsamlingOverlayEffectOptions} from './effects/overlay/insamling';
import {VideoEffect} from './effects/misc/video';
import LappisOverlayPlugin from './index';

export const CHANNELS = {
    MAIN: 1,
    VIDEO: 3,
};

export const GROUPS = {
    BARS: 'bars',
    OVERLAY: 'overlay',
    VIDEO: 'video',
    PRESENTATION: 'presentation',
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

    private swish: SwishOverlayEffect = null;
    private swishState = -1;

    private bars: BarsOverlayEffect = null;
    private barsState = 0;

    private insamling: InsamlingOverlayEffect = null;
    private insamlingState = 0;

    private videoTransitionState = 0;

    public initialize() {
        this.swish = this.api.createEffect('overlay-swish', getGroup(CHANNELS.MAIN, GROUPS.OVERLAY), {
            number: '123 607 27 97',
        }) as SwishOverlayEffect;

        this.bars = this.api.createEffect('overlay-bars', getGroup(CHANNELS.MAIN, GROUPS.BARS), {}) as BarsOverlayEffect; // TODO: special group so it is underneeth all overlays
        this.insamling = this.api.createEffect('overlay-insamling', getGroup(CHANNELS.VIDEO, GROUPS.OVERLAY), {}) as InsamlingOverlayEffect; // TODO: special group so it is underneeth all overlays
    }

    public dispose() {
        if (this.swish) {
            this.swish.dispose();
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
    }

    private videoSession: null | {
        stop: () => void,
    } = null;

    public getVideoSession() {
        return this.videoSession;
    }

    private externalEnabledVideoSession: boolean = false;
    public togglePresentationMode(atem = false) {
        this.externalEnabledVideoSession = !this.externalEnabledVideoSession;

        if (this.externalEnabledVideoSession) return this.startVideoSession(atem);
        if (this.plugin.video.playing) return Promise.resolve();

        this.stopVideoSession(atem);
        return Promise.resolve();
    }

    public startVideoSession(atem = false, skipIntro = false) {
        if (this.videoSession) return Promise.resolve();

        this.videoSession = {stop: () => null};
        if (this.videoTransitionState !== 1) this.toggleVideoTransition(skipIntro);

        if (skipIntro) {
            if (atem) this.plugin.atem.setVideoProgram();
            return Promise.resolve();
        }

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.videoSession.stop = () => null;
                resolve();

                if (atem) this.plugin.atem.setVideoProgram();
            }, 3000);

            this.videoSession.stop = () => {
                clearTimeout(timeout);
                reject(new Error('Video session stopped'));
            };
        });
    }

    public stopVideoSession(atem = false) {
        if (this.externalEnabledVideoSession) return;
        if (!this.videoSession) return this.logger.warn('No video session to stop');
        if (this.videoTransitionState !== 0) this.toggleVideoTransition();

        if (atem) this.plugin.atem.returnToPreview();

        this.videoSession.stop();
        this.videoSession = null;
    }

    public playVideo(video: string, loop?: boolean) {
        const media = this.api.getFileDatabase().get(video);
        if (!media) throw new Error('Video not found');

        return this.api.createEffect('lappis-video', `${CHANNELS.VIDEO}:video`, {
            media,
            holdLastFrame: true,
            disposeOnStop: true,

            loop,
        }) as VideoEffect;
    }

    public showNamnskylt(name: string) {
        const overlay = this.api.createEffect('overlay-namnskylt', '1:overlay', { name });

        overlay.activate()
            .catch(err => {
                this.logger.error('Failed to activate namnskylt effect');
                this.logger.error(err);
            });
    }

    public toggleVideoTransition(skipIntro = false) {
        if (this.videoTransitionState === 1) {
            this.videoTransitionState = 0;
            return;
        }

        this.videoTransitionState = 1;
        if (skipIntro) return;

        const overlay = this.api.createEffect('overlay-videotransition', '1:presentation', {});
        overlay.activate()
            .catch(err => {
                this.logger.error('Failed to activate videotransition effect');
                this.logger.error(err);
            });
    }

    public toggleSwish(number?: string, labels?: string, skipFirst?: boolean) {
        this.swishState = (this.swishState + 1) % 3;
        if (this.swishState === 0 && skipFirst) this.swishState = 1;

        labels = labels || '';
        if (number) {
            this.swish.update({ number, labels });
        }

        switch (this.swishState) {
            case 0:
                this.swish.activate()
                    .catch(err => {
                        this.logger.error('Failed to activate swish effect');
                        this.logger.error(err);
                    });
                break;
            case 1:
                this.swish.minimize()
                    .catch(err => {
                        this.logger.error('Failed to activate swish effect');
                        this.logger.error(err);
                    });
                break;
            case 2:
                this.swish.deactivate()
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
                if (this.externalEnabledVideoSession) await this.togglePresentationMode(true);
                this.insamling
                    .deactivate()
                    .catch(err => {
                        this.logger.error('Failed to deactivate insamling effect');
                        this.logger.error(err);
                    });
                break;
            case 1:
                if (!this.externalEnabledVideoSession) await this.togglePresentationMode(true);
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
