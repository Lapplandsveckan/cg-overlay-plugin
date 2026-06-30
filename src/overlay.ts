/* eslint-disable max-lines */
import { type Effect, type Logger, type PluginAPI } from '@lappis/cg-manager';
import { type BarsOverlayEffect } from './effects/overlay/bars';
import { type SwishOverlayEffect } from './effects/overlay/swish';
import { type NamnskyltOverlayEffect } from './effects/overlay/namnskylt';
import { type VideoTransitionOverlayEffect } from './effects/overlay/videotransition';
import {
    type InsamlingOverlayEffect,
    type InsamlingOverlayEffectOptions,
} from './effects/overlay/insamling';
import { type VideoEffect } from './effects/misc/video';
import type LappisOverlayPlugin from './index';
import { type PresentationOverlayEffect } from './effects/overlay/presentation';
import { SidePair } from './effects/side-pair';
import { reportError, reportWarn } from './diagnostics';

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
    | { kind: 'text'; text: string; reference: string; heading?: boolean }
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

// Time for both LEFT and RIGHT templates to finish loading (CG ADD) before we
// fire CG PLAY, so the two halves animate in together instead of offset.
export const LOAD_DELAY = 200;
// Delay before cutting ATEM to the slides channel on first play, giving
// CasparCG time to render the new slide before it goes to air.
export const ATEM_CUT_DELAY = 300;
// How long to hold the video transition cover before cutting ATEM to the source.
export const VIDEO_TRANSITION_CUT_DELAY = 3000;
// Delay for fast-sweep transitions: cut while the screen is covered.
// The slide-in animation is 700ms, but starts after CG round-trip latency;
// 1000ms gives a comfortable margin while still landing before the exit begins.
export const FAST_TRANSITION_CUT_DELAY = 1000;
// Recycle idle (off-air, not recently used) templates after this duration.
export const IDLE_RECYCLE_MS = 10 * 60_000;

const IDLE_SWEEP_INTERVAL_MS = 60_000;
// Max auto-replay attempts per template before giving up and requiring manual
// retrigger. Prevents a reload loop when a template is persistently broken.
const MAX_RECOVERY = 2;

const delay = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms));

// Tracks a recyclable persistent overlay so the idle sweep and healthcheck
// recovery can dispose + re-arm it without duplicating per-effect logic.
interface Recyclable {
    base: string;
    rebuild: () => void;
    isOnAir: () => boolean;
    replay: () => void;
    lastUsed: number;
    attempts: number;
    recycling: boolean;
}

export default class OverlayManager {
    private api: PluginAPI;
    private logger: Logger;
    private plugin: LappisOverlayPlugin;

    constructor(instance: LappisOverlayPlugin) {
        this.plugin = instance;
        this.api = instance['api'];
        this.logger = instance['logger'];
    }

    private bars: SidePair<BarsOverlayEffect> = null;
    private barsState = 0;

    private swish: SidePair<SwishOverlayEffect> = null;
    private swishState = -1;

    private videoTransition: SidePair<VideoTransitionOverlayEffect> = null;
    private videoTransitionState = 0;

    private namnskylt: SidePair<NamnskyltOverlayEffect> = null;

    private insamling: InsamlingOverlayEffect = null;
    private insamlingState = 0;

    private presentationEffect: PresentationOverlayEffect = null;
    private presentationImageEffect: VideoEffect = null;
    private presentationKind: 'text' | 'image' | null = null;
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

    private recyclables = new Map<string, Recyclable>();
    private idleSweepInterval: ReturnType<typeof setInterval> | null = null;

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
            this.plugin,
        );
    }

    // Wait for both LEFT and RIGHT templates to finish loading (CG ADD) before
    // playing. Disposes the pair if superseded.
    private async loadThenActivate(
        pair: SidePair<Effect>,
        isCurrent: () => boolean,
    ) {
        await delay(LOAD_DELAY);
        if (isCurrent()) {
            pair.activate();
        } else {
            pair.dispose();
        }
    }

    // --- Per-effect builders (shared by initialize() and recycle) ---

    private buildBars() {
        this.bars?.dispose();
        this.bars = this.makeSidePair('overlay-bars', GROUPS.BARS, channel => ({
            healthType: channel === CHANNELS.LEFT ? 'bars-left' : 'bars-right',
        }));
    }

    private buildSwish() {
        this.swish?.dispose();
        this.swish = this.makeSidePair(
            'overlay-swish',
            GROUPS.OVERLAY,
            channel => ({
                number: '123 607 27 97',
                healthType:
                    channel === CHANNELS.LEFT ? 'swish-left' : 'swish-right',
            }),
        );
    }

    private buildVideoTransition() {
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

    private buildInsamling() {
        this.insamling?.dispose();
        this.insamling = this.api.createEffect(
            'overlay-insamling',
            getGroup(CHANNELS.VIDEO, GROUPS.OVERLAY),
            { healthType: 'insamling' },
        ) as InsamlingOverlayEffect; // TODO: special group so it is underneeth all overlays
    }

    private buildPresentation() {
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

    private buildRecyclables() {
        const now = Date.now();
        this.recyclables = new Map<string, Recyclable>([
            [
                'bars',
                {
                    base: 'bars',
                    rebuild: () => this.buildBars(),
                    isOnAir: () => this.barsState === 1,
                    replay: () => this.bars.activate(),
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
            [
                'swish',
                {
                    base: 'swish',
                    rebuild: () => this.buildSwish(),
                    isOnAir: () =>
                        this.swishState === 0 || this.swishState === 1,
                    replay: () => {
                        this.swish.activate();
                        if (this.swishState === 1)
                            this.swish.each(e => e.minimize(), 'minimize');
                    },
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
            [
                'videotransition',
                {
                    base: 'videotransition',
                    rebuild: () => this.buildVideoTransition(),
                    isOnAir: () => this.videoTransitionState === 1,
                    replay: () => {
                        this.videoTransition.update({ fast: false });
                        this.videoTransition.activate();
                    },
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
            [
                'insamling',
                {
                    base: 'insamling',
                    rebuild: () => this.buildInsamling(),
                    isOnAir: () => this.insamlingState === 1,
                    replay: () => this.insamling.activate(),
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
            [
                'presentation',
                {
                    base: 'presentation',
                    rebuild: () => this.buildPresentation(),
                    isOnAir: () =>
                        this.presentationState.playing &&
                        this.presentationKind === 'text',
                    replay: () => {
                        if (this.lastTextRender)
                            this.presentationEffect.update(this.lastTextRender);
                        this.presentationEffect.activate();
                    },
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
        ]);
    }

    private touchRecyclable(base: string) {
        const r = this.recyclables.get(base);
        if (r) r.lastUsed = Date.now();
    }

    private idleSweep() {
        const now = Date.now();
        for (const r of this.recyclables.values()) {
            if (r.recycling || r.isOnAir()) continue;
            if (now - r.lastUsed > IDLE_RECYCLE_MS) {
                r.rebuild();
                r.lastUsed = now;
                this.logger.info(`Idle-recycled overlay: ${r.base}`);
            }
        }
    }

    private async doRecycle(r: Recyclable, withReplay: boolean) {
        r.recycling = true;
        r.rebuild();
        if (withReplay) {
            await delay(LOAD_DELAY);
            if (r.isOnAir()) r.replay();
        }
        r.recycling = false;
    }

    // Called by HealthMonitor when a template fails to play or paint.
    public handleUnhealthy(type: string) {
        const base = type.replace(/-(left|right)$/, '');
        const r = this.recyclables.get(base);
        if (!r || r.recycling) return;

        const onAir = r.isOnAir();
        if (onAir) {
            if (r.attempts >= MAX_RECOVERY) {
                reportWarn(
                    this.plugin,
                    'overlay',
                    `Gave up auto-replay for "${base}" after ${MAX_RECOVERY} attempts — re-armed fresh, manual retrigger needed`,
                );
                r.attempts = 0;
                this.doRecycle(r, false);
                return;
            }

            r.attempts++;
            this.logger.warn(
                `Auto-recovering "${base}" (attempt ${r.attempts}/${MAX_RECOVERY})`,
            );
        }

        this.doRecycle(r, onAir);
    }

    // Called by HealthMonitor when both play + painted acks are confirmed.
    public handleHealthy(type: string) {
        const base = type.replace(/-(left|right)$/, '');
        const r = this.recyclables.get(base);
        if (!r) return;
        r.attempts = 0;
        r.lastUsed = Date.now();
    }

    public initialize() {
        if (this.idleSweepInterval !== null) {
            clearInterval(this.idleSweepInterval);
            this.idleSweepInterval = null;
        }

        this.buildBars();
        this.buildSwish();
        this.buildVideoTransition();
        this.buildInsamling();
        this.buildPresentation();
        this.presentationKind = null;

        this.buildRecyclables();
        this.idleSweepInterval = setInterval(
            () => this.idleSweep(),
            IDLE_SWEEP_INTERVAL_MS,
        );
    }

    public dispose() {
        if (this.idleSweepInterval !== null) {
            clearInterval(this.idleSweepInterval);
            this.idleSweepInterval = null;
        }
        this.recyclables.clear();

        if (this.bars) {
            this.bars.dispose();
            this.bars = null;
        }

        if (this.swish) {
            this.swish.dispose();
            this.swish = null;
        }

        if (this.videoTransition) {
            this.videoTransition.dispose();
            this.videoTransition = null;
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

    public startVideoSession(atem = false, skipIntro = false, fast = false) {
        if (this.videoSession) return Promise.resolve();

        this.videoSession = { stop: () => null };
        if (this.videoTransitionState !== 1)
            this.toggleVideoTransition(skipIntro, fast);

        if (skipIntro) {
            if (atem) this.plugin.atem.setVideoProgram();
            return Promise.resolve();
        }

        const holdMs = fast
            ? FAST_TRANSITION_CUT_DELAY
            : VIDEO_TRANSITION_CUT_DELAY;
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.videoSession.stop = () => null;
                resolve();

                if (atem) this.plugin.atem.setVideoProgram();
            }, holdMs);

            this.videoSession.stop = () => {
                clearTimeout(timeout);
                // Use a sentinel so video.ts can distinguish a normal stop
                // from a real failure.
                reject(new VideoSessionStoppedError());
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
        this.loadThenActivate(pair, () => this.namnskylt === pair);
    }

    public hideNamnskylt() {
        if (!this.namnskylt) return;
        const pair = this.namnskylt;
        this.namnskylt = null;
        pair.deactivate();
    }

    public toggleBars() {
        this.barsState = 1 - this.barsState;

        switch (this.barsState) {
            case 0:
                this.bars.deactivate();
                break;
            case 1:
                this.touchRecyclable('bars');
                this.bars.activate();
                break;
        }
    }

    public toggleVideoTransition(skipIntro = false, fast = false) {
        if (this.videoTransitionState === 1) {
            this.videoTransitionState = 0;
            return;
        }

        this.videoTransitionState = 1;
        if (skipIntro) return;

        this.touchRecyclable('videotransition');
        this.videoTransition.update({ fast });
        this.videoTransition.activate();
    }

    public toggleSwish(
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
        this.swish.update({ number: number || '', labels, fromBelow });

        switch (this.swishState) {
            case 0:
                this.touchRecyclable('swish');
                this.swish.activate();
                break;
            case 1:
                this.touchRecyclable('swish');
                this.swish.each(e => e.minimize(), 'minimize');
                break;
            case 2:
                this.swish.deactivate();
                break;
        }
    }

    public async toggleInsamling(options?: InsamlingOverlayEffectOptions) {
        this.insamlingState = 1 - this.insamlingState;

        if (options) this.insamling.update(options);

        switch (this.insamlingState) {
            case 0:
                this.insamling.deactivate();
                if (!this.plugin.video.playing) this.stopVideoSession(true);
                break;
            case 1:
                await this.startVideoSession(true);
                this.touchRecyclable('insamling');
                this.insamling.activate();
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
                    `Image slide media not found: "${render.mediaId}" — ` +
                        `check CasparCG has scanned the file (scan-timing race?) ` +
                        `or that the mediaId casing is correct`,
                );
                this.presentationState = prevState;
                this.broadcastPresentation();
                return;
            }

            if (this.presentationImageEffect) {
                this.presentationImageEffect.deactivate();
                this.presentationImageEffect = null;
            }

            if (wasKind === 'text' && this.presentationEffect) {
                this.presentationEffect.deactivate();
            }

            this.presentationImageEffect = this.api.createEffect(
                'lappis-video',
                getGroup(CHANNELS.VIDEO, GROUPS.PRESENTATION),
                { media, disposeOnStop: true, holdLastFrame: true },
            ) as VideoEffect;

            this.presentationImageEffect.activate();

            this.presentationKind = 'image';
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
}

// Sentinel error used by stopVideoSession so video.ts can distinguish a
// normal session stop from an actual failure without mislogging it.
export class VideoSessionStoppedError extends Error {
    constructor() {
        super('Video session stopped');
        this.name = 'VideoSessionStoppedError';
    }
}
