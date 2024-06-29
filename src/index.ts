import path from 'path';
import {CasparPlugin, UI_INJECTION_ZONE} from '@lappis/cg-manager';
import {Templates} from './templates';
import {SwishOverlayEffect, SwishOverlayEffectOptions} from './effects/overlay/swish';
import {NamnskyltOverlayEffect, NamnskyltOverlayEffectOptions} from './effects/overlay/namnskylt';
import {VideoTransitionOverlayEffect, VideoTransitionOverlayEffectOptions} from './effects/overlay/videotransition';
import {SwishWallEffect, SwishWallEffectOptions} from './effects/wall/swish';
import {NamnskyltWallEffect, NamnskyltWallEffectOptions} from './effects/wall/namnskylt';
import {VideoTransitionWallEffect, VideoTransitionWallEffectOptions} from './effects/wall/videotransition';
import {BarsOverlayEffect, BarsOverlayEffectOptions} from './effects/overlay/bars';
import {InsamlingOverlayEffect, InsamlingOverlayEffectOptions} from './effects/overlay/insamling';
import {VideoEffect, VideoEffectOptions} from './effects/misc/video';
import VideoManager from './video';
import {RouteEffect, RouteEffectOptions} from './effects/misc/route';
import OverlayManager, {CHANNELS, getGroup, GROUPS} from './overlay';
import {RundownItem} from '@lappis/cg-manager/dist/types/rundown';
import {MotionEffect, MotionEffectOptions} from './effects/misc/motion';
import MotionManager from './motion';
import {AtemManager} from './atem';
import {config} from './config';

export default class LappisOverlayPlugin extends CasparPlugin {
    public templates: Templates;
    public video: VideoManager;
    public motion: MotionManager;
    public overlay: OverlayManager;
    public atem: AtemManager;

    public getLogger() {
        return this.logger;
    }

    public getOverlayManager() {
        return this.overlay;
    }

    public static get pluginName() {
        return 'lappis';
    }

    public getInjectionZone(zone: UI_INJECTION_ZONE, key: string) {
        return `${zone}.${key}` as UI_INJECTION_ZONE;
    }

    public sendVideoInformation() {
        const data = this.video.getInformation();
        this.api.broadcast('videos', 'UPDATE', data);
    }

