import { noTryAsync } from 'no-try';
import { type PluginAPI } from '@lappis/cg-manager';
import { type VideoEffect } from './effects/misc/video';
import type LappisOverlayPlugin from './index';
import { type PresentationOverlayEffect } from './effects/overlay/presentation';
import {
    type PresentationArmEvent,
    type PresentationPlaybackState,
    type SlideRender,
} from './overlay-types';
import {
    ATEM_CUT_DELAY,
    CHANNELS,
    GROUPS,
    SLIDE_SWAP_DEACTIVATE_DELAY,
    getGroup,
} from './overlay-constants';
import { reportError, reportWarn } from './diagnostics';
import { DEFAULT_CHANNEL_FPS, parseChannelFps } from './effects/misc/fps';

export default class PresentationManager {
    private api: PluginAPI;
    private plugin: LappisOverlayPlugin;
    private touchRecyclable: (base: string) => void;

    private presentationEffect: PresentationOverlayEffect = null;
    private presentationImageEffect: VideoEffect = null;
    private presentationKind: 'text' | 'image' | 'video' | null = null;
    private presentationState: PresentationPlaybackState = {
        playing: false,
        presentationId: null,
        slideId: null,
    };

    private lastTextRender: {
        text: string;
        reference: string;
        heading?: boolean;
    } | null = null;

    private channelFps = new Map<number, number>();

    constructor(
        instance: LappisOverlayPlugin,
        touchRecyclable: (base: string) => void,
    ) {
        this.plugin = instance;
        this.api = instance['api'];
        this.touchRecyclable = touchRecyclable;
    }

    // Cached per channel; re-resolved on initialize() since the mode can change across a restart.
    private async resolveChannelFps(channel: number): Promise<number> {
        const [err, result] = await noTryAsync(() =>
            this.api.getChannel(channel).executor.promise(`INFO ${channel}`),
        );
        const fps = !err ? parseChannelFps(result.data) : null;

        if (fps === null) {
            reportWarn(
                this.plugin,
                'video',
                `Could not resolve fps for channel ${channel}, falling back to ${DEFAULT_CHANNEL_FPS}`,
            );
            this.channelFps.delete(channel);
            return DEFAULT_CHANNEL_FPS;
        }

        this.channelFps.set(channel, fps);
        return fps;
    }

    public getChannelFps(channel: number): number {
        return this.channelFps.get(channel) ?? DEFAULT_CHANNEL_FPS;
    }

    public buildPresentation() {
        this.presentationEffect?.dispose();
        this.presentationEffect = this.api.createEffect(
            'overlay-presentation',
            getGroup(CHANNELS.VIDEO, GROUPS.PRESENTATION),
            {
                text: '',
                reference: '',
                heading: false,
                healthType: 'presentation',
            },
        ) as PresentationOverlayEffect;
    }

    public getPresentationState(): PresentationPlaybackState {
        const state = { ...this.presentationState };
        if (this.presentationKind === 'video' && this.presentationImageEffect) {
            const meta = this.presentationImageEffect.getMetadata() as {
                playing: boolean;
                paused: boolean;
                clipDuration: number;
                playDuration: number;
            };
            state.video = {
                playing: meta.playing,
                paused: meta.paused,
                clipDuration: meta.clipDuration,
                playDuration: meta.playDuration,
            };
        }
        return state;
    }

    public pausePresentationVideo() {
        if (this.presentationKind !== 'video' || !this.presentationImageEffect)
            return;
        this.presentationImageEffect.pause();
        this.broadcastPresentation();
    }

