import { useCallback, useEffect, useState } from 'react';

import { useSocket } from '@web-lib';

import { type BroadcastReq, useBroadcast } from '../hooks';
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

let backgroundCache: Promise<string | null> | null = null;
const fullImageCache = new Map<string, Promise<string | null>>();

export function useBackgroundImage(): string | null {
    const conn = useSocket();
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        backgroundCache ??= conn
            .rawRequest(`${ROOT}/assets/background`, 'GET', {})
            .then((res: any) => {
                const { data, mimeType } = res?.data ?? {};
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
                        const { data, mimeType } = res?.data ?? {};
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

        const refresh = () =>
            (conn as any).caspar
                .getMedia()
                .then((media: Map<string, any>) => {
                    const map: Record<string, string> = {};
                    for (const [mid, item] of media) {
                        const url = buildThumbnailUrl(item);
                        if (url) map[mid] = url;
                    }
                    setThumbnails(map);
                })
                .catch(console.error);

        refresh();
        (conn as any).caspar.on('media', refresh);
        return () => (conn as any).caspar.off('media', refresh);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mediaIds.join(',')]);

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

    const onUpdate = useCallback((req: BroadcastReq) => {
        if (Array.isArray(req.data)) setPresentations(req.data);
    }, []);
    useBroadcast(conn, 'plugin/lappis/presentations', 'UPDATE', onUpdate);

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
    const onUpdate = useCallback(() => {
        if (id) {
            getPresentation(conn, id)
                .then(setPresentation)
                .catch(console.error);
        }
    }, [conn, id]);
    useBroadcast(conn, 'plugin/lappis/presentations', 'UPDATE', onUpdate);

    return presentation;
}

export function usePlaybackState(): PlaybackState | null {
    const conn = useSocket();
    const [state, setState] = useState<PlaybackState | null>(null);

    useEffect(() => {
        getPlaybackState(conn).then(setState).catch(console.error);
    }, [conn]);

    const onUpdate = useCallback(
        (req: BroadcastReq) => setState(req.data ?? null),
        [],
    );
    useBroadcast(conn, 'plugin/lappis/slides', 'UPDATE', onUpdate);

    return state;
}

export function useArmEvents(handler: (event: ArmEvent) => void) {
    const conn = useSocket();
    const cb = useCallback(
        (req: BroadcastReq) => {
            if (req.data && typeof req.data === 'object') handler(req.data);
        },
        [handler],
    );
    useBroadcast(conn, 'plugin/lappis/slides-arm', 'UPDATE', cb);
}

export { buildThumbnailUrl };
