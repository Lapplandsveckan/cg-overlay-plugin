import { noTry } from 'no-try';
import { getVerseSlides, type VerseLookup } from '../bible';
import { reportWarn } from '../diagnostics';
import { type LappisOverlayPlugin } from '../index';

export function registerSlideRoutes(plugin: LappisOverlayPlugin) {
    plugin
        .getApi()
        .registerRoute(
            'slides',
            async () => plugin.overlay.getPresentationState(),
            'GET',
        );

    plugin.getApi().registerRoute(
        'bible',
        async req => {
            const lookup = req.data as VerseLookup;
            const [err, result] = noTry(() => getVerseSlides(lookup));
            if (err) {
                plugin
                    .getLoggerRef()
                    .warn(
                        `Bible lookup failed: ${(err as any)?.message ?? err}`,
                    );
                return {
                    error: (err as any)?.message ?? 'Bible lookup failed',
                };
            }
            return result;
        },
        'ACTION',
    );

    plugin.getApi().registerRoute(
        'slides',
        async req => {
            if (!req.data || typeof req.data !== 'object') {
                reportWarn(
                    plugin,
                    'route',
                    'slides action: missing or invalid request data',
                );
                return null;
            }

            const data = req.data as {
                action: string;
                presentationId?: string;
                slideId?: string;
                grabAttention?: boolean;
            };
            switch (data.action) {
                case 'play': {
                    if (!data.presentationId || !data.slideId) {
                        plugin
                            .getLoggerRef()
                            .warn(
                                'slides play: missing presentationId or slideId',
                            );
                        return null;
                    }
                    await plugin.presentations.ready;
                    const presentation = plugin.presentations.get(
                        data.presentationId,
                    );
                    if (!presentation) {
                        plugin
                            .getLoggerRef()
                            .warn(
                                `slides play: presentation ${data.presentationId} not found`,
                            );
                        return null;
                    }
                    const slide = presentation.slides.find(
                        s => s.id === data.slideId,
                    );
                    if (!slide) {
                        plugin
                            .getLoggerRef()
                            .warn(
                                `slides play: slide ${data.slideId} not found`,
                            );
                        return null;
                    }
                    const grab = data.grabAttention ?? true;
                    if (slide.type === 'image') {
                        plugin.overlay.playSlide(
                            presentation.id,
                            slide.id,
                            { kind: 'image', mediaId: slide.mediaId },
                            grab,
                        );
                    } else if (slide.type === 'video') {
                        plugin.overlay.playSlide(
                            presentation.id,
                            slide.id,
                            {
                                kind: 'video',
                                mediaId: slide.mediaId,
                                inPoint: slide.inPoint,
                                outPoint: slide.outPoint,
                                volume: slide.volume,
                            },
                            grab,
                        );
                    } else {
                        plugin.overlay.playSlide(
                            presentation.id,
                            slide.id,
                            {
                                kind: 'text',
                                text: slide.text,
                                reference:
                                    slide.type === 'bible'
                                        ? slide.reference
                                        : '',
                                heading: slide.type === 'heading',
                            },
                            grab,
                        );
                    }
                    break;
                }
                case 'stop':
                    plugin.overlay.stopPlayback();
                    break;
                case 'pause':
                    plugin.overlay.pausePresentationVideo();
                    break;
                case 'resume':
                    plugin.overlay.resumePresentationVideo();
                    break;
            }

            return plugin.overlay.getPresentationState();
        },
        'ACTION',
    );
}
