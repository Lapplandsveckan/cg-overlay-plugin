import path from 'path';
import {BasicChannel, CasparPlugin, UI_INJECTION_ZONE} from '@lappis/cg-manager';
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

const CHANNELS = {
    MAIN: 1,
    WALL: 2,
    VIDEO: 3,
}

export default class LappisOverlayPlugin extends CasparPlugin {
    private swish: { overlay: SwishOverlayEffect, wall: SwishWallEffect } = null;
    private swishState = -1;

    private bars: BarsOverlayEffect = null;
    private barsState = 0;

    private insamling: InsamlingOverlayEffect = null;
    private insamlingState = 0;

    private videoTransition: VideoTransitionWallEffect = null;
    private videoTransitionState = 0;

    private templates: Templates;
    private video: VideoManager;

    public getLogger() {
        return this.logger;
    }

    public static get pluginName() {
        return 'overlay';
    }

    protected onEnable() {
        this.templates = new Templates(() => this.initialize());
        this.video = new VideoManager(this);

        // TODO: sanitize options input, verify that the options are valid
        // TODO: not hardcode channel
        this.api.getEffectGroup(`${CHANNELS.MAIN}:video`); // overlay video
        this.api.getEffectGroup(`${CHANNELS.MAIN}:overlay`); // overlay
        this.api.getEffectGroup(`${CHANNELS.WALL}:overlay`); // wall
        this.api.getEffectGroup(`${CHANNELS.WALL}:video`); // wall video
        this.api.getEffectGroup(`${CHANNELS.VIDEO}:video`); // video-out

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

        // These are debug api routes, could be removed at a later date
        this.api.registerRoute('swish', async req => {
            const data = req.getData();

            let number: string;
            if (typeof data === 'object') number = (data as {number: string}).number;

            this.toggleSwish();
        }, 'ACTION');

        this.api.registerRoute('namnskylt', async req => {
            const data = req.getData();
            if (typeof data !== 'object') return null; // throw new WebError('Invalid request data', 400);

            const {name} = data as {name: string};
            this.showNamnskylt(name);
        }, 'ACTION');

        this.api.registerRoute('bars', async req => {
            this.toggleBars();
        }, 'ACTION');

        this.api.registerRoute('insamling', async req => {
            const data = req.getData();
            let options : InsamlingOverlayEffectOptions;
            if (typeof data === 'object') {
                const {goal, now} = data as {goal: number, now: number};
                options = {goal, now};
            }

            this.toggleInsamling(options);
        }, 'ACTION');

        this.api.registerUI(UI_INJECTION_ZONE.PLUGIN_PAGE, path.join(__dirname, 'ui', 'overlay'));

        const getInjectionZone = (zone: UI_INJECTION_ZONE, key: string) => `${zone}.${key}` as UI_INJECTION_ZONE;
        this.api.registerUI(getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_ITEM, 'queue-video'), path.join(__dirname, 'ui', 'queue-video', 'Item'));
        this.api.registerUI(getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_EDITOR, 'queue-video'), path.join(__dirname, 'ui', 'queue-video', 'Editor'));

        this.api.registerRundownAction('queue-video', async (rundown) => {
            const video = this.api.getFileDatabase().get(rundown.data.clip);
            if (!video) return null; // throw new WebError('Clip not found', 404);

            this.video.queueVideo({id: video.id});
        });

        this.api.registerRundownAction('play-video', async (rundown) => {
            const video = this.api.getFileDatabase().get(rundown.data.clip);
            if (!video) return null; // throw new WebError('Clip not found', 404);

            this.video.playVideo({id: video.id});
        });
    }

    protected onDisable() {
        if (this.swish) {
            this.swish.overlay.dispose();
            this.swish.wall.dispose();
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

        if (this.videoTransition) {
            this.videoTransition.dispose();
            this.videoTransition = null;
        }

        this.templates.dispose();
        this.templates = null;
    }

    private initialize() {
        this.swish = {
            overlay: this.api.createEffect('overlay-swish', '1:overlay', {
                number: '070 797 78 20',
            }) as SwishOverlayEffect,
            wall: this.api.createEffect('wall-swish', '2:overlay', {
                number: '070 797 78 20',
            }) as SwishWallEffect,
        };

        this.bars = this.api.createEffect('overlay-bars', '1:overlay', {}) as BarsOverlayEffect; // TODO: special group so it is underneeth all overlays
        this.insamling = this.api.createEffect('overlay-insamling', '3:overlay', {}) as InsamlingOverlayEffect; // TODO: special group so it is underneeth all overlays
    }

    private videoSession: null | {
        main: RouteEffect,
        wall: RouteEffect,
        stop: () => void,
    } = null;
    public startVideoSession() {
        if (this.videoSession) return Promise.reject(new Error('Video session already active'));
        const mainEffect = this.api.createEffect('lappis-route', `${CHANNELS.MAIN}:video`, {
            source: new BasicChannel(CHANNELS.VIDEO),
            disposeOnStop: true,
        }) as RouteEffect;

        const wallEffect = this.api.createEffect('lappis-route', `${CHANNELS.WALL}:video`, {
            source: new BasicChannel(CHANNELS.VIDEO),
            disposeOnStop: true,
            transform: [0, 0, 1, 1, 0.25, 0, 0.75, 1],
        }) as RouteEffect;

        this.videoSession = {main: mainEffect, wall: wallEffect, stop: () => null};
        if (this.videoTransitionState !== 1) this.toggleVideoTransition();

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.videoSession.stop = () => null;
                resolve();

                mainEffect.activate();
                wallEffect.activate();
            }, 3000);

            this.videoSession.stop = () => {
                clearTimeout(timeout);
                reject(new Error('Video session stopped'));
            }
        });
    }

    public stopVideoSession() {
        if (!this.videoSession) return this.logger.warn('No video session to stop');
        if (this.videoTransitionState !== 0) this.toggleVideoTransition();

        this.videoSession.main.deactivate();
        this.videoSession.wall.deactivate();

        this.videoSession.stop();
        this.videoSession = null;
    }

    public playVideo(video: string) {
        const media = this.api.getFileDatabase().get(video);
        if (!media) throw new Error('Video not found');

        return this.api.createEffect('lappis-video', `${CHANNELS.VIDEO}:video`, {
            media,
            holdLastFrame: true,
            disposeOnStop: true,
        }) as VideoEffect;
    }

    private showNamnskylt(name: string) {
        const overlay = this.api.createEffect('overlay-namnskylt', '1:overlay', { name });
        const wall = this.api.createEffect('wall-namnskylt', '2:overlay', { name });

        Promise
            .all([wall.activate(), overlay.activate()])
            .catch(err => {
                this.logger.error('Failed to activate namnskylt effect');
                this.logger.error(err);
            });
    }

    private toggleVideoTransition() {
        if (this.videoTransitionState === 1) {
            this.videoTransitionState = 0;
            this.videoTransition
                .deactivate()
                .catch(err => {
                    this.logger.error('Failed to deactivate videotransition effect');
                    this.logger.error(err);
                });

            this.videoTransition = null;
            return;
        }

        this.videoTransitionState = 1;

        const overlay = this.api.createEffect('overlay-videotransition', '1:overlay', {});
        const wall = this.api.createEffect('wall-videotransition', '2:overlay', {});

        Promise
            .all([wall.activate(), overlay.activate()])
            .catch(err => {
                this.logger.error('Failed to activate videotransition effect');
                this.logger.error(err);
            });

        this.videoTransition = wall as VideoTransitionWallEffect;
    }

    private toggleSwish(number?: string) {
        this.swishState = (this.swishState + 1) % 3;

        if (number) {
            this.swish.overlay.update({ number });
            this.swish.wall.update({ number });
        }

        switch (this.swishState) {
            case 0:
                Promise
                    .all([this.swish.overlay.activate(), this.swish.wall.activate()])
                    .catch(err => {
                        this.logger.error('Failed to activate swish effect');
                        this.logger.error(err);
                    });
                break;
            case 1:
                this.swish.overlay
                    .minimize()
                    .catch(err => {
                        this.logger.error('Failed to minimize swish effect');
                        this.logger.error(err);
                    });
                break;
            case 2:
                Promise
                    .all([this.swish.overlay.deactivate(), this.swish.wall.deactivate()])
                    .catch(err => {
                        this.logger.error('Failed to deactivate swish effect');
                        this.logger.error(err);
                    });
                break;
        }
    }

    private toggleBars() {
        this.barsState = 1 - this.barsState;

        switch (this.barsState) {
            case 0:
                this.bars
                    .deactivate()
                    .catch(err => {
                        this.logger.error('Failed to deactivate bars effect');
                        this.logger.error(err);
                    });
                break;
            case 1:
                this.bars
                    .activate()
                    .catch(err => {
                        this.logger.error('Failed to activate bars effect');
                        this.logger.error(err);
                    });
                break;
        }
    }

    private toggleInsamling(options?: InsamlingOverlayEffectOptions) {
        this.insamlingState = 1 - this.insamlingState;

        if (options)
            this.insamling.update(options);

        switch (this.insamlingState) {
            case 0:
                this.insamling
                    .deactivate()
                    .catch(err => {
                        this.logger.error('Failed to deactivate insamling effect');
                        this.logger.error(err);
                    });
                break;
            case 1:
                this.insamling
                    .activate()
                    .catch(err => {
                        this.logger.error('Failed to activate insamling effect');
                        this.logger.error(err);
                    });
                break;
        }
    }
}