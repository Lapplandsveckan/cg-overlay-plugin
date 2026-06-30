/* eslint-disable max-lines */
import path from 'path';
import { noTry } from 'no-try';
import {
    CasparPlugin,
    type RundownActionMetadata,
    UI_INJECTION_ZONE,
} from '@lappis/cg-manager';
import { type RundownItem } from '@lappis/cg-manager/dist/types/rundown';
import { Templates } from './templates';
import {
    BarsOverlayEffect,
    type BarsOverlayEffectOptions,
} from './effects/overlay/bars';
import {
    SwishOverlayEffect,
    type SwishOverlayEffectOptions,
} from './effects/overlay/swish';
import {
    NamnskyltOverlayEffect,
    type NamnskyltOverlayEffectOptions,
} from './effects/overlay/namnskylt';
import {
    VideoTransitionOverlayEffect,
    type VideoTransitionOverlayEffectOptions,
} from './effects/overlay/videotransition';
import {
    InsamlingOverlayEffect,
    type InsamlingOverlayEffectOptions,
} from './effects/overlay/insamling';
import {
    PresentationOverlayEffect,
    type PresentationOverlayEffectOptions,
} from './effects/overlay/presentation';
import { VideoEffect, type VideoEffectOptions } from './effects/misc/video';
import VideoManager from './video';
import { RouteEffect, type RouteEffectOptions } from './effects/misc/route';
import OverlayManager, {
    CHANNELS,
    getGroup,
    GROUPS,
    MAIN_SIDES,
} from './overlay';
import { getVerseSlides, type VerseLookup } from './bible';
import { AtemManager } from './atem';
import { config } from './config';
import { NamnskyltPresetStore } from './namnskylt-presets';
import { PresentationStore } from './presentations';
import { buildBackgroundData, readImageData } from './assets';
import {
    createConversionJob,
    getConversionResult,
    isConversionEnabled,
} from './cloudconvert';
import { getEvents, reportWarn } from './diagnostics';
import { HealthMonitor } from './healthcheck';
import { ActiveRundownStore } from './active-rundown';

export default class LappisOverlayPlugin extends CasparPlugin {
    public templates: Templates;
    public video: VideoManager;
    public overlay: OverlayManager;
    public atem: AtemManager;
    public namnskyltPresets: NamnskyltPresetStore;
    public presentations: PresentationStore;
    public activeRundown: ActiveRundownStore;
    public health: HealthMonitor;

    private reconnectHandler: () => void;
    private companionPollInterval: ReturnType<typeof setInterval> | null = null;

    public getLogger() {
        return this.logger;
    }

    // Narrow broadcast wrapper so diagnostics.ts / effects can surface errors
    // to the UI without importing the full PluginAPI type.
    public broadcast(target: string, method: string, data: unknown) {
        this.api.broadcast(target, method as any, data);
    }

    public getOverlayManager() {
        return this.overlay;
    }

    public static get pluginName() {
        return 'lappis';
    }

    public static get minChannels() {
        return 3;
    }

    public getInjectionZone(zone: UI_INJECTION_ZONE, key: string) {
        return `${zone}.${key}` as UI_INJECTION_ZONE;
    }

    public sendVideoInformation() {
        const data = this.video.getInformation();
        this.api.broadcast('videos', 'UPDATE', data);
        this.api.invalidateFeedback('lappis-rundown-video');
        this.api.invalidateFeedback('lappis-video-queue-state');
    }