    public resumePresentationVideo() {
        if (this.presentationKind !== 'video' || !this.presentationImageEffect)
            return;
        this.presentationImageEffect.resume();
        this.broadcastPresentation();
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
        grabAttention = true,
    ) {
        const prevState = { ...this.presentationState };
        const wasKind = this.presentationKind;

        this.presentationState = { playing: true, presentationId, slideId };

        if (render.kind === 'text') {
            if (this.presentationImageEffect) {
                this.presentationImageEffect.deactivate();
                this.presentationImageEffect = null;
            }

            this.lastTextRender = {
                text: render.text,
                reference: render.reference,
                heading: render.heading,
            };
            this.presentationEffect.update(this.lastTextRender);
            this.touchRecyclable('presentation');
            this.presentationEffect.activate();

            this.presentationKind = 'text';
        } else {
            const media = this.api.getFileDatabase().get(render.mediaId);
            if (!media) {
                reportError(
                    this.plugin,
                    'overlay',
                    `${render.kind === 'video' ? 'Video' : 'Image'} slide media not found: "${render.mediaId}" — ` +
                        `check CasparCG has scanned the file (scan-timing race?) ` +
                        `or that the mediaId casing is correct`,
                );
                this.presentationState = prevState;
                this.broadcastPresentation();
                return;
            }

            if (wasKind === 'text' && this.presentationEffect) {
                this.presentationEffect.deactivate();
            }

            // Capture the outgoing image effect before reassigning so we can
            // clear it after the new one is visible (prevents flicker).
            const prevImage = this.presentationImageEffect;

            this.presentationImageEffect = this.api.createEffect(
                'lappis-video',
                getGroup(CHANNELS.VIDEO, GROUPS.PRESENTATION),
                {
                    media,
                    disposeOnStop: true,
                    holdLastFrame: true,
                    channelFps: this.getChannelFps(CHANNELS.VIDEO),
                    ...(render.kind === 'video'
                        ? {
                              seekSec: render.inPoint,
                              lengthSec:
                                  render.outPoint !== undefined
                                      ? render.outPoint - (render.inPoint ?? 0)
                                      : undefined,
                              volume: render.volume,
                          }
                        : {}),
                },
            ) as VideoEffect;

            // New effect allocates a higher layer in the group, so it renders
            // on top of the still-visible previous image — activate first.
            this.presentationImageEffect.activate();

            if (render.kind === 'video') {
                // Once the clip reaches its held last frame, rebroadcast so
                // the operator UI stops the countdown/pause controls.
                const forSlideId = slideId;
                this.presentationImageEffect.once('video:finish', () => {
                    if (
                        this.presentationState.slideId === forSlideId &&
                        this.presentationState.presentationId === presentationId
                    )
                        this.broadcastPresentation();
                });
            }

            // Clear the old image after a brief overlap so there's no empty frame.
            if (prevImage) {
                setTimeout(
                    () => prevImage.deactivate(),
                    SLIDE_SWAP_DEACTIVATE_DELAY,
                );
            }

            this.presentationKind = render.kind;
        }

        // Delay the ATEM cut so the new slide renders before going to air.
        if (grabAttention) {
            setTimeout(() => {
                if (
                    this.presentationState.playing &&
                    this.presentationState.presentationId === presentationId &&
                    this.presentationState.slideId === slideId
                ) {
                    this.plugin.atem.ensureVideoProgram();
                }
            }, ATEM_CUT_DELAY);
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
        this.plugin.atem.returnToPreview();

        if (this.presentationEffect) {
            this.presentationEffect.deactivate();
        }

        if (this.presentationImageEffect) {
            this.presentationImageEffect.deactivate();
            this.presentationImageEffect = null;
        }

        this.broadcastPresentation();
    }

    public getLastTextRender() {
        return this.lastTextRender;
    }

    public getPresentationEffect() {
        return this.presentationEffect;
    }

    public getPresentationKind() {
        return this.presentationKind;
    }

    public isPresentationPlaying(): boolean {
        return (
            this.presentationState.playing && this.presentationKind === 'text'
        );
    }

    public initialize() {
        this.resolveChannelFps(CHANNELS.VIDEO);
        this.buildPresentation();
        this.presentationKind = null;
    }

    public dispose() {
        if (this.presentationEffect) {
            this.presentationEffect.dispose();
            this.presentationEffect = null;
        }

        if (this.presentationImageEffect) {
            this.presentationImageEffect.dispose();
            this.presentationImageEffect = null;
        }
    }
}
