import { type Presentation, type PlaybackState } from './slides-types';

export const ROOT = '/api/plugin/lappis';

export function listPresentations(conn: any): Promise<Presentation[]> {
    return conn
        .rawRequest(`${ROOT}/presentations`, 'GET', {})
        .then((res: any) => (Array.isArray(res) ? res : []));
}

export function getPresentation(
    conn: any,
    id: string,
): Promise<Presentation | null> {
    return conn
        .rawRequest(`${ROOT}/presentations/${id}`, 'GET', {})
        .then((res: any) => res ?? null);
}

export function createPresentation(
    conn: any,
    input: Partial<Pick<Presentation, 'title' | 'slides'>>,
): Promise<Presentation> {
    return conn.rawRequest(`${ROOT}/presentations`, 'ACTION', input);
}

export function updatePresentation(
    conn: any,
    id: string,
    patch: Partial<Pick<Presentation, 'title' | 'slides'>>,
): Promise<Presentation | null> {
    return conn
        .rawRequest(`${ROOT}/presentations/${id}`, 'UPDATE', patch)
        .then((res: any) => res ?? null);
}

export function deletePresentation(conn: any, id: string): Promise<boolean> {
    return conn
        .rawRequest(`${ROOT}/presentations/${id}`, 'DELETE', null)
        .then((res: any) => !!res);
}

export function duplicatePresentation(
    conn: any,
    id: string,
): Promise<Presentation | null> {
    return getPresentation(conn, id).then(original => {
        if (!original) return null;
        return createPresentation(conn, {
            title: `${original.title} (copy)`,
            slides: original.slides,
        });
    });
}

export function getPlaybackState(conn: any): Promise<PlaybackState> {
    return conn.rawRequest(`${ROOT}/slides`, 'GET', {}).then(
        (res: any) =>
            res ?? {
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
        .then((res: any) => res ?? null);
}

export interface BibleLookup {
    translation: string;
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd: number;
    wholeChapter?: boolean;
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
            if (res?.error) throw new Error(res.error);
            return Array.isArray(res) ? res : [];
        });
}

export function stopPlayback(conn: any): Promise<PlaybackState | null> {
    return conn
        .rawRequest(`${ROOT}/slides`, 'ACTION', { action: 'stop' })
        .then((res: any) => res ?? null);
}

export function pausePlayback(conn: any): Promise<PlaybackState | null> {
    return conn
        .rawRequest(`${ROOT}/slides`, 'ACTION', { action: 'pause' })
        .then((res: any) => res ?? null);
}

export function resumePlayback(conn: any): Promise<PlaybackState | null> {
    return conn
        .rawRequest(`${ROOT}/slides`, 'ACTION', { action: 'resume' })
        .then((res: any) => res ?? null);
}
