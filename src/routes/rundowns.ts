import { type LappisOverlayPlugin } from '../index';

export function registerRundownRoutes(plugin: LappisOverlayPlugin) {
    plugin.getApi().registerRoute(
        'rundowns',
        async () =>
            plugin
                .getApi()
                .getRundowns()
                .map(r => ({ id: r.id, name: r.name })),
        'GET',
    );

    plugin.getApi().registerRoute(
        'active-rundown',
        async () => {
            await plugin.activeRundown.ready;
            return { id: plugin.activeRundown.get() };
        },
        'GET',
    );

    plugin.getApi().registerRoute(
        'active-rundown',
        async req => {
            const id = (req.data as any)?.id ?? null;
            await plugin.activeRundown.set(id);
            plugin.getApi().broadcast('active-rundown', 'UPDATE', { id });
            plugin.getApi().invalidateFeedback('lappis-rundown-video');
            plugin.getApi().invalidateFeedback('lappis-rundown-namnskylt');
            plugin.getApi().invalidateFeedback('lappis-active-rundown');
            return { id };
        },
        'UPDATE',
    );
}
