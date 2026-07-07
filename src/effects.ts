import { type VideoEffectOptions } from './effects/misc/video';
import { type RouteEffectOptions } from './effects/misc/route';
import { type CaptionStreamConfig } from './captionkit';
import { BarsOverlayEffect } from './effects/overlay/bars';
import { SwishOverlayEffect } from './effects/overlay/swish';
import { NamnskyltOverlayEffect } from './effects/overlay/namnskylt';
import { CaptionOverlayEffect } from './effects/overlay/caption';
import { VideoTransitionOverlayEffect } from './effects/overlay/videotransition';
import { InsamlingOverlayEffect } from './effects/overlay/insamling';
import { PresentationOverlayEffect } from './effects/overlay/presentation';
import { VideoEffect } from './effects/misc/video';
import { RouteEffect } from './effects/misc/route';
import { type LappisOverlayPlugin } from './index';
import { CHANNELS, GROUPS, MAIN_SIDES, getGroup } from './overlay-constants';

interface EffectDef {
    name: string;
    ctor: any;
    templatePath: string;
    scope: string;
    needsHealth: boolean;
}

const EFFECTS: EffectDef[] = [
    {
        name: 'overlay-bars',
        ctor: BarsOverlayEffect,
        templatePath: 'overlay/bars',
        scope: 'effect:bars',
        needsHealth: true,
    },
    {
        name: 'overlay-swish',
        ctor: SwishOverlayEffect,
        templatePath: 'overlay/swish',
        scope: 'effect:swish',
        needsHealth: true,
    },
    {
        name: 'overlay-namnskylt',
        ctor: NamnskyltOverlayEffect,
        templatePath: 'overlay/namnskylt',
        scope: 'effect:namnskylt',
        needsHealth: true,
    },
    {
        name: 'overlay-caption',
        ctor: CaptionOverlayEffect,
        templatePath: 'overlay/caption',
        scope: 'effect:caption',
        needsHealth: false,
    },
    {
        name: 'overlay-videotransition',
        ctor: VideoTransitionOverlayEffect,
        templatePath: 'overlay/videotransition',
        scope: 'effect:videotransition',
        needsHealth: true,
    },
    {
        name: 'overlay-insamling',
        ctor: InsamlingOverlayEffect,
        templatePath: 'overlay/insamling',
        scope: 'effect:insamling',
        needsHealth: true,
    },
    {
        name: 'overlay-presentation',
        ctor: PresentationOverlayEffect,
        templatePath: 'overlay/presentation',
        scope: 'effect:presentation',
        needsHealth: true,
    },
    {
        name: 'wall-swish',
        ctor: SwishOverlayEffect,
        templatePath: 'wall/swish',
        scope: 'effect:wall-swish',
        needsHealth: true,
    },
    {
        name: 'wall-namnskylt',
        ctor: NamnskyltOverlayEffect,
        templatePath: 'wall/namnskylt',
        scope: 'effect:wall-namnskylt',
        needsHealth: true,
    },
    {
        name: 'wall-videotransition',
        ctor: VideoTransitionOverlayEffect,
        templatePath: 'wall/videotransition',
        scope: 'effect:wall-videotransition',
        needsHealth: true,
    },
];

export function registerEffects(plugin: LappisOverlayPlugin) {
    for (const def of EFFECTS) {
        const ctor = def.ctor;
        const templatePath = def.templatePath;
        const scope = def.scope;
        const needsHealth = def.needsHealth;

        if (def.name === 'overlay-caption') {
            plugin
                .getApi()
                .registerEffect(
                    def.name,
                    (group, options) =>
                        new ctor(
                            group,
                            plugin.templates.getFilePath(templatePath),
                            options as CaptionStreamConfig,
                            plugin.getLogger().scope(scope),
                        ),
                );
        } else {
            plugin
                .getApi()
                .registerEffect(
                    def.name,
                    (group, options) =>
                        new ctor(
                            group,
                            options,
                            plugin.templates.getFilePath(templatePath),
                            plugin.getLogger().scope(scope),
                            ...(needsHealth ? [plugin.health] : []),
                        ),
                );
        }
    }

    plugin.getApi().registerEffect(
        'lappis-video',
        (group, options) =>
            new VideoEffect(group, {
                ...(options as VideoEffectOptions),
                logger: plugin.getLogger().scope('effect:video'),
            }),
    );

    plugin.getApi().registerEffect(
        'lappis-route',
        (group, options) =>
            new RouteEffect(group, {
                ...(options as RouteEffectOptions),
                logger: plugin.getLogger().scope('effect:route'),
            }),
    );
}

export function registerEffectGroups(plugin: LappisOverlayPlugin) {
    for (const side of MAIN_SIDES) {
        plugin.getApi().getEffectGroup(getGroup(side, GROUPS.BARS));
        plugin.getApi().getEffectGroup(getGroup(side, GROUPS.OVERLAY));
    }

    plugin.getApi().getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.VIDEO));
    plugin.getApi().getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.OVERLAY));
    plugin
        .getApi()
        .getEffectGroup(getGroup(CHANNELS.VIDEO, GROUPS.PRESENTATION));

    plugin.getApi().getEffectGroup(getGroup(CHANNELS.WALL, GROUPS.VIDEO));
    plugin
        .getApi()
        .getEffectGroup(getGroup(CHANNELS.WALL, GROUPS.PRESENTATION));
    plugin.getApi().getEffectGroup(getGroup(CHANNELS.WALL, GROUPS.OVERLAY));
}
