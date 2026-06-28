import { useCallback, useEffect, useState } from 'react';

import { useSocket } from '@web-lib';

import { type BroadcastReq, useBroadcast } from '../hooks';

// ---------- Thumbnail helpers ----------

function bytesToBase64(bytes: number[]): string {
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK)
        binary += String.fromCharCode.apply(null, bytes.slice(i, i + CHUNK));
    return btoa(binary);
}

export function buildThumbnailUrl(clip: any): string | null {
    const thumb = clip?._attachments?.['thumb.png'];
    if (!thumb) return null;
    return `data:${thumb.content_type};base64,${bytesToBase64(thumb.data.data)}`;
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

export interface BibleSlide {
    type: 'bible';
    id: string;
    text: string;
    reference: string;
    translation: string;
    book: string;
    chapter: number;
    verse: number;
}

export interface TextSlide {
    type: 'text';
    id: string;
    text: string;
}

export interface HeadingSlide {
    type: 'heading';
    id: string;
    text: string;
}

export interface ImageSlide {
    type: 'image';
    id: string;
    mediaId: string;
}

export type Slide = BibleSlide | TextSlide | HeadingSlide | ImageSlide;

export interface Presentation {
    id: string;
    title: string;
    slides: Slide[];
    createdAt: number;
    updatedAt: number;
}

export interface PlaybackState {
    playing: boolean;
    presentationId: string | null;
    slideId: string | null;
}

export interface ArmEvent {
    presentationId: string;
    rundownId: string | null;
    ts: number;
}

/** Returns the reference string for a slide, or '' for non-bible slides. */
export function slideRef(slide: Slide): string {
    return slide.type === 'bible' ? slide.reference : '';
}

/** Returns the display text for a slide, or '' for image slides. */
export function slideText(slide: Slide): string {
    return slide.type === 'image' ? '' : slide.text;
}

/** Short label for a slide: its reference for bible slides, 'Image' for image slides, 'Text' otherwise. */
export function slideLabel(slide: Slide): string {
    if (slide.type === 'bible') return slide.reference;
    if (slide.type === 'image') return 'Image';
    if (slide.type === 'heading') return 'Heading';
    return 'Text';
}

const ROOT = '/api/plugin/lappis';

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

// ---------- CRUD ----------

export function listPresentations(conn: any): Promise<Presentation[]> {
    return conn
        .rawRequest(`${ROOT}/presentations`, 'GET', {})
        .then((res: any) => (Array.isArray(res?.data) ? res.data : []));
}

export function getPresentation(
    conn: any,
    id: string,
): Promise<Presentation | null> {
    return conn
        .rawRequest(`${ROOT}/presentations/${id}`, 'GET', {})
        .then((res: any) => res?.data ?? null);
}

export function createPresentation(
    conn: any,
    input: Partial<Pick<Presentation, 'title' | 'slides'>>,
): Promise<Presentation> {
    return conn
        .rawRequest(`${ROOT}/presentations`, 'ACTION', input)
        .then((res: any) => res?.data);
}

export function updatePresentation(
    conn: any,
    id: string,
    patch: Partial<Pick<Presentation, 'title' | 'slides'>>,
): Promise<Presentation | null> {
    return conn
        .rawRequest(`${ROOT}/presentations/${id}`, 'UPDATE', patch)
        .then((res: any) => res?.data ?? null);
}

export function deletePresentation(conn: any, id: string): Promise<boolean> {
    return conn
        .rawRequest(`${ROOT}/presentations/${id}`, 'DELETE', null)
        .then((res: any) => !!res?.data);
}

// ---------- Playback ----------

export function getPlaybackState(conn: any): Promise<PlaybackState> {
    return conn.rawRequest(`${ROOT}/slides`, 'GET', {}).then(
        (res: any) =>
            res?.data ?? {
                playing: false,
                presentationId: null,
                slideId: null,
            },
    );
}

export function playSlide(
    conn: any,
    presentationId: string,
    slideId: string,
    grabAttention = true,
): Promise<PlaybackState | null> {
    return conn
        .rawRequest(`${ROOT}/slides`, 'ACTION', {
            action: 'play',
            presentationId,
            slideId,
            grabAttention,
        })
        .then((res: any) => res?.data ?? null);
}

export interface BibleLookup {
    translation: string;
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd: number;
    merge: boolean;
    inlineNumbers: boolean;
}

export interface FetchedVerse {
    text: string;
    reference: string;
    verse: number;
}

export function fetchBibleSlides(
    conn: any,
    lookup: BibleLookup,
): Promise<FetchedVerse[]> {
    return conn
        .rawRequest(`${ROOT}/bible`, 'ACTION', lookup)
        .then((res: any) => {
            if (res?.data?.error) throw new Error(res.data.error);
            return Array.isArray(res?.data) ? res.data : [];
        });
}

export function stopPlayback(conn: any): Promise<PlaybackState | null> {
    return conn
        .rawRequest(`${ROOT}/slides`, 'ACTION', { action: 'stop' })
        .then((res: any) => res?.data ?? null);
}

// ---------- Hooks ----------

export function usePresentations(): {
    presentations: Presentation[] | null;
    refresh: () => void;
} {
    const conn = useSocket();
    const [presentations, setPresentations] = useState<Presentation[] | null>(
        null,
    );

    const refresh = () => {
        listPresentations(conn).then(setPresentations).catch(console.error);
    };

    useEffect(() => {
        listPresentations(conn).then(setPresentations).catch(console.error);
    }, []);

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
    }, [id]);

    // Refresh on broadcast of any presentation change
    const onUpdate = useCallback(() => {
        if (id)
            getPresentation(conn, id)
                .then(setPresentation)
                .catch(console.error);
    }, [conn, id]);
    useBroadcast(conn, 'plugin/lappis/presentations', 'UPDATE', onUpdate);

    return presentation;
}

export function usePlaybackState(): PlaybackState | null {
    const conn = useSocket();
    const [state, setState] = useState<PlaybackState | null>(null);

    useEffect(() => {
        getPlaybackState(conn).then(setState).catch(console.error);
    }, []);

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
