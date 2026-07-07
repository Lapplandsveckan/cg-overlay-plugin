import { reportWarn } from '../diagnostics';
import { type LappisOverlayPlugin } from '../index';
import { asObject } from './utils';

export function registerOverlayEffectRoutes(plugin: LappisOverlayPlugin) {
    plugin.getApi().registerRoute(
        'bars',
        async req => {
            if (typeof req.data === 'object' && req.data?.['action'] === 'stop')
                return plugin.overlay.stopBars();
            plugin.overlay.toggleBars();
        },
        'ACTION',
    );

    plugin.getApi().registerRoute(
        'swish',
        async req => {
            plugin.overlay.toggleSwish(
                typeof req.data === 'object' && req.data['number'],
            );
        },
        'ACTION',
    );

    plugin.getApi().registerRoute(
        'insamling',
        async req => {
            if (!req.data || typeof req.data !== 'object') {
                reportWarn(
                    plugin,
                    'route',
                    'insamling: invalid or missing request data',
                );
                return null;
            }

            const { now, goal } = req.data as any;
            plugin.overlay.toggleInsamling({ now, goal });
        },
        'ACTION',
    );

    plugin.getApi().registerRoute(
        'namnskylt-presets',
        async () => {
            await plugin.namnskyltPresets.ready;
            return plugin.namnskyltPresets.get();
        },
        'GET',
    );

    plugin.getApi().registerRoute(
        'namnskylt-presets',
        async req => {
            await plugin.namnskyltPresets.ready;
            return plugin.namnskyltPresets.replace(req.data);
        },
        'UPDATE',
    );

    plugin.getApi().registerRoute(
        'namnskylt-presets/play',
        async req => {
            const name = (req.data as any)?.name;
            if (!name) return null;
            plugin.overlay.showNamnskylt(name);
        },
        'ACTION',
    );

    plugin.getApi().registerRoute(
        'captionkit/settings',
        async () => {
            await plugin.captionkit.ready;
            return plugin.captionkit.get();
        },
        'GET',
    );
    plugin.getApi().registerRoute(
        'captionkit/settings',
        async req => {
            const patch = asObject(req.data);
            await plugin.captionkit.ready;
            const settings = await plugin.captionkit.set(patch);
            plugin.overlay.rebuildCaption();
            plugin
                .getApi()
                .broadcast('captionkit-settings', 'UPDATE', settings);
            return settings;
        },
        'UPDATE',
    );
    plugin
        .getApi()
        .registerRoute(
            'captionkit/clear',
            async () => plugin.overlay.clearCaption(),
            'ACTION',
        );

    plugin
        .getApi()
        .registerRoute(
            'overlay-state',
            async () => plugin.overlay.getOverlayState(),
            'GET',
        );
}
