import { isConversionEnabled } from '../cloudconvert';
import { reportWarn } from '../diagnostics';
import { type LappisOverlayPlugin } from '../index';
import { asObject } from './utils';

export function registerPresentationRoutes(plugin: LappisOverlayPlugin) {
    plugin.getApi().registerRoute(
        'presentations',
        async () => {
            await plugin.presentations.ready;
            return plugin.presentations.list();
        },
        'GET',
    );

    plugin
        .getApi()
        .registerRoute(
            'presentations/convert',
            async () => ({ enabled: isConversionEnabled() }),
            'GET',
        );

    plugin.getApi().registerRoute(
        'presentations/:id',
        async req => {
            await plugin.presentations.ready;
            return plugin.presentations.get(req.params.id);
        },
        'GET',
    );

    plugin.getApi().registerRoute(
        'presentations',
        async req => {
            await plugin.presentations.ready;
            const input = asObject(req.data);
            const created = await plugin.presentations.create(input);
            plugin
                .getApi()
                .broadcast(
                    'presentations',
                    'UPDATE',
                    plugin.presentations.list(),
                );
            return created;
        },
        'ACTION',
    );

    plugin.getApi().registerRoute(
        'presentations/:id',
        async req => {
            await plugin.presentations.ready;
            const patch = asObject(req.data);
            const updated = await plugin.presentations.update(
                req.params.id,
                patch,
            );
            if (updated)
                plugin
                    .getApi()
                    .broadcast(
                        'presentations',
                        'UPDATE',
                        plugin.presentations.list(),
                    );
            return updated;
        },
        'UPDATE',
    );

    plugin.getApi().registerRoute(
        'presentations/:id',
        async req => {
            await plugin.presentations.ready;
            const ok = await plugin.presentations.remove(req.params.id);
            if (ok) {
                const state = plugin.overlay.getPresentationState();
                if (state.playing && state.presentationId === req.params.id) {
                    plugin.overlay.stopPlayback();
                }
                plugin
                    .getApi()
                    .broadcast(
                        'presentations',
                        'UPDATE',
                        plugin.presentations.list(),
                    );
            }
            return ok;
        },
        'DELETE',
    );

    plugin.getApi().registerRoute(
        'presentations/import',
        async req => {
            const { filename, title } = (req.data as any) ?? {};
            if (!filename || !title) {
                reportWarn(
                    plugin,
                    'route',
                    'presentations/import: missing filename/title',
                );
                return { status: 'error', error: 'Missing parameters' };
            }
            return plugin.presentationImports.start({ filename, title });
        },
        'ACTION',
    );

    plugin
        .getApi()
        .registerRoute(
            'presentation-imports',
            async () => plugin.presentationImports.list(),
            'GET',
        );

    plugin
        .getApi()
        .registerRoute(
            'presentation-imports/:id',
            async req => plugin.presentationImports.get(req.params.id),
            'GET',
        );
}
