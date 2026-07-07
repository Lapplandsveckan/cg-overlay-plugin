import { buildBackgroundData, readImageData } from '../assets';
import { reportWarn } from '../diagnostics';
import { type LappisOverlayPlugin } from '../index';

export function registerAssetRoutes(plugin: LappisOverlayPlugin) {
    const bgData = buildBackgroundData(__dirname);
    plugin
        .getApi()
        .registerRoute('assets/background', async () => bgData, 'GET');

    plugin.getApi().registerRoute(
        'assets/media',
        async req => {
            const mediaId = (req.data as any)?.mediaId;
            if (!mediaId) {
                reportWarn(
                    plugin,
                    'route',
                    'assets/media: request missing mediaId',
                );
                return null;
            }
            const doc = plugin.getApi().getFileDatabase().get(mediaId);
            if (!doc?.mediaPath) {
                reportWarn(
                    plugin,
                    'route',
                    `assets/media: no mediaPath for "${mediaId}"`,
                );
                return null;
            }
            return readImageData(
                doc.mediaPath,
                plugin.getLogger().scope('assets'),
            );
        },
        'ACTION',
    );
}