    protected onEnable() {
        this.health = new HealthMonitor(this);

        // Only send CG ADD commands once both the local template HTTP server is
        // up AND CasparCG is connected. awaitConnection() resolves immediately
        // if already connected, so this is a no-op on reconnect paths.
        this.templates = new Templates(
            async () => {
                await this.api.awaitConnection();
                if (this.overlay) this.overlay.initialize();
            },
            (hcId, phase) => this.health?.ack(hcId, phase),
        );
        this.video = new VideoManager(this);
        this.overlay = new OverlayManager(this);
        this.health.onUnhealthy = type => this.overlay.handleUnhealthy(type);
        this.health.onHealthy = type => this.overlay.handleHealthy(type);
        this.atem = new AtemManager(this);
        this.namnskyltPresets = new NamnskyltPresetStore(this);
        this.presentations = new PresentationStore(this);
        this.activeRundown = new ActiveRundownStore(this);

        if (config.atem.ip) {
            this.atem.connect(config.atem.ip);
        }

        this.registerEffectGroups();
        this.registerEffects();
        this.registerRoutes();

        this.api.registerUI(
            UI_INJECTION_ZONE.PLUGIN_PAGE,
            path.join(__dirname, 'ui', 'overlay'),
        );
        this.api.registerUI(
            UI_INJECTION_ZONE.RUNDOWN_SIDE,
            path.join(__dirname, 'ui', 'video'),
        );
        const PANEL = UI_INJECTION_ZONE.RUNDOWN_BOTTOM_PANEL;
        this.api.registerUI(
            `${PANEL}.cg-overlay-plugin:panel.mediaTab` as UI_INJECTION_ZONE,
            path.join(__dirname, 'ui', 'media'),
        );
        this.api.registerUI(
            `${PANEL}.cg-overlay-plugin:panel.namnskyltarTab` as UI_INJECTION_ZONE,
            path.join(__dirname, 'ui', 'namnskyltar'),
        );
        this.api.registerUI(
            `${PANEL}.cg-overlay-plugin:panel.slidesTab` as UI_INJECTION_ZONE,
            path.join(__dirname, 'ui', 'slides'),
        );

        this.registerRundownActions();
        this.registerCompanion();

        this.reconnectHandler = () => {
            this.logger.info(
                'Server reconnected — restoring effect groups and persistent effects',
            );
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

        if (this.companionPollInterval !== null) {
            clearInterval(this.companionPollInterval);
            this.companionPollInterval = null;
        }

        this.health?.dispose();
        this.health = null;

        this.overlay.dispose();
        this.overlay = null;

        this.templates.dispose();
        this.templates = null;
    }

    private registerEffects() {
        // TODO: sanitize options input, verify that the options are valid
        this.api.registerEffect(
            'overlay-bars',
            (group, options) =>
                new BarsOverlayEffect(
                    group,
                    options as BarsOverlayEffectOptions,
                    this.templates.getFilePath('overlay/bars'),
                    this.getLogger().scope('effect:bars'),
                    this.health,
                ),
        );

        this.api.registerEffect(
            'overlay-swish',
            (group, options) =>
                new SwishOverlayEffect(
                    group,
                    options as SwishOverlayEffectOptions,
                    this.templates.getFilePath('overlay/swish'),
                    this.getLogger().scope('effect:swish'),
                    this.health,
                ),
        );

        this.api.registerEffect(
            'overlay-namnskylt',
            (group, options) =>
                new NamnskyltOverlayEffect(
                    group,
                    options as NamnskyltOverlayEffectOptions,
                    this.templates.getFilePath('overlay/namnskylt'),
                    this.getLogger().scope('effect:namnskylt'),
                    this.health,
                ),
        );

        this.api.registerEffect(
            'overlay-videotransition',
            (group, options) =>
                new VideoTransitionOverlayEffect(
                    group,
                    options as VideoTransitionOverlayEffectOptions,
                    this.templates.getFilePath('overlay/videotransition'),
                    this.getLogger().scope('effect:videotransition'),
                    this.health,
                ),
        );

        this.api.registerEffect(
            'overlay-insamling',
            (group, options) =>
                new InsamlingOverlayEffect(
                    group,
                    options as InsamlingOverlayEffectOptions,
                    this.templates.getFilePath('overlay/insamling'),
                    this.getLogger().scope('effect:insamling'),
                    this.health,
                ),
        );

        this.api.registerEffect(
            'overlay-presentation',
            (group, options) =>
                new PresentationOverlayEffect(
                    group,
                    options as PresentationOverlayEffectOptions,
                    this.templates.getFilePath('overlay/presentation'),
                    this.getLogger().scope('effect:presentation'),
                    this.health,
                ),
        );

        this.api.registerEffect(
            'lappis-video',
            (group, options) =>
                new VideoEffect(group, {
                    ...(options as VideoEffectOptions),
                    logger: this.getLogger().scope('effect:video'),
                }),
        );

        this.api.registerEffect(
            'lappis-route',
            (group, options) =>
                new RouteEffect(group, {
                    ...(options as RouteEffectOptions),
                    logger: this.getLogger().scope('effect:route'),
                }),
        );
    }

    protected registerRundownActions() {
        const registerRundownAction = (
            key: string,
            action: (rundown: RundownItem) => void,
            metadata?: RundownActionMetadata,
        ) => {
            this.api.registerUI(
                this.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_ITEM, key),
                path.join(__dirname, 'ui', key, 'Item'),
            );
            this.api.registerUI(
                this.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_EDITOR, key),
                path.join(__dirname, 'ui', key, 'Editor'),
            );

            this.api.registerRundownAction(key, action, metadata);
        };

