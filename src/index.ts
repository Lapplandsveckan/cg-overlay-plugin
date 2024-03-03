import path from 'path';
import {SwishEffect, SwishEffectOptions} from './effects/swish';
import {CasparPlugin, UI_INJECTION_ZONE} from '@lappis/cg-manager';
import {Templates} from './templates';
import {NamnskyltEffect, NamnskyltEffectOptions} from './effects/namnskylt';

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

        this.api.registerEffect(
            'namnskylt',
            (group, options) => new NamnskyltEffect(group, options as NamnskyltEffectOptions),
        );

        this.templates = new Templates(() => this.initialize());
        this.api.registerRoute('swish', async req => {
            this.toggleSwish();
        }, "ACTION");

        this.api.registerRoute('namnskylt', async req => {
            const data = req.getData();
            if (typeof data !== 'object') return null; // throw new WebError('Invalid request data', 400);

            const {name} = data as {name: string};
            this.showNamnskylt(name);
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

    private showNamnskylt(name: string) {
        const template = this.templates.getFilePath('namnskylt');
        const effect = this.api.createEffect('namnskylt', '1:overlay', { name, template });
        effect.activate().catch(err => {
            effect.dispose();
            this.logger.error('Failed to activate namnskylt effect');
            this.logger.error(err);
        });
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