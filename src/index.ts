import path from 'path';
import {CasparPlugin, RundownActionMetadata, UI_INJECTION_ZONE} from '@lappis/cg-manager';
import {Templates} from './templates';
import {SwishOverlayEffect, SwishOverlayEffectOptions} from './effects/overlay/swish';
import {NamnskyltOverlayEffect, NamnskyltOverlayEffectOptions} from './effects/overlay/namnskylt';
import {VideoTransitionOverlayEffect, VideoTransitionOverlayEffectOptions} from './effects/overlay/videotransition';
import {BarsOverlayEffect, BarsOverlayEffectOptions} from './effects/overlay/bars';
import {InsamlingOverlayEffect, InsamlingOverlayEffectOptions} from './effects/overlay/insamling';
import {VideoEffect, VideoEffectOptions} from './effects/misc/video';
import VideoManager from './video';
import {RouteEffect, RouteEffectOptions} from './effects/misc/route';
import OverlayManager, {CHANNELS, getGroup, GROUPS} from './overlay';
import {RundownItem} from '@lappis/cg-manager/dist/types/rundown';
import {AtemManager} from './atem';
import {config} from './config';
import {NamnskyltPresetStore} from './namnskylt-presets';

export default class LappisOverlayPlugin extends CasparPlugin {
    public templates: Templates;
    public video: VideoManager;
    public overlay: OverlayManager;
    public atem: AtemManager;
    public namnskyltPresets: NamnskyltPresetStore;

    private reconnectHandler: () => void;

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
        this.atem = new AtemManager();
        this.namnskyltPresets = new NamnskyltPresetStore(this);

        if (config.atem.ip) {
            this.atem.connect(config.atem.ip);
        }

        this.registerEffectGroups();
        this.registerEffects();
        this.registerRoutes();

        this.api.registerUI(UI_INJECTION_ZONE.PLUGIN_PAGE, path.join(__dirname, 'ui', 'overlay'));
        this.api.registerUI(UI_INJECTION_ZONE.RUNDOWN_SIDE, path.join(__dirname, 'ui', 'video'));
        this.api.registerUI(UI_INJECTION_ZONE.RUNDOWN_BOTTOM_PANEL, path.join(__dirname, 'ui', 'panel'));

        this.registerRundownActions();

        this.reconnectHandler = () => {
            this.logger.info('Server reconnected — restoring effect groups and persistent effects');
            this.registerEffectGroups();
            this.overlay.initialize();
        };
        this.api.onReconnect(this.reconnectHandler);
    }

    protected onDisable() {
        if (this.reconnectHandler) {
            this.api.offReconnect(this.reconnectHandler);
            this.reconnectHandler = null;
        }

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
            'lappis-video',
            (group, options) => new VideoEffect(group, options as VideoEffectOptions),
        );

        this.api.registerEffect(
            'lappis-route',
            (group, options) => new RouteEffect(group, options as RouteEffectOptions),
        );
    }

    protected registerRundownActions() {
        const registerRundownAction = (key: string, action: (rundown: RundownItem) => void, metadata?: RundownActionMetadata) => {
            this.api.registerUI(this.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_ITEM, key), path.join(__dirname, 'ui', key, 'Item'));
            this.api.registerUI(this.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_EDITOR, key), path.join(__dirname, 'ui', key, 'Editor'));

            this.api.registerRundownAction(key, action, metadata);
        };

        registerRundownAction('play-video', async (rundown) => {
            const video = this.api.getFileDatabase().get(rundown.data.clip);
            if (!video) return null; // throw new WebError('Clip not found', 404);

            if (rundown.data.options?.playNow) this.video.playVideo(video.id, rundown.data.options);
            else this.video.queueVideo(video.id, rundown.data.options);
        }, {
            accepts: {
                fileTypes: ['video/*'],
                match: file => {
                    if (!file.type.startsWith('video/')) return null;
                    return {
                        type: 'play-video',
                        title: stripExt(file.name),
                        data: {clip: (file as unknown as {mediaId: string}).mediaId},
                    };
                },
            },
        });

        registerRundownAction('namnskylt', async (rundown) => {
            const name = rundown.data.name;
            if (!name) return null; // throw new WebError('No name provided', 400);

            this.overlay.showNamnskylt(name);
        });

        registerRundownAction('swish', async (rundown) => {
            const {number, labels, skipFirst} = rundown.data;
            this.overlay.toggleSwish(number, labels, skipFirst);
        });

        registerRundownAction('bars', async (rundown) => {
            this.overlay.toggleBars();
        });

        registerRundownAction('insamling', async (rundown) => {
            this.overlay.toggleInsamling(rundown.data);
        });
    }

    public registerEffectGroups() {
        this.api.getEffectGroup(getGroup(CHANNELS.MAIN, GROUPS.VIDEO)); // main video
        this.api.getEffectGroup(getGroup(CHANNELS.MAIN, GROUPS.BARS)); // main video
        this.api.getEffectGroup(getGroup(CHANNELS.MAIN, GROUPS.OVERLAY)); // main overlay
        this.api.getEffectGroup(getGroup(CHANNELS.MAIN, GROUPS.PRESENTATION)); // main presentation

        this.api.getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.VIDEO)); // video-out
        this.api.getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.OVERLAY)); // video-out
    }

    public registerRoutes() {
        this.api.registerRoute('bars', async req => {
            this.overlay.toggleBars();
        }, 'ACTION');

        this.api.registerRoute('swish', async req => {
            this.overlay.toggleSwish(typeof req.data === 'object' && req.data['number']);
        }, 'ACTION');

        this.api.registerRoute('insamling', async req => {
            if (!req.data || typeof req.data !== 'object') return null; // throw new WebError('Invalid request', 400);

            const { now, goal } = req.data as any;
            this.overlay.toggleInsamling({ now, goal });
        }, 'ACTION');

        this.api.registerRoute('videos', async req => this.video.getInformation(), 'GET');
        this.api.registerRoute('videos/:id', async req => this.video.removeItem(req.params.id), 'DELETE');

        this.api.registerRoute('videos', async req => this.video.clearQueue(), 'DELETE');
        this.api.registerRoute('video', async req => this.video.stopVideo(typeof req.data === 'object' && req.data['clear']), 'DELETE');

        this.api.registerRoute('video/play', async req => {
            const {clip, options} = req.data as any;
            const video = this.api.getFileDatabase().get(clip);
            if (!video) return null;
            this.video.playVideo(video.id, options);
        }, 'ACTION');

        this.api.registerRoute('namnskylt-presets', async req => {
            await this.namnskyltPresets.ready;
            return this.namnskyltPresets.get();
        }, 'GET');

        this.api.registerRoute('namnskylt-presets', async req => {
            await this.namnskyltPresets.ready;
            return this.namnskyltPresets.replace(req.data);
        }, 'UPDATE');
    }
}

function stripExt(name: string): string {
    return name.replace(/\.[^.]+$/, '');
}
