import path from 'path';
import {SwishEffect, SwishEffectOptions} from './effects/swish';
import {CasparPlugin, UI_INJECTION_ZONE} from '@lappis/cg-manager';
import {Templates} from './templates';

export default class VideoPlugin extends CasparPlugin {
    private effect: SwishEffect;
    private swishState = -1;
    private templates: Templates;

    public static get pluginName() {
        return 'overlay';
    }

    protected onEnable() {
        // TODO: sanitize options input, verify that the options are valid
        this.api.getEffectGroup('1:overlay'); // TODO: not hardcode channel

        this.api.registerEffect(
            'swish',
            (group, options) => new SwishEffect(group, options as SwishEffectOptions),
        );

        this.templates = new Templates(() => this.initialize());
        this.api.registerRoute('swish', async req => {
            this.toggleSwish();
        }, "ACTION");

        this.api.registerUI(UI_INJECTION_ZONE.EFFECT_CREATOR, path.join(__dirname, 'ui', 'overlay'));
    }

    protected onDisable() {
        if (this.effect) {
            this.effect.dispose();
            this.effect = null;
        }

        this.templates.dispose();
        this.templates = null;
    }

    private initialize() {
        const template = this.templates.getFilePath('swish');
        this.effect = this.api.createEffect('swish', '1:overlay', {
            template,
            number: '070 797 78 20',
        }) as SwishEffect;
    }

    private toggleSwish() {
        this.swishState = (this.swishState + 1) % 3;

        switch (this.swishState) {
            case 0:
                this.effect.activate().catch(err => {
                    this.effect = null;
                    this.logger.error('Failed to activate swish effect');
                    this.logger.error(err);
                });
                break;
            case 1:
                this.effect.minimize().catch(err => {
                    this.effect = null;
                    this.logger.error('Failed to minimize swish effect');
                    this.logger.error(err);
                });
                break;
            case 2:
                this.effect.deactivate().catch(err => {
                    this.effect = null;
                    this.logger.error('Failed to deactivate swish effect');
                    this.logger.error(err);
                });
                break;
        }
    }
}