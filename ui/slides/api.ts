import {useEffect, useState} from 'react';

// @ts-ignore
import {useSocket} from '@web-lib';

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

export type Slide = BibleSlide | TextSlide;

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

/** Short label for a slide: its reference for bible slides, 'Text' otherwise. */
export function slideLabel(slide: Slide): string {
    return slide.type === 'bible' ? slide.reference : 'Text';
}

const ROOT = '/api/plugin/lappis';

let backgroundCache: Promise<string | null> | null = null;

export function useBackgroundImage(): string | null {
    const conn = useSocket();
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        backgroundCache ??= conn.rawRequest(`${ROOT}/assets/background`, 'GET', {})
            .then((res: any) => {
                const {data, mimeType} = res?.data ?? {};
                return data && mimeType ? `data:${mimeType};base64,${data}` : null;
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

// ---------- CRUD ----------

export function listPresentations(conn: any): Promise<Presentation[]> {
    return conn.rawRequest(`${ROOT}/presentations`, 'GET', {})
        .then((res: any) => Array.isArray(res?.data) ? res.data : []);
}

export function getPresentation(conn: any, id: string): Promise<Presentation | null> {
    return conn.rawRequest(`${ROOT}/presentations/${id}`, 'GET', {})
        .then((res: any) => res?.data ?? null);
}

export function createPresentation(conn: any, input: Partial<Pick<Presentation, 'title' | 'slides'>>): Promise<Presentation> {
    return conn.rawRequest(`${ROOT}/presentations`, 'ACTION', input)
        .then((res: any) => res?.data);
}

export function updatePresentation(
    conn: any,
    id: string,
    patch: Partial<Pick<Presentation, 'title' | 'slides'>>,
): Promise<Presentation | null> {
    return conn.rawRequest(`${ROOT}/presentations/${id}`, 'UPDATE', patch)
        .then((res: any) => res?.data ?? null);
}

export function deletePresentation(conn: any, id: string): Promise<boolean> {
    return conn.rawRequest(`${ROOT}/presentations/${id}`, 'DELETE', null)
        .then((res: any) => !!res?.data);
}

// ---------- Playback ----------

export function getPlaybackState(conn: any): Promise<PlaybackState> {
    return conn.rawRequest(`${ROOT}/slides`, 'GET', {})
        .then((res: any) => res?.data ?? {playing: false, presentationId: null, slideId: null});
}

export function playSlide(conn: any, presentationId: string, slideId: string): Promise<PlaybackState | null> {
    return conn.rawRequest(`${ROOT}/slides`, 'ACTION', {action: 'play', presentationId, slideId})
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

export function fetchBibleSlides(conn: any, lookup: BibleLookup): Promise<FetchedVerse[]> {
    return conn.rawRequest(`${ROOT}/bible`, 'ACTION', lookup)
        .then((res: any) => {
            if (res?.data?.error) throw new Error(res.data.error);
            return Array.isArray(res?.data) ? res.data : [];
        });
}

export function stopPlayback(conn: any): Promise<PlaybackState | null> {
    return conn.rawRequest(`${ROOT}/slides`, 'ACTION', {action: 'stop'})
        .then((res: any) => res?.data ?? null);
}

// ---------- Hooks ----------

export function usePresentations(): {presentations: Presentation[] | null, refresh: () => void} {
    const conn = useSocket();
    const [presentations, setPresentations] = useState<Presentation[] | null>(null);

    const refresh = () => {
        listPresentations(conn).then(setPresentations).catch(console.error);
    };

    useEffect(() => {
        listPresentations(conn).then(setPresentations).catch(console.error);

        const listener = {
            path: 'plugin/lappis/presentations',
            method: 'UPDATE',
            handler: (req: any) => {
                if (Array.isArray(req.data)) setPresentations(req.data);
            },
        };
        conn.routes.register(listener);
        return () => conn.routes.unregister(listener);
    }, []);

    return {presentations, refresh};
}

export function usePresentation(id: string | null): Presentation | null | undefined {
    // undefined = loading, null = not found
    const conn = useSocket();
    const [presentation, setPresentation] = useState<Presentation | null | undefined>(undefined);

    useEffect(() => {
        if (!id) {
            setPresentation(null);
            return;
        }
        setPresentation(undefined);
        getPresentation(conn, id).then(setPresentation).catch(err => {
            console.error(err);
            setPresentation(null);
        });

        // Refresh on broadcast of any presentation change
        const listener = {
            path: 'plugin/lappis/presentations',
            method: 'UPDATE',
            handler: () => {
                getPresentation(conn, id).then(setPresentation).catch(console.error);
            },
        };
        conn.routes.register(listener);
        return () => conn.routes.unregister(listener);
    }, [id]);

    return presentation;
}

export function usePlaybackState(): PlaybackState | null {
    const conn = useSocket();
    const [state, setState] = useState<PlaybackState | null>(null);

    useEffect(() => {
        getPlaybackState(conn).then(setState).catch(console.error);

        const listener = {
            path: 'plugin/lappis/slides',
            method: 'UPDATE',
            handler: (req: any) => setState(req.data ?? null),
        };
        conn.routes.register(listener);
        return () => conn.routes.unregister(listener);
    }, []);

    return state;
}

export function useArmEvents(handler: (event: ArmEvent) => void) {
    const conn = useSocket();

    useEffect(() => {
        const listener = {
            path: 'plugin/lappis/slides-arm',
            method: 'UPDATE',
            handler: (req: any) => {
                if (req.data && typeof req.data === 'object') handler(req.data);
            },
        };
        conn.routes.register(listener);
        return () => conn.routes.unregister(listener);
    }, [handler]);
}
