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

export default class VideoPlugin extends CasparPlugin {
    private swish: { overlay: SwishOverlayEffect, wall: SwishWallEffect } = null;
    private swishState = -1;

    private bars: BarsOverlayEffect = null;
    private barsState = 0;

    private templates: Templates;

    public static get pluginName() {
        return 'overlay';
    }

    protected onEnable() {
        this.templates = new Templates(() => this.initialize());

        // TODO: sanitize options input, verify that the options are valid
        this.api.getEffectGroup('1:overlay'); // overlay, TODO: not hardcode channel
        this.api.getEffectGroup('2:overlay'); // wall, TODO: not hardcode channel

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

        // These are debug api routes, could be removed at a later date
        this.api.registerRoute('swish', async req => {
            this.toggleSwish();
        }, "ACTION");

        this.api.registerRoute('namnskylt', async req => {
            const data = req.getData();
            if (typeof data !== 'object') return null; // throw new WebError('Invalid request data', 400);

            const {name} = data as {name: string};
            this.showNamnskylt(name);
        }, "ACTION");

        this.api.registerRoute('videotransition', async req => {
            this.showVideoTransition();
        }, "ACTION");

        this.api.registerUI(UI_INJECTION_ZONE.EFFECT_CREATOR, path.join(__dirname, 'ui', 'overlay'));
    }

    protected onDisable() {
        if (this.swish) {
            this.swish.overlay.dispose();
            this.swish.wall.dispose();
            this.swish = null;
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

    private showVideoTransition() {
        // TODO: do something with the wall video transition, it does not go away by itself

        const overlay = this.api.createEffect('overlay-videotransition', '1:overlay', {});
        const wall = this.api.createEffect('wall-videotransition', '2:overlay', {});

        Promise
            .all([wall.activate(), overlay.activate()])
            .catch(err => {
                this.logger.error('Failed to activate videotransition effect');
                this.logger.error(err);
            });
    }

    private toggleSwish() {
        this.swishState = (this.swishState + 1) % 3;

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

        switch (this.swishState) {
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
}