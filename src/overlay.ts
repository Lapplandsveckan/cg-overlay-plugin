import { type Logger, type PluginAPI } from '@lappis/cg-manager';
import type LappisOverlayPlugin from './index';
import { reportWarn } from './diagnostics';
import PresentationManager from './presentation-manager';
import VideoSessionManager, {
    VideoSessionStoppedError,
} from './video-session-manager';
import BarsManager from './effects/bars-manager';
import SwishManager from './effects/swish-manager';
import NamnskyltManager from './effects/namnskylt-manager';
import CaptionManager from './effects/caption-manager';
import VideoTransitionManager from './effects/video-transition-manager';
import {
    IDLE_RECYCLE_MS,
    IDLE_SWEEP_INTERVAL_MS,
    LOAD_DELAY,
    MAX_RECOVERY,
    delay,
} from './overlay-constants';
import {
    type PresentationPlaybackState,
    type Recyclable,
    type VideoIntroMode,
    type VideoOutroMode,
    type VideoPlayoutOptions,
} from './overlay-types';

// Re-export the canonical slide type from the store; OverlayManager
// stays narrow and only cares about (presentationId, slideId).
export type { Slide } from './presentations';
export type {
    PresentationPlaybackState,
    VideoIntroMode,
    VideoOutroMode,
    VideoPlayoutOptions,
} from './overlay-types';
export {
    CHANNELS,
    GROUPS,
    getGroup,
    LOAD_DELAY,
    ATEM_CUT_DELAY,
    VIDEO_TRANSITION_CUT_DELAY,
    FAST_TRANSITION_CUT_DELAY,
    IDLE_RECYCLE_MS,
} from './overlay-constants';
export { VideoSessionStoppedError };

export default class OverlayManager {
    private api: PluginAPI;
    private logger: Logger;
    private plugin: LappisOverlayPlugin;

    public presentation: PresentationManager;
    public videoSession: VideoSessionManager;

    private bars: BarsManager;
    private swish: SwishManager;
    private namnskylt: NamnskyltManager;
    private caption: CaptionManager;
    private videoTransition: VideoTransitionManager;

    private recyclables = new Map<string, Recyclable>();
    private idleSweepInterval: ReturnType<typeof setInterval> | null = null;

    constructor(instance: LappisOverlayPlugin) {
        this.plugin = instance;
        this.api = instance['api'];
        this.logger = instance['logger'];

        this.presentation = new PresentationManager(instance, (base: string) =>
            this.touchRecyclable(base),
        );
        this.videoSession = new VideoSessionManager(instance, {
            onToggleVideoTransition: (fast?: boolean) =>
                this.toggleVideoTransition(fast),
            getVideoTransitionState: () => this.videoTransition.getState(),
            broadcastOverlay: () => this.broadcastOverlay(),
            touchRecyclable: (base: string) => this.touchRecyclable(base),
        });

        this.bars = new BarsManager(this, instance);
        this.swish = new SwishManager(this, instance);
        this.namnskylt = new NamnskyltManager(this, instance);
        this.caption = new CaptionManager(this, instance);
        this.videoTransition = new VideoTransitionManager(this, instance);
    }

    public getChannelFps(channel: number): number {
        return this.presentation.getChannelFps(channel);
    }

    public touchRecyclable(base: string) {
        const r = this.recyclables.get(base);
        if (r) r.lastUsed = Date.now();
    }

    public broadcastOverlay() {
        this.api.broadcast('overlay-state', 'UPDATE', this.getOverlayState());
        this.api.invalidateFeedback('lappis-rundown-namnskylt');
        this.api.invalidateFeedback('lappis-swish-state');
        this.api.invalidateFeedback('lappis-bars-state');
        this.api.invalidateFeedback('lappis-insamling-state');
    }

    private buildInsamling() {
        this.videoSession.buildInsamling();
    }

    private getInsamlingState(): number {
        return this.videoSession.getInsamlingState();
    }

    private getInsamlingEffect() {
        return this.videoSession.getInsamlingEffect();
    }

