import { BasicChannel, type PluginAPI } from '@lappis/cg-manager';
import type LappisOverlayPlugin from '../index';
import { type RouteEffect, type RouteEffectOptions } from './misc/route';
import { type VideoTransitionOverlayEffect } from './overlay/videotransition';
import { CHANNELS, GROUPS, getGroup } from '../overlay-constants';
import type { VideoIntroMode } from '../overlay-types';

// Mirrors CHANNELS.VIDEO onto the wall while a video or a presentation is
// playing. Video sessions and presentations are assumed mutually exclusive
// on CHANNELS.VIDEO. The route only shows a cropped strip of the source
// frame (see WALL_VIDEO_TRANSFORM), so the video-transition graphic stays up
// underneath as the background for the rest of the screen — it needs to be
// visible for the whole session, not just flash during a cut.
export default class WallMirrorManager {
    private api: PluginAPI;
    private route: RouteEffect | null = null;
    private transition: VideoTransitionOverlayEffect | null = null;

    constructor(instance: LappisOverlayPlugin) {
        this.api = instance['api'];
    }

    private buildTransition() {
        this.transition?.dispose();
        this.transition = this.api.createEffect(
            'wall-videotransition',
            getGroup(CHANNELS.WALL, GROUPS.PRESENTATION),
            { healthType: 'wall-videotransition', persistent: true },
        ) as VideoTransitionOverlayEffect;
    }

    public initialize() {
        this.buildTransition();
    }

    public rebuild() {
        this.buildTransition();
    }

    public isOnAir(): boolean {
        return this.route !== null;
    }

    // Re-activates the (freshly rebuilt) transition after a health recovery.
    // Snaps in immediately regardless of the original mode — this is a
    // recovery, not the original reveal, so it shouldn't repeat the fade.
    public replay() {
        if (!this.route) return;
        if (!this.transition) this.buildTransition();
        this.transition.update({ mode: 'cut' });
        this.transition.activate();
    }

    // Defaults to 'cut' (instant, no fade-in) — the right default for
    // presentations, which have no animated intro of their own to sync with.
    public start(
        mode: VideoIntroMode = 'cut',
        transform?: RouteEffectOptions['transform'],
    ) {
        if (this.route) return;

        if (!this.transition) this.buildTransition();
        this.transition.update({ mode });
        this.transition.activate();

        this.route = this.api.createEffect(
            'lappis-route',
            getGroup(CHANNELS.WALL, GROUPS.VIDEO),
            {
                source: new BasicChannel(CHANNELS.VIDEO),
                transform,
                disposeOnStop: true,
            },
        ) as RouteEffect;
        this.route.activate();
    }

    public stop() {
        this.transition?.deactivate();

        if (!this.route) return;

        this.route.deactivate();
        this.route = null;
    }

    public dispose() {
        this.stop();

        if (this.transition) {
            this.transition.dispose();
            this.transition = null;
        }
    }
}