        registerRundownAction(
            'play-video',
            async rundown => {
                const video = this.api.getFileDatabase().get(rundown.data.clip);
                if (!video) {
                    reportWarn(
                        this,
                        'route',
                        `play-video: clip "${rundown.data.clip}" not found`,
                    );
                    return null;
                }

                if (rundown.data.options?.playNow)
                    this.video.playVideo(video.id, rundown.data.options);
                else this.video.queueVideo(video.id, rundown.data.options);
            },
            {
                accepts: {
                    fileTypes: ['video/*'],
                    match: file => {
                        if (!file.type.startsWith('video/')) return null;
                        return {
                            type: 'play-video',
                            title: stripExt(file.name),
                            data: {
                                clip: (file as unknown as { mediaId: string })
                                    .mediaId,
                            },
                        };
                    },
                },
                stop: () => this.video.stopVideo(),
            },
        );

        registerRundownAction(
            'namnskylt',
            async rundown => {
                const name = rundown.data.name;
                if (!name) {
                    reportWarn(
                        this,
                        'route',
                        'namnskylt rundown action: no name provided',
                    );
                    return null;
                }

                this.overlay.showNamnskylt(name);
            },
            { stop: () => this.overlay.hideNamnskylt() },
        );

        registerRundownAction('bars', async () => {
            this.overlay.toggleBars();
        });

        registerRundownAction('swish', async rundown => {
            const { number, labels, highlightIntro, fromBelow } = rundown.data;
            this.overlay.toggleSwish(number, labels, highlightIntro, fromBelow);
        });

        registerRundownAction('insamling', async rundown => {
            this.overlay.toggleInsamling(rundown.data);
        });

