import { useCallback, useEffect, useState } from 'react';

import { Method, type MediaDoc, useBroadcast, useSocket } from '@web-lib';

import { casparMediaTopic, topic } from '../broadcast-topics';
import { buildThumbnailUrl } from '../thumbnail';
import {
    ROOT,
    getPlaybackState,
    getPresentation,
    listPresentations,
} from './slides-crud';
import {
    type ArmEvent,
    type Presentation,
    type PlaybackState,
} from './slides-types';

const presentationsTopic = topic<Presentation[]>(
    'plugin/lappis/presentations',
    Method.UPDATE,
);
const slidesTopic = topic<PlaybackState>('plugin/lappis/slides', Method.UPDATE);
const slidesArmTopic = topic<ArmEvent>(
    'plugin/lappis/slides-arm',
    Method.UPDATE,
);

let backgroundCache: Promise<string | null> | null = null;
const fullImageCache = new Map<string, Promise<string | null>>();

export function useBackgroundImage(): string | null {
    const conn = useSocket();
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        backgroundCache ??= conn
            .rawRequest(`${ROOT}/assets/background`, 'GET', {})
            .then((res: any) => {
                const { data, mimeType } = res ?? {};
                return data && mimeType
                    ? `data:${mimeType};base64,${data}`
                    : null;
            })
            .catch((e: any) => {
                console.error(e);
                backgroundCache = null;
                return null;
            });
        backgroundCache.then(setUrl);
    }, [conn]);
    return url;
}

export function useFullImage(mediaId: string | null): string | null {
    const conn = useSocket();
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!mediaId) {
            setUrl(null);
            return;
        }
        let cancelled = false;
        if (!fullImageCache.has(mediaId)) {
            fullImageCache.set(
                mediaId,
                conn
                    .rawRequest(`${ROOT}/assets/media`, 'ACTION', { mediaId })
                    .then((res: any) => {
                        const { data, mimeType } = res ?? {};
                        return data && mimeType
                            ? `data:${mimeType};base64,${data}`
                            : null;
                    })
                    .catch((e: any) => {
                        console.error(e);
                        fullImageCache.delete(mediaId);
                        return null;
                    }),
            );
        }
        fullImageCache.get(mediaId)!.then(u => {
            if (!cancelled) setUrl(u);
        });
        return () => {
            cancelled = true;
        };
    }, [conn, mediaId]);
    return url;
}

export function useImageThumbnails(mediaIds: string[]): Record<string, string> {
    const conn = useSocket();
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    useEffect(() => {
        if (mediaIds.length === 0) {
            setThumbnails({});
            return;
        }

        conn.caspar
            .getAllMedia()
            .then((media: MediaDoc[]) => {
                const map: Record<string, string> = {};
                for (const item of media) {
                    const url = buildThumbnailUrl(item);
                    if (url) map[item.id] = url;
                }
                setThumbnails(map);
            })
            .catch(console.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaIds.join(','), conn]);

    useBroadcast(casparMediaTopic, ({ key, value }) => {
        if (!mediaIds.includes(key)) return;
        setThumbnails(prev => {
            const url = value && buildThumbnailUrl(value);
            if (!url) {
                if (!(key in prev)) return prev;
                const { [key]: _removed, ...rest } = prev;
                return rest;
            }
            return { ...prev, [key]: url };
        });
    });

    return thumbnails;
}

export function usePresentations(): {
    presentations: Presentation[] | null;
    refresh: () => void;
} {
    const conn = useSocket();
    const [presentations, setPresentations] = useState<Presentation[] | null>(
        null,
    );

    const refresh = useCallback(() => {
        listPresentations(conn).then(setPresentations).catch(console.error);
    }, [conn]);

    useEffect(() => {
        listPresentations(conn).then(setPresentations).catch(console.error);
    }, [conn]);

    useBroadcast(presentationsTopic, data => {
        if (Array.isArray(data)) setPresentations(data);
    });

    return { presentations, refresh };
}

export function usePresentation(
    id: string | null,
): Presentation | null | undefined {
    // undefined = loading, null = not found
    const conn = useSocket();
    const [presentation, setPresentation] = useState<
        Presentation | null | undefined
    >(undefined);

    useEffect(() => {
        if (!id) {
            setPresentation(null);
            return;
        }
        setPresentation(undefined);
        getPresentation(conn, id)
            .then(setPresentation)
            .catch(err => {
                console.error(err);
                setPresentation(null);
            });
    }, [id, conn]);

    // Refresh on broadcast of any presentation change
    useBroadcast(presentationsTopic, () => {
        if (id) {
            getPresentation(conn, id)
                .then(setPresentation)
                .catch(console.error);
        }
    });

    return presentation;
}

export function usePlaybackState(): PlaybackState | null {
    const conn = useSocket();
    const [state, setState] = useState<PlaybackState | null>(null);

    useEffect(() => {
        getPlaybackState(conn).then(setState).catch(console.error);
    }, [conn]);

    useBroadcast(slidesTopic, data => setState(data ?? null));

    return state;
}

export function useArmEvents(handler: (event: ArmEvent) => void) {
    useBroadcast(slidesArmTopic, data => {
        if (data && typeof data === 'object') handler(data);
    });
}

export { buildThumbnailUrl };