    private buildRecyclables() {
        const now = Date.now();
        this.recyclables = new Map<string, Recyclable>([
            [
                'bars',
                {
                    base: 'bars',
                    rebuild: () => this.bars.rebuild(),
                    isOnAir: () => this.bars.isOnAir(),
                    replay: () => this.bars.replay(),
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
            [
                'swish',
                {
                    base: 'swish',
                    rebuild: () => this.swish.rebuild(),
                    isOnAir: () => this.swish.isOnAir(),
                    replay: () => this.swish.replay(),
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
            [
                'caption',
                {
                    base: 'caption',
                    rebuild: () => this.caption.rebuildEffect(),
                    isOnAir: () => this.caption.isOnAir(),
                    replay: () => this.caption.replay(),
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
            [
                'videotransition',
                {
                    base: 'videotransition',
                    rebuild: () => this.videoTransition.rebuild(),
                    isOnAir: () => this.videoTransition.isOnAir(),
                    replay: () => this.videoTransition.replay(),
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
                    isOnAir: () => this.getInsamlingState() === 1,
                    replay: () => this.getInsamlingEffect().activate(),
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
            [
                'presentation',
                {
                    base: 'presentation',
                    rebuild: () => this.presentation.buildPresentation(),
                    isOnAir: () => this.presentation.isPresentationPlaying(),
                    replay: () => {
                        const lastRender =
                            this.presentation.getLastTextRender();
                        const effect =
                            this.presentation.getPresentationEffect();
                        if (lastRender && effect) effect.update(lastRender);
                        if (effect) effect.activate();
                    },
                    lastUsed: now,
                    attempts: 0,
                    recycling: false,
                },
            ],
        ]);
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

        this.presentation.initialize();

        this.bars.initialize();
        this.swish.initialize();
        this.caption.initialize();
        this.videoTransition.initialize();
        this.namnskylt.initialize();
        this.buildInsamling();

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

        this.bars.dispose();
        this.swish.dispose();
        this.caption.dispose();
        this.videoTransition.dispose();
        this.namnskylt.dispose();

        this.presentation.dispose();
        this.videoSession.dispose();
    }

    public getVideoSession() {
        return this.videoSession.getVideoSession();
    }

    public startVideoSession(atem = false, intro: VideoIntroMode = 'regular') {
        return this.videoSession.startVideoSession(atem, intro);
    }

    public async stopVideoSession(atem = false, outro: VideoOutroMode = 'cut') {
        return this.videoSession.stopVideoSession(atem, outro);
    }

    public playVideo(video: string, options?: VideoPlayoutOptions) {
        return this.videoSession.playVideo(video, options);
    }

    public showNamnskylt(name: string) {
        this.namnskylt.show(name);
    }

    public hideNamnskylt() {
        this.namnskylt.hide();
    }

    public toggleBars() {
        this.bars.toggle();
    }

    public stopBars() {
        this.bars.stop();
    }

    public toggleCaption() {
        this.caption.toggle();
    }

    public stopCaption() {
        this.caption.stop();
    }

    public clearCaption() {
        this.caption.clear();
    }

    // Hide captions on-air without touching captionState/UI, e.g. while a
    // video plays. No-op if captions aren't enabled.
    public suspendCaption() {
        this.caption.suspend();
    }

    // Re-show captions after suspendCaption(), but only if they were left
    // enabled. Clears first so playback starts fresh instead of flashing
    // whatever backlog piled up while hidden.
    public resumeCaption() {
        this.caption.resume();
    }

    // Mirrors the namnskylt's own state (0 hidden / 1 full / 2 minimized) onto
    // the caption, which pushes its text up in lockstep so the two lower-thirds
    // don't overlap.
    public setCaptionNamnskyltState(state: number) {
        this.caption.setNamnskyltState(state);
    }

    public toggleVideoTransition(fast = false) {
        this.videoTransition.toggle(fast);
    }

    public toggleSwish(
        number?: string,
        labels?: string,
        highlightIntro?: boolean,
        fromBelow?: boolean,
    ) {
        this.swish.toggle(number, labels, highlightIntro, fromBelow);
    }

    public stopSwish() {
        this.swish.stop();
    }

    public async toggleInsamling(data?: any) {
        return this.videoSession.toggleInsamling(data);
    }

    public stopInsamling() {
        return this.videoSession.stopInsamling();
    }

    // Rebuild the caption pair after its settings (channel/language/etc.)
    // change, re-activating it if it was on-air so the new display URL takes
    // effect.
    public rebuildCaption() {
        this.caption.rebuild();
    }

    public getPresentationState(): PresentationPlaybackState {
        return this.presentation.getPresentationState();
    }

    public pausePresentationVideo() {
        return this.presentation.pausePresentationVideo();
    }

    public resumePresentationVideo() {
        return this.presentation.resumePresentationVideo();
    }

    public broadcastArmEvent(presentationId: string, rundownId: string | null) {
        return this.presentation.broadcastArmEvent(presentationId, rundownId);
    }

    public playSlide(
        presentationId: string,
        slideId: string,
        render: any,
        grabAttention = true,
    ) {
        return this.presentation.playSlide(
            presentationId,
            slideId,
            render,
            grabAttention,
        );
    }

    public stopPlayback() {
        return this.presentation.stopPlayback();
    }

    public getOverlayState() {
        const namnskyltState = this.namnskylt.getState();
        return {
            bars: this.bars.getState() === 1,
            caption: this.caption.getState() === 1,
            swish: {
                on: this.swish.isOnAir(),
                number: this.swish.getNumber(),
            },
            insamling: this.getInsamlingState() === 1,
            namnskylt: namnskyltState,
        };
    }
}