        registerRundownAction(
            'slides',
            async rundown => {
                const presentationId = rundown.data?.presentationId;
                if (typeof presentationId !== 'string' || !presentationId) {
                    this.logger.warn(
                        'slides rundown action: no presentationId on entry',
                    );
                    return;
                }

                await this.presentations.ready;
                if (!this.presentations.get(presentationId)) {
                    this.logger.warn(
                        `slides rundown action: presentation ${presentationId} not found`,
                    );
                    return;
                }

                // Single broadcast — the UI opens the run modal in response.
                // Playback itself is triggered by the UI when the operator clicks a slide.
                this.overlay.broadcastArmEvent(presentationId, rundown.id);
            },
            { stop: () => this.overlay.stopPlayback() },
        );
    }

    private rundownItemAt(type: string, index1: number): RundownItem | null {
        const id = this.activeRundown.get();
        // Only fall back to the first rundown when no selection has been made.
        // A stale id (rundown deleted) returns null rather than silently firing
        // against the wrong rundown.
        const rd = id ? this.api.getRundown(id) : this.api.getRundowns()[0];
        if (!rd) return null;
        const items = rd.items.filter(i => i.type === type);
        return items[index1 - 1] ?? null;
    }

    private registerCompanion() {
        const rgb = (r: number, g: number, b: number) =>
            (r << 16) | (g << 8) | b;

        const indexOpt = {
            type: 'number' as const,
            id: 'index',
            label: 'Index (1 = first)',
            default: 1,
            min: 1,
        };

        this.api.registerAction({
            id: 'lappis-clear-video-queue',
            name: 'Stop & clear video queue',
            handler: async () => this.video.stopVideo(true),
        });

        this.api.registerAction({
            id: 'lappis-rundown-video',
            name: 'Queue video from rundown',
            options: [indexOpt],
            handler: async opts => {
                const item = this.rundownItemAt(
                    'play-video',
                    opts.index as number,
                );
                if (!item) return;
                const video = this.api.getFileDatabase().get(item.data.clip);
                if (!video) return;
                this.video.queueVideo(video.id, item.data.options);
            },
        });

        const fmt = (s: number) => {
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return `${m}:${sec.toString().padStart(2, '0')}`;
        };

        const videoQueueFb = this.api.registerFeedback({
            id: 'lappis-video-queue-state',
            name: 'Video queue time left',
            description:
                'Red with total time remaining when a video is playing or queued.',
            type: 'advanced',
            evaluate: () => {
                const { active, remaining } = this.video.getQueueStatus();
                return {
                    text: active ? fmt(remaining) : '—',
                    ...(active ? { bgcolor: rgb(180, 0, 0) } : {}),
                };
            },
        });

        const videoFb = this.api.registerFeedback({
            id: 'lappis-rundown-video',
            name: 'Video from rundown',
            type: 'advanced',
            options: [indexOpt],
            evaluate: opts => {
                const item = this.rundownItemAt(
                    'play-video',
                    opts.index as number,
                );
                const doc =
                    item && this.api.getFileDatabase().get(item.data.clip);
                const png64 = (doc as any)?._attachments?.[
                    'thumb.png'
                ]?.data?.toString('base64');
                const info = this.video.getInformation();
                const isPlaying =
                    item && (info.current?.data as any)?.id === item.data.clip;
                const isQueued =
                    !isPlaying &&
                    item &&
                    info.queue.some(
                        q => (q.data as any)?.id === item.data.clip,
                    );
                return {
                    text: item?.title ?? '—',
                    ...(png64 ? { png64 } : {}),
                    ...(isPlaying
                        ? { bgcolor: rgb(180, 0, 0) }
                        : isQueued
                          ? { bgcolor: rgb(160, 130, 0) }
                          : {}),
                };
            },
        });

        this.api.registerAction({
            id: 'lappis-rundown-namnskylt',
            name: 'Show namnskylt from rundown',
            options: [indexOpt],
            handler: async opts => {
                const item = this.rundownItemAt(
                    'namnskylt',
                    opts.index as number,
                );
                if (!item?.data?.name) return;
                this.overlay.showNamnskylt(item.data.name);
            },
        });

        const namnskyltFb = this.api.registerFeedback({
            id: 'lappis-rundown-namnskylt',
            name: 'Namnskylt from rundown',
            type: 'advanced',
            options: [indexOpt],
            evaluate: opts => {
                const item = this.rundownItemAt(
                    'namnskylt',
                    opts.index as number,
                );
                const overlayState = this.overlay.getOverlayState();
                const isLive =
                    overlayState.namnskylt.on &&
                    overlayState.namnskylt.name === item?.data?.name;
                return {
                    text: item?.title ?? '—',
                    ...(isLive ? { bgcolor: rgb(0, 160, 0) } : {}),
                };
            },
        });

        this.api.registerFeedback({
            id: 'lappis-swish-state',
            name: 'Swish live',
            type: 'boolean',
            defaultStyle: { bgcolor: rgb(0, 160, 0) },
            evaluate: () => this.overlay.getOverlayState().swish.on,
        });

        const activeRundownFb = this.api.registerFeedback({
            id: 'lappis-active-rundown',
            name: 'Active rundown',
            description:
                'Shows the name of the rundown currently selected as the Companion source.',
            type: 'advanced',
            evaluate: () => {
                const id = this.activeRundown.get();
                const rd = id
                    ? this.api.getRundown(id)
                    : this.api.getRundowns()[0];
                return { text: rd?.name ?? '—' };
            },
        });

        this.companionPollInterval = setInterval(() => {
            videoQueueFb.invalidate();
            videoFb.invalidate();
            namnskyltFb.invalidate();
            activeRundownFb.invalidate();
            this.api.invalidateFeedback('lappis-swish-state');
        }, 2500);
    }

    public registerEffectGroups() {
        for (const side of MAIN_SIDES) {
            this.api.getEffectGroup(getGroup(side, GROUPS.BARS));
            this.api.getEffectGroup(getGroup(side, GROUPS.OVERLAY));
        }

        this.api.getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.VIDEO)); // video-out
        this.api.getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.OVERLAY)); // video-out
        this.api.getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.PRESENTATION)); // video-out slides
    }

    public registerRoutes() {
        const bgData = buildBackgroundData(__dirname);
        this.api.registerRoute('assets/background', async () => bgData, 'GET');
        this.api.registerRoute(
            'assets/media',
            async req => {
                const mediaId = (req.data as any)?.mediaId;
                if (!mediaId) {
                    reportWarn(
                        this,
                        'route',
                        'assets/media: request missing mediaId',
                    );
                    return null;
                }
                const doc = this.api.getFileDatabase().get(mediaId);
                if (!doc?.mediaPath) {
                    reportWarn(
                        this,
                        'route',
                        `assets/media: no mediaPath for "${mediaId}"`,
                    );
                    return null;
                }
                return readImageData(
                    doc.mediaPath,
                    this.getLogger().scope('assets'),
                );
            },
            'ACTION',
        );

        this.api.registerRoute(
            'bars',
            async () => {
                this.overlay.toggleBars();
            },
            'ACTION',
        );

        this.api.registerRoute(
            'swish',
            async req => {
                this.overlay.toggleSwish(
                    typeof req.data === 'object' && req.data['number'],
                );
            },
            'ACTION',
        );

        this.api.registerRoute(
            'insamling',
            async req => {
                if (!req.data || typeof req.data !== 'object') {
                    reportWarn(
                        this,
                        'route',
                        'insamling: invalid or missing request data',
                    );
                    return null;
                }

                const { now, goal } = req.data as any;
                this.overlay.toggleInsamling({ now, goal });
            },
            'ACTION',
        );

        this.api.registerRoute(
            'videos',
            async () => this.video.getInformation(),
            'GET',
        );
        this.api.registerRoute(
            'videos/:id',
            async req => this.video.removeItem(req.params.id),
            'DELETE',
        );

        this.api.registerRoute(
            'videos',
            async () => this.video.clearQueue(),
            'DELETE',
        );
        this.api.registerRoute(
            'video',
            async req =>
                this.video.stopVideo(
                    typeof req.data === 'object' && req.data['clear'],
                ),
            'DELETE',
        );

        this.api.registerRoute(
            'video/play',
            async req => {
                const { clip, options } = req.data as any;
                const video = this.api.getFileDatabase().get(clip);
                if (!video) {
                    reportWarn(
                        this,
                        'route',
                        `video/play: clip "${clip}" not found`,
                    );
                    return null;
                }
                this.video.playVideo(video.id, options);
            },
            'ACTION',
        );

        this.api.registerRoute(
            'namnskylt-presets',
            async () => {
                await this.namnskyltPresets.ready;
                return this.namnskyltPresets.get();
            },
            'GET',
        );

        this.api.registerRoute(
            'namnskylt-presets',
            async req => {
                await this.namnskyltPresets.ready;
                return this.namnskyltPresets.replace(req.data);
            },
            'UPDATE',
        );

        this.api.registerRoute(
            'namnskylt-presets/play',
            async req => {
                const name = (req.data as any)?.name;
                if (!name) return null;
                this.overlay.showNamnskylt(name);
            },
            'ACTION',
        );

        this.api.registerRoute(
            'rundowns',
            async () =>
                this.api.getRundowns().map(r => ({ id: r.id, name: r.name })),
            'GET',
        );

        this.api.registerRoute(
            'active-rundown',
            async () => {
                await this.activeRundown.ready;
                return { id: this.activeRundown.get() };
            },
            'GET',
        );

        this.api.registerRoute(
            'active-rundown',
            async req => {
                const id = (req.data as any)?.id ?? null;
                await this.activeRundown.set(id);
                this.api.broadcast('active-rundown', 'UPDATE', { id });
                this.api.invalidateFeedback('lappis-rundown-video');
                this.api.invalidateFeedback('lappis-rundown-namnskylt');
                this.api.invalidateFeedback('lappis-active-rundown');
                return { id };
            },
            'UPDATE',
        );

        this.api.registerRoute(
            'overlay-state',
            async () => this.overlay.getOverlayState(),
            'GET',
        );

        this.api.registerRoute(
            'slides',
            async () => this.overlay.getPresentationState(),
            'GET',
        );

        this.api.registerRoute(
            'bible',
            async req => {
                const lookup = req.data as VerseLookup;
                const [err, result] = noTry(() => getVerseSlides(lookup));
                if (err) {
                    this.logger.warn(
                        `Bible lookup failed: ${(err as any)?.message ?? err}`,
                    );
                    return {
                        error: (err as any)?.message ?? 'Bible lookup failed',
                    };
                }
                return result;
            },
            'ACTION',
        );

        this.api.registerRoute(
            'slides',
            async req => {
                if (!req.data || typeof req.data !== 'object') {
                    reportWarn(
                        this,
                        'route',
                        'slides action: missing or invalid request data',
                    );
                    return null;
                }

                const data = req.data as {
                    action: string;
                    presentationId?: string;
                    slideId?: string;
                    grabAttention?: boolean;
                };
                switch (data.action) {
                    case 'play': {
                        if (!data.presentationId || !data.slideId) {
                            this.logger.warn(
                                'slides play: missing presentationId or slideId',
                            );
                            return null;
                        }
                        await this.presentations.ready;
                        const presentation = this.presentations.get(
                            data.presentationId,
                        );
                        if (!presentation) {
                            this.logger.warn(
                                `slides play: presentation ${data.presentationId} not found`,
                            );
                            return null;
                        }
                        const slide = presentation.slides.find(
                            s => s.id === data.slideId,
                        );
                        if (!slide) {
                            this.logger.warn(
                                `slides play: slide ${data.slideId} not found`,
                            );
                            return null;
                        }
                        const grab = data.grabAttention ?? true;
                        if (slide.type === 'image') {
                            this.overlay.playSlide(
                                presentation.id,
                                slide.id,
                                { kind: 'image', mediaId: slide.mediaId },
                                grab,
                            );
                        } else {
                            this.overlay.playSlide(
                                presentation.id,
                                slide.id,
                                {
                                    kind: 'text',
                                    text: slide.text,
                                    reference:
                                        slide.type === 'bible'
                                            ? slide.reference
                                            : '',
                                    heading: slide.type === 'heading',
                                },
                                grab,
                            );
                        }
                        break;
                    }
                    case 'stop':
                        this.overlay.stopPlayback();
                        break;
                }

                return this.overlay.getPresentationState();
            },
            'ACTION',
        );

        // Diagnostics — returns the in-memory ring buffer of recent errors/warnings
        // for UI backfill when a fresh client connects.
        this.api.registerRoute(
            'diagnostics',
            async () => ({ events: getEvents() }),
            'GET',
        );

        // Presentations CRUD
        this.api.registerRoute(
            'presentations',
            async () => {
                await this.presentations.ready;
                return this.presentations.list();
            },
            'GET',
        );

        // Must be registered before presentations/:id GET to avoid the wildcard
        // capturing 'convert' as an id.
        this.api.registerRoute(
            'presentations/convert',
            async () => ({ enabled: isConversionEnabled() }),
            'GET',
        );

        this.api.registerRoute(
            'presentations/:id',
            async req => {
                await this.presentations.ready;
                return this.presentations.get(req.params.id);
            },
            'GET',
        );

        this.api.registerRoute(
            'presentations',
            async req => {
                await this.presentations.ready;
                const input =
                    req.data && typeof req.data === 'object'
                        ? (req.data as any)
                        : {};
                const created = await this.presentations.create(input);
                this.api.broadcast(
                    'presentations',
                    'UPDATE',
                    this.presentations.list(),
                );
                return created;
            },
            'ACTION',
        );

        this.api.registerRoute(
            'presentations/:id',
            async req => {
                await this.presentations.ready;
                const patch =
                    req.data && typeof req.data === 'object'
                        ? (req.data as any)
                        : {};
                const updated = await this.presentations.update(
                    req.params.id,
                    patch,
                );
                if (updated)
                    this.api.broadcast(
                        'presentations',
                        'UPDATE',
                        this.presentations.list(),
                    );
                return updated;
            },
            'UPDATE',
        );

        this.api.registerRoute(
            'presentations/:id',
            async req => {
                await this.presentations.ready;
                const ok = await this.presentations.remove(req.params.id);
                if (ok) {
                    // If the deleted presentation is currently playing, stop the overlay.
                    const state = this.overlay.getPresentationState();
                    if (
                        state.playing &&
                        state.presentationId === req.params.id
                    ) {
                        this.overlay.stopPlayback();
                    }
                    this.api.broadcast(
                        'presentations',
                        'UPDATE',
                        this.presentations.list(),
                    );
                }
                return ok;
            },
            'DELETE',
        );

        // PPTX conversion via CloudConvert — browser uploads/downloads directly;
        // backend only performs the key-protected job-create and status steps.
        this.api.registerRoute(
            'presentations/convert/create',
            async req => {
                const filename =
                    (req.data as any)?.filename ?? 'presentation.pptx';
                return createConversionJob(filename);
            },
            'ACTION',
        );

        this.api.registerRoute(
            'presentations/convert/status',
            async req => {
                const jobId = (req.data as any)?.jobId;
                if (!jobId)
                    return { status: 'error', message: 'Missing jobId' };
                return getConversionResult(jobId);
            },
            'ACTION',
        );
    }
}

function stripExt(name: string): string {
    return name.replace(/\.[^.]+$/, '');
}
