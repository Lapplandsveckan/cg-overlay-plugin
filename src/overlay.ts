import { type Logger, type PluginAPI } from '@lappis/cg-manager';
import { type SwishOverlayEffect } from './effects/overlay/swish';
import { type BarsOverlayEffect } from './effects/overlay/bars';
import { type NamnskyltOverlayEffect } from './effects/overlay/namnskylt';
import {
    type InsamlingOverlayEffect,
    type InsamlingOverlayEffectOptions,
} from './effects/overlay/insamling';
import { type VideoEffect } from './effects/misc/video';
import type LappisOverlayPlugin from './index';
import { type PresentationOverlayEffect } from './effects/overlay/presentation';

// Re-export the canonical slide type from the store; OverlayManager
// stays narrow and only cares about (presentationId, slideId).
export type { Slide } from './presentations';

export interface PresentationPlaybackState {
    playing: boolean;
    presentationId: string | null;
    slideId: string | null;
}

export interface PresentationArmEvent {
    presentationId: string;
    rundownId: string | null;
    ts: number;
}

export const CHANNELS = {
    MAIN: 1,
    VIDEO: 2,
};

export const GROUPS = {
    BARS: 'bars',
    OVERLAY: 'overlay',
    VIDEO: 'video',
    PRESENTATION: 'presentation',
};

