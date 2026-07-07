import { type PluginAPI } from '@lappis/cg-manager';
import {
    type InsamlingOverlayEffect,
    type InsamlingOverlayEffectOptions,
} from './effects/overlay/insamling';
import { type VideoEffect } from './effects/misc/video';
import type LappisOverlayPlugin from './index';
import {
    type VideoIntroMode,
    type VideoOutroMode,
    type VideoPlayoutOptions,
} from './overlay-types';
import {
    CHANNELS,
    FAST_TRANSITION_CUT_DELAY,
    GROUPS,
    VIDEO_TRANSITION_CUT_DELAY,
    WALL_VIDEO_TRANSFORM,
    getGroup,
} from './overlay-constants';

export class VideoSessionStoppedError extends Error {
    constructor() {
        super('Video session stopped');
        this.name = 'VideoSessionStoppedError';
    }
}

export interface VideoSessionManagerCallbacks {
    onToggleVideoTransition: (mode?: VideoIntroMode) => void;
    getVideoTransitionState: () => number;
    broadcastOverlay: () => void;
    touchRecyclable: (base: string) => void;
    startWallMirror: (
        mode?: VideoIntroMode,
        transform?: typeof WALL_VIDEO_TRANSFORM,
    ) => void;
    stopWallMirror: () => void;
}

export default class VideoSessionManager {
    private api: PluginAPI;
    private plugin: LappisOverlayPlugin;
    private callbacks: VideoSessionManagerCallbacks;

    private videoSession: null | {
        stop: () => void;
    } = null;

    private insamling: InsamlingOverlayEffect = null;
    private insamlingState = 0;
    private insamlingOutro: VideoOutroMode = 'cut';

    constructor(
        instance: LappisOverlayPlugin,
        callbacks: VideoSessionManagerCallbacks,
    ) {
        this.plugin = instance;
        this.api = instance['api'];
        this.callbacks = callbacks;
    }

    private cutVideoToProgram() {
        this.plugin.atem.setVideoProgram();
        if (this.plugin.settings.get().projectorsToProgram)
            this.plugin.atem.setProjectorsProgram();
    }

    private async fadeVideoToProgram() {
        await this.plugin.atem.fadeVideoToProgram();
        if (this.plugin.settings.get().projectorsToProgram)
            this.plugin.atem.setProjectorsProgram();
    }

    public startVideoSession(atem = false, intro: VideoIntroMode = 'regular') {
        if (this.videoSession) return Promise.resolve();

        this.videoSession = { stop: () => null };
        this.callbacks.startWallMirror(intro, WALL_VIDEO_TRANSFORM);

        if (intro === 'cut' || intro === 'fade') {
            return this.startVideoSessionDirect(atem, intro);
        }

        if (this.callbacks.getVideoTransitionState() !== 1) {
            this.callbacks.onToggleVideoTransition(intro);
        }

        const holdMs =
            intro === 'fast'
                ? FAST_TRANSITION_CUT_DELAY
                : VIDEO_TRANSITION_CUT_DELAY;
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.videoSession.stop = () => null;
                resolve();

                if (atem) this.cutVideoToProgram();
            }, holdMs);

            this.videoSession.stop = () => {
                clearTimeout(timeout);
                reject(new VideoSessionStoppedError());
            };
        });
    }

    // No banner — the transition itself happens on the ATEM (hard cut or mix).
    private async startVideoSessionDirect(
        atem: boolean,
        intro: 'cut' | 'fade',
    ) {
        if (!atem) return;
        if (intro === 'fade') await this.fadeVideoToProgram();
        else this.cutVideoToProgram();
    }

    public async stopVideoSession(atem = false, outro: VideoOutroMode = 'cut') {
        if (this.insamlingState === 1) return; // insamling still showing — keep session alive
        if (!this.videoSession)
            return this.plugin['logger'].warn('No video session to stop');
        if (this.callbacks.getVideoTransitionState() !== 0)
            this.callbacks.onToggleVideoTransition();

        if (atem) {
            if (outro === 'fade') await this.plugin.atem.fadeReturnToPreview();
            else this.plugin.atem.returnToPreview();
        }

        this.videoSession.stop();
        this.videoSession = null;
        this.callbacks.stopWallMirror();
    }

    public getVideoSession() {
        return this.videoSession;
    }

    public playVideo(video: string, options?: VideoPlayoutOptions) {
        const media = this.api.getFileDatabase().get(video);
        if (!media) throw new Error('Video not found');

        return this.api.createEffect(
            'lappis-video',
            `${CHANNELS.VIDEO}:video`,
            {
                media,
                holdLastFrame: true,
                disposeOnStop: true,
                channelFps: this.plugin.overlay.getChannelFps(CHANNELS.VIDEO),
                ...options,
            },
        ) as VideoEffect;
    }

    public buildInsamling() {
        this.insamling?.dispose();
        this.insamling = this.api.createEffect(
            'overlay-insamling',
            getGroup(CHANNELS.VIDEO, GROUPS.OVERLAY),
            { healthType: 'insamling' },
        ) as InsamlingOverlayEffect;
    }

    public getInsamlingState(): number {
        return this.insamlingState;
    }

    public getInsamlingEffect(): InsamlingOverlayEffect {
        return this.insamling;
    }

    public setInsamlingOutro(outro: VideoOutroMode) {
        this.insamlingOutro = outro;
    }

    public async toggleInsamling(
        data?: InsamlingOverlayEffectOptions & {
            options?: { intro?: VideoIntroMode; outro?: VideoOutroMode };
        },
    ) {
        this.insamlingState = 1 - this.insamlingState;
        this.callbacks.broadcastOverlay();

        const { options, ...effectOptions } = data ?? {};
        if (data) this.insamling.update(effectOptions);

        switch (this.insamlingState) {
            case 0:
                this.insamling.deactivate();
                if (!this.plugin.video.playing)
                    this.stopVideoSession(true, this.insamlingOutro);
                break;
            case 1:
                this.insamlingOutro = options?.outro ?? 'cut';
                await this.startVideoSession(true, options?.intro ?? 'regular');
                this.callbacks.touchRecyclable('insamling');
                this.insamling.activate();
                break;
        }
    }

    public stopInsamling() {
        this.insamlingState = 0;
        this.callbacks.broadcastOverlay();
        this.insamling.deactivate();
        if (!this.plugin.video.playing)
            this.stopVideoSession(true, this.insamlingOutro);
    }

    public dispose() {
        if (this.insamling) {
            this.insamling.dispose();
            this.insamling = null;
        }
    }
}
