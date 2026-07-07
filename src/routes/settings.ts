import { type LappisOverlayPlugin } from '../index';
import { asObject } from './utils';

export function registerSettingsRoutes(plugin: LappisOverlayPlugin) {
    plugin.getApi().registerRoute(
        'settings',
        async () => {
            await plugin.settings.ready;
            return plugin.settings.get();
        },
        'GET',
    );
    plugin.getApi().registerRoute(
        'settings',
        async req => {
            const patch = asObject(req.data);
            await plugin.settings.ready;
            const settings = await plugin.settings.set(patch);
            plugin.getApi().broadcast('settings', 'UPDATE', settings);
            plugin.getApi().invalidateFeedback('lappis-projectors-program');
            return settings;
        },
        'UPDATE',
    );
}