export const getGroup = (channel: number, group: string) =>
    `${channel}:${group}`;

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

    private namnskylt: NamnskyltOverlayEffect = null;

    private insamling: InsamlingOverlayEffect = null;
    private insamlingState = 0;

    private videoTransitionState = 0;

    private presentationEffect: PresentationOverlayEffect = null;
    private presentationState: PresentationPlaybackState = {
        playing: false,
        presentationId: null,
        slideId: null,
    };

    public initialize() {
        this.swish = this.api.createEffect(
            'overlay-swish',
            getGroup(CHANNELS.MAIN, GROUPS.OVERLAY),
            {
                number: '123 607 27 97',
            },
        ) as SwishOverlayEffect;

        this.bars = this.api.createEffect(
            'overlay-bars',
            getGroup(CHANNELS.MAIN, GROUPS.BARS),
            {},
        ) as BarsOverlayEffect; // TODO: special group so it is underneeth all overlays
        this.insamling = this.api.createEffect(
            'overlay-insamling',
            getGroup(CHANNELS.VIDEO, GROUPS.OVERLAY),
            {},
        ) as InsamlingOverlayEffect; // TODO: special group so it is underneeth all overlays
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

        if (this.presentationEffect) {
            this.presentationEffect.dispose();
            this.presentationEffect = null;
        }

        if (this.namnskylt) {
            this.namnskylt.dispose();
            this.namnskylt = null;
        }
    }

    private videoSession: null | {
        stop: () => void;
    } = null;

    public getVideoSession() {
        return this.videoSession;
    }

    public startVideoSession(atem = false, skipIntro = false) {
        if (this.videoSession) return Promise.resolve();

        this.videoSession = { stop: () => null };
        if (this.videoTransitionState !== 1)
            this.toggleVideoTransition(skipIntro);

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
        if (this.insamlingState === 1) return; // insamling still showing — keep session alive
        if (!this.videoSession)
            return this.logger.warn('No video session to stop');
        if (this.videoTransitionState !== 0) this.toggleVideoTransition();

        if (atem) this.plugin.atem.returnToPreview();

        this.videoSession.stop();
        this.videoSession = null;
    }

    public playVideo(video: string, loop?: boolean) {
        const media = this.api.getFileDatabase().get(video);
        if (!media) throw new Error('Video not found');

        return this.api.createEffect(
            'lappis-video',
            `${CHANNELS.VIDEO}:video`,
            {
                media,
                holdLastFrame: true,
                disposeOnStop: true,

                loop,
            },
        ) as VideoEffect;
    }

    public showNamnskylt(name: string) {
        this.namnskylt = this.api.createEffect(
            'overlay-namnskylt',
            '1:overlay',
            { name },
        ) as NamnskyltOverlayEffect;

        this.namnskylt.activate()?.catch(err => {
            this.logger.error('Failed to activate namnskylt effect');
            this.logger.error(err);
        });
    }

    public hideNamnskylt() {
        if (!this.namnskylt) return;
        const effect = this.namnskylt;
        this.namnskylt = null;
        effect.deactivate()?.catch(err => {
            this.logger.error('Failed to deactivate namnskylt effect');
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

        const overlay = this.api.createEffect(
            'overlay-videotransition',
            '1:presentation',
            {},
        );
        overlay.activate().catch(err => {
            this.logger.error('Failed to activate videotransition effect');
            this.logger.error(err);
        });
    }

    public toggleSwish(number?: string, labels?: string, skipFirst?: boolean) {
        if (skipFirst) {
            // 2-step cycle: show minimized, then dismiss.
            this.swishState = this.swishState === 1 ? 2 : 1;
        } else {
            this.swishState = (this.swishState + 1) % 3;
        }

        labels = labels || '';
        if (number) {
            this.swish.update({ number, labels });
        }

        switch (this.swishState) {
            case 0:
                this.swish.activate().catch(err => {
                    this.logger.error('Failed to activate swish effect');
                    this.logger.error(err);
                });
                break;
            case 1:
                this.swish.minimize().catch(err => {
                    this.logger.error('Failed to activate swish effect');
                    this.logger.error(err);
                });
                break;
            case 2:
                this.swish.deactivate().catch(err => {
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
                this.bars.deactivate().catch(err => {
                    this.logger.error('Failed to deactivate bars effect');
                    this.logger.error(err);
                });
                break;
            case 1:
                this.bars.activate().catch(err => {
                    this.logger.error('Failed to activate bars effect');
                    this.logger.error(err);
                });
                break;
        }
    }

    public async toggleInsamling(options?: InsamlingOverlayEffectOptions) {
        this.insamlingState = 1 - this.insamlingState;

        if (options) this.insamling.update(options);

        switch (this.insamlingState) {
            case 0:
                this.insamling.deactivate()?.catch(err => {
                    this.logger.error('Failed to deactivate insamling effect');
                    this.logger.error(err);
                });
                if (!this.plugin.video.playing) this.stopVideoSession(true);
                break;
            case 1:
                await this.startVideoSession(true);
                this.insamling.activate()?.catch(err => {
                    this.logger.error('Failed to activate insamling effect');
                    this.logger.error(err);
                });
                break;
        }
    }

    public getPresentationState(): PresentationPlaybackState {
        return { ...this.presentationState };
    }

    private broadcastPresentation() {
        this.api.broadcast('slides', 'UPDATE', this.getPresentationState());
    }

    public broadcastArmEvent(presentationId: string, rundownId: string | null) {
        const event: PresentationArmEvent = {
            presentationId,
            rundownId,
            ts: Date.now(),
        };
        this.api.broadcast('slides-arm', 'UPDATE', event);
    }

    public playSlide(
        presentationId: string,
        slideId: string,
        render: { text: string; reference: string },
    ) {
        const wasPlaying = this.presentationState.playing;

        this.presentationState = { playing: true, presentationId, slideId };

        if (!this.presentationEffect) {
            this.presentationEffect = this.api.createEffect(
                'overlay-presentation',
                getGroup(CHANNELS.MAIN, GROUPS.PRESENTATION),
                render,
            ) as PresentationOverlayEffect;
        } else {
            this.presentationEffect.update(render);
        }

        if (!wasPlaying) {
            this.presentationEffect.activate()?.catch(err => {
                this.logger.error('Failed to activate presentation effect');
                this.logger.error(err);
            });
        }

        this.broadcastPresentation();
    }

    public stopPlayback() {
        if (!this.presentationState.playing) return;

        this.presentationState = {
            playing: false,
            presentationId: null,
            slideId: null,
        };

        if (this.presentationEffect) {
            this.presentationEffect.deactivate()?.catch(err => {
                this.logger.error('Failed to deactivate presentation effect');
                this.logger.error(err);
            });
        }

        this.broadcastPresentation();
    }
}
