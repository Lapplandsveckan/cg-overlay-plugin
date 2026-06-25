import { type Effect, type Logger, type PluginAPI } from '@lappis/cg-manager';
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
import { SidePair } from './effects/side-pair';

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

type SlideRender =
    | { kind: 'text'; text: string; reference: string }
    | { kind: 'image'; mediaId: string };

export const CHANNELS = {
    LEFT: 1,
    RIGHT: 2,
    VIDEO: 3,
};

export const MAIN_SIDES = [CHANNELS.LEFT, CHANNELS.RIGHT] as const;

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

    private swish: SidePair<SwishOverlayEffect> = null;
    private swishState = -1;

    private bars: SidePair<BarsOverlayEffect> = null;
    private barsState = 0;

    private namnskylt: SidePair<NamnskyltOverlayEffect> = null;

    private insamling: InsamlingOverlayEffect = null;
    private insamlingState = 0;

    private videoTransitionState = 0;

    private presentationEffect: SidePair<PresentationOverlayEffect> = null;
    private presentationImageEffect: SidePair<VideoEffect> = null;
    private presentationKind: 'text' | 'image' | null = null;
    private presentationState: PresentationPlaybackState = {
        playing: false,
        presentationId: null,
        slideId: null,
    };

    // Build a SidePair targeting LEFT and RIGHT channels with the given group.
    // optsFor receives the channel number so per-side options (e.g. direction)
    // can be derived from the side.
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
            this.logger,
        );
    }

    public initialize() {
        this.swish = this.makeSidePair(
            'overlay-swish',
            GROUPS.OVERLAY,
            () => ({ number: '123 607 27 97' }),
        );

        this.bars = this.makeSidePair(
            'overlay-bars',
            GROUPS.BARS,
            () => ({}),
        ); // TODO: special group so it is underneeth all overlays

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
        this.namnskylt = this.makeSidePair(
            'overlay-namnskylt',
            GROUPS.OVERLAY,
            () => ({ name }),
        );
        this.namnskylt.activate();
    }

    public hideNamnskylt() {
        if (!this.namnskylt) return;
        const pair = this.namnskylt;
        this.namnskylt = null;
        pair.deactivate();
    }

    public toggleVideoTransition(skipIntro = false) {
        if (this.videoTransitionState === 1) {
            this.videoTransitionState = 0;
            return;
        }

        this.videoTransitionState = 1;
        if (skipIntro) return;

        // Each side receives its outward slide direction.
        const pair = this.makeSidePair(
            'overlay-videotransition',
            GROUPS.PRESENTATION,
            channel => ({
                direction: channel === CHANNELS.LEFT ? 'left' : 'right',
            }),
        );
        pair.activate();
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
                this.swish.activate();
                break;
            case 1:
                this.swish.each(e => e.minimize(), 'minimize');
                break;
            case 2:
                this.swish.deactivate();
                break;
        }
    }

    public toggleBars() {
        this.barsState = 1 - this.barsState;

        switch (this.barsState) {
            case 0:
                this.bars.deactivate();
                break;
            case 1:
                this.bars.activate();
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
        render: SlideRender,
    ) {
        const wasPlaying = this.presentationState.playing;
        const wasKind = this.presentationKind;

        this.presentationState = { playing: true, presentationId, slideId };

        if (render.kind === 'text') {
            if (this.presentationImageEffect) {
                this.presentationImageEffect.deactivate();
                this.presentationImageEffect = null;
            }

            if (!this.presentationEffect) {
                this.presentationEffect = this.makeSidePair(
                    'overlay-presentation',
                    GROUPS.PRESENTATION,
                    () => ({
                        text: render.text,
                        reference: render.reference,
                    }),
                );
            } else {
                this.presentationEffect.update({
                    text: render.text,
                    reference: render.reference,
                });
            }

            if (!wasPlaying || wasKind !== 'text') {
                this.presentationEffect.activate();
            }

            this.presentationKind = 'text';
        } else {
            const media = this.api.getFileDatabase().get(render.mediaId);
            if (!media) {
                this.logger.error(
                    `Image slide media not found: ${render.mediaId}`,
                );
                return;
            }

            if (this.presentationImageEffect) {
                this.presentationImageEffect.deactivate();
                this.presentationImageEffect = null;
            }

            if (wasKind === 'text' && this.presentationEffect) {
                this.presentationEffect.deactivate();
            }

            this.presentationImageEffect = this.makeSidePair(
                'lappis-video',
                GROUPS.PRESENTATION,
                () => ({ media, disposeOnStop: true, holdLastFrame: true }),
            );

            this.presentationImageEffect.activate();

            this.presentationKind = 'image';
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
        this.presentationKind = null;

        if (this.presentationEffect) {
            this.presentationEffect.deactivate();
        }

        if (this.presentationImageEffect) {
            this.presentationImageEffect.deactivate();
            this.presentationImageEffect = null;
        }

        this.broadcastPresentation();
    }
}
