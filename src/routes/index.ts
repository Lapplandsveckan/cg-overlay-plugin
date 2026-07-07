import { type LappisOverlayPlugin } from '../index';
import { registerAssetRoutes } from './assets';
import { registerOverlayEffectRoutes } from './overlay-effects';
import { registerPresentationRoutes } from './presentations';
import { registerRundownRoutes } from './rundowns';
import { registerSettingsRoutes } from './settings';
import { registerSlideRoutes } from './slides';
import { registerVideoRoutes } from './video';
import { getEvents } from '../diagnostics';

export function registerRoutes(plugin: LappisOverlayPlugin) {
    registerAssetRoutes(plugin);
    registerOverlayEffectRoutes(plugin);
    registerVideoRoutes(plugin);
    registerSettingsRoutes(plugin);
    registerRundownRoutes(plugin);
    registerSlideRoutes(plugin);
    registerPresentationRoutes(plugin);

    plugin
        .getApi()
        .registerRoute(
            'diagnostics',
            async () => ({ events: getEvents() }),
            'GET',
        );
}
