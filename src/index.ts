import path from 'path';
import fs from 'fs';
import {CasparPlugin, RundownActionMetadata, UI_INJECTION_ZONE} from '@lappis/cg-manager';
import {Templates} from './templates';
import {SwishOverlayEffect, SwishOverlayEffectOptions} from './effects/overlay/swish';
import {NamnskyltOverlayEffect, NamnskyltOverlayEffectOptions} from './effects/overlay/namnskylt';
import {VideoTransitionOverlayEffect, VideoTransitionOverlayEffectOptions} from './effects/overlay/videotransition';
import {BarsOverlayEffect, BarsOverlayEffectOptions} from './effects/overlay/bars';
import {InsamlingOverlayEffect, InsamlingOverlayEffectOptions} from './effects/overlay/insamling';
import {PresentationOverlayEffect, PresentationOverlayEffectOptions} from './effects/overlay/presentation';
import {VideoEffect, VideoEffectOptions} from './effects/misc/video';
import VideoManager from './video';
import {RouteEffect, RouteEffectOptions} from './effects/misc/route';
import OverlayManager, {CHANNELS, getGroup, GROUPS} from './overlay';
import {RundownItem} from '@lappis/cg-manager/dist/types/rundown';
import {getVerseSlides, VerseLookup} from './bible';
import {AtemManager} from './atem';
import {config} from './config';
import {NamnskyltPresetStore} from './namnskylt-presets';
import {PresentationStore} from './presentations';

export default class LappisOverlayPlugin extends CasparPlugin {
    public templates: Templates;
    public video: VideoManager;
    public overlay: OverlayManager;
    public atem: AtemManager;
    public namnskyltPresets: NamnskyltPresetStore;
    public presentations: PresentationStore;

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

    public static get minChannels() {
        return 2;
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
        this.presentations = new PresentationStore(this);

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
            'overlay-presentation',
            (group, options) => new PresentationOverlayEffect(
                group,
                options as PresentationOverlayEffectOptions,
                this.templates.getFilePath('overlay/presentation'),
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

        registerRundownAction('slides', async (rundown) => {
            const presentationId = rundown.data?.presentationId;
            if (typeof presentationId !== 'string' || !presentationId) {
                this.logger.warn('slides rundown action: no presentationId on entry');
                return;
            }

            await this.presentations.ready;
            if (!this.presentations.get(presentationId)) {
                this.logger.warn(`slides rundown action: presentation ${presentationId} not found`);
                return;
            }

            // Single broadcast — the UI opens the run modal in response.
            // Playback itself is triggered by the UI when the operator clicks a slide.
            this.overlay.broadcastArmEvent(presentationId, rundown.id);
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
        const bgPath = path.join(__dirname, 'templates', 'images', 'banner1.png');
        let bgCache: string | null = null;
        this.api.registerRoute('assets/background', async () => {
            bgCache ??= fs.readFileSync(bgPath).toString('base64');
            return {data: bgCache, mimeType: 'image/png'};
        }, 'GET');

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

        this.api.registerRoute('slides', async req => this.overlay.getPresentationState(), 'GET');

        this.api.registerRoute('bible', async req => {
            try {
                const lookup = req.data as VerseLookup;
                return getVerseSlides(lookup);
            } catch (e: any) {
                return {error: e?.message ?? 'Bible lookup failed'};
            }
        }, 'ACTION');

        this.api.registerRoute('slides', async req => {
            if (!req.data || typeof req.data !== 'object') return null;

            const data = req.data as {action: string, presentationId?: string, slideId?: string};
            switch (data.action) {
                case 'play': {
                    if (!data.presentationId || !data.slideId) return null;
                    await this.presentations.ready;
                    const presentation = this.presentations.get(data.presentationId);
                    if (!presentation) return null;
                    const slide = presentation.slides.find(s => s.id === data.slideId);
                    if (!slide) return null;
                    this.overlay.playSlide(
                        presentation.id,
                        slide.id,
                        {text: slide.text, reference: slide.type === 'bible' ? slide.reference : ''},
                    );
                    break;
                }
                case 'stop':
                    this.overlay.stopPlayback();
                    break;
            }

            return this.overlay.getPresentationState();
        }, 'ACTION');

        // Presentations CRUD
        this.api.registerRoute('presentations', async req => {
            await this.presentations.ready;
            return this.presentations.list();
        }, 'GET');

        this.api.registerRoute('presentations/:id', async req => {
            await this.presentations.ready;
            return this.presentations.get(req.params.id);
        }, 'GET');

        this.api.registerRoute('presentations', async req => {
            await this.presentations.ready;
            const input = (req.data && typeof req.data === 'object') ? req.data as any : {};
            const created = await this.presentations.create(input);
            this.api.broadcast('presentations', 'UPDATE', this.presentations.list());
            return created;
        }, 'ACTION');

        this.api.registerRoute('presentations/:id', async req => {
            await this.presentations.ready;
            const patch = (req.data && typeof req.data === 'object') ? req.data as any : {};
            const updated = await this.presentations.update(req.params.id, patch);
            if (updated) this.api.broadcast('presentations', 'UPDATE', this.presentations.list());
            return updated;
        }, 'UPDATE');

        this.api.registerRoute('presentations/:id', async req => {
            await this.presentations.ready;
            const ok = await this.presentations.remove(req.params.id);
            if (ok) {
                // If the deleted presentation is currently playing, stop the overlay.
                const state = this.overlay.getPresentationState();
                if (state.playing && state.presentationId === req.params.id) {
                    this.overlay.stopPlayback();
                }
                this.api.broadcast('presentations', 'UPDATE', this.presentations.list());
            }
            return ok;
        }, 'DELETE');
    }
}

function stripExt(name: string): string {
    return name.replace(/\.[^.]+$/, '');
}
