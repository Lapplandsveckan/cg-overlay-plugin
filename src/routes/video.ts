import { reportWarn } from '../diagnostics';
import { type LappisOverlayPlugin } from '../index';

export function registerVideoRoutes(plugin: LappisOverlayPlugin) {
    plugin
        .getApi()
        .registerRoute(
            'videos',
            async () => plugin.video.getInformation(),
            'GET',
        );
    plugin
        .getApi()
        .registerRoute(
            'videos/:id',
            async req => plugin.video.removeItem(req.params.id),
            'DELETE',
        );

    plugin
        .getApi()
        .registerRoute(
            'videos',
            async () => plugin.video.clearQueue(),
            'DELETE',
        );
    plugin
        .getApi()
        .registerRoute(
            'video',
            async req =>
                plugin.video.stopVideo(
                    typeof req.data === 'object' && req.data['clear'],
                ),
            'DELETE',
        );

    plugin.getApi().registerRoute(
        'video/play',
        async req => {
            const { clip, options } = req.data as any;
            const video = plugin.getApi().getFileDatabase().get(clip);
            if (!video) {
                reportWarn(
                    plugin,
                    'route',
                    `video/play: clip "${clip}" not found`,
                );
                return null;
            }
            plugin.video.playVideo(video.id, options);
        },
        'ACTION',
    );
}