    protected onEnable() {
        this.templates = new Templates(() => this.overlay.initialize());
        this.video = new VideoManager(this);
        this.overlay = new OverlayManager(this);
        this.motion = new MotionManager(this);
        this.atem = new AtemManager();

        this.atem.connect(config.atem.ip);

        this.api.getEffectGroup(getGroup(CHANNELS.MAIN, GROUPS.VIDEO)); // main video
        this.api.getEffectGroup(getGroup(CHANNELS.MAIN, GROUPS.OVERLAY)); // main overlay
        this.api.getEffectGroup(getGroup(CHANNELS.MAIN, GROUPS.PRESENTATION)); // main presentation

        this.api.getEffectGroup(getGroup(CHANNELS.WALL, GROUPS.MOTION)); // wall motion
        this.api.getEffectGroup(getGroup(CHANNELS.WALL, GROUPS.PRESENTATION)); // wall presentation
        this.api.getEffectGroup(getGroup(CHANNELS.WALL, GROUPS.VIDEO)); // wall video
        this.api.getEffectGroup(getGroup(CHANNELS.WALL, GROUPS.OVERLAY)); // wall overlay

        this.api.getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.VIDEO)); // video-out
        this.api.getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.OVERLAY)); // video-out

        this.registerEffects();

        this.api.registerRoute('motion/clip', async req => {
            if (!req.data) return null; // throw new WebError('Invalid request', 400);

            const { clip } = req.data as {clip: string};
            this.motion.setMotion(clip);
        }, 'ACTION');

        this.api.registerRoute('motion/color', async req => {
            if (!req.data) return null; // throw new WebError('Invalid request', 400);

            const { color } = req.data as {color: string};
            this.motion.setColor(color);
        }, 'ACTION');

        this.api.registerRoute('videos', async req => this.video.getInformation(), 'GET');
        this.api.registerRoute('videos/:id', async req => this.video.removeItem(req.params.id), 'DELETE');


        this.api.registerUI(UI_INJECTION_ZONE.PLUGIN_PAGE, path.join(__dirname, 'ui', 'overlay'));
        this.api.registerUI(UI_INJECTION_ZONE.RUNDOWN_SIDE, path.join(__dirname, 'ui', 'video'));

        const registerRundownAction = (key: string, action: (rundown: RundownItem) => void) => {
            this.api.registerUI(this.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_ITEM, key), path.join(__dirname, 'ui', key, 'Item'))
            this.api.registerUI(this.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_EDITOR, key), path.join(__dirname, 'ui', key, 'Editor'))

            this.api.registerRundownAction(key, action);
        };

        registerRundownAction('queue-video', async (rundown) => {
            const video = this.api.getFileDatabase().get(rundown.data.clip);
            if (!video) return null; // throw new WebError('Clip not found', 404);

            this.video.queueVideo(video.id);
        });

        registerRundownAction('play-video', async (rundown) => {
            const video = this.api.getFileDatabase().get(rundown.data.clip);
            if (!video) return null; // throw new WebError('Clip not found', 404);

            this.video.playVideo(video.id);
        });

        registerRundownAction('namnskylt', async (rundown) => {
            const name = rundown.data.name;
            if (!name) return null; // throw new WebError('No name provided', 400);

            this.overlay.showNamnskylt(name);
        });

        registerRundownAction('swish', async (rundown) => {
            const number = rundown.data.number;
            this.overlay.toggleSwish(number);
        });

        registerRundownAction('bars', async (rundown) => {
            this.overlay.toggleBars();
        });

        registerRundownAction('presentation', async (rundown) => {
            this.overlay.togglePresentationMode(rundown.data.atem ?? false);
        });

        registerRundownAction('insamling', async (rundown) => {
            this.overlay.toggleInsamling(rundown.data);
        });
    }

    protected onDisable() {
        this.overlay.dispose();
        this.overlay = null;

        this.templates.dispose();
        this.templates = null;
    }

    private registerEffects() {
        // TODO: sanitize options input, verify that the options are valid
        this.api.registerEffect(
            'overlay-swish',
            (group, options) => new SwishOverlayEffect(
                group,
                options as SwishOverlayEffectOptions,
                this.templates.getFilePath('overlay/swish'),
            ),
        );

        this.api.registerEffect(
            'overlay-namnskylt',
            (group, options) => new NamnskyltOverlayEffect(
                group,
                options as NamnskyltOverlayEffectOptions,
                this.templates.getFilePath('overlay/namnskylt'),
            ),
        );

        this.api.registerEffect(
            'overlay-videotransition',
            (group, options) => new VideoTransitionOverlayEffect(
                group,
                options as VideoTransitionOverlayEffectOptions,
                this.templates.getFilePath('overlay/videotransition'),
            ),
        );

        this.api.registerEffect(
            'overlay-bars',
            (group, options) => new BarsOverlayEffect(
                group,
                options as BarsOverlayEffectOptions,
                this.templates.getFilePath('overlay/bars'),
            ),
        );

        this.api.registerEffect(
            'overlay-insamling',
            (group, options) => new InsamlingOverlayEffect(
                group,
                options as InsamlingOverlayEffectOptions,
                this.templates.getFilePath('overlay/insamling'),
            ),
        );

        this.api.registerEffect(
            'wall-swish',
            (group, options) => new SwishWallEffect(
                group,
                options as SwishWallEffectOptions,
                this.templates.getFilePath('wall/swish'),
            ),
        );

        this.api.registerEffect(
            'wall-namnskylt',
            (group, options) => new NamnskyltWallEffect(
                group,
                options as NamnskyltWallEffectOptions,
                this.templates.getFilePath('wall/namnskylt'),
            ),
        );

        this.api.registerEffect(
            'wall-videotransition',
            (group, options) => new VideoTransitionWallEffect(
                group,
                options as VideoTransitionWallEffectOptions,
                this.templates.getFilePath('wall/videotransition'),
            ),
        );

        this.api.registerEffect(
            'lappis-video',
            (group, options) => new VideoEffect(group, options as VideoEffectOptions),
        );

        this.api.registerEffect(
            'lappis-route',
            (group, options) => new RouteEffect(group, options as RouteEffectOptions),
        );

        this.api.registerEffect(
            'motion',
            (group, options) => new MotionEffect(group, options as MotionEffectOptions),
        );
    }
}
