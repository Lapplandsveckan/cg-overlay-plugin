// All slides navigation goes through this helper so the absolute path stays
// in one place. Presentations live on their own top-level navbar page
// (UI_INJECTION_ZONE.NAVBAR_PAGE, keyed 'slides'), mounted by cg-manager at
// /ext/cg-overlay-plugin/slides. We use absolute URLs because relative ones
// don't resolve correctly from outside that page (rundown editor, bottom
// panel).

export const SLIDES_BASE = '/ext/lappis/slides';

export function slidesHomeUrl(): string {
    return SLIDES_BASE;
}

export function slidesEditorUrl(id: string, from?: string): string {
    const base = `${SLIDES_BASE}/${encodeURIComponent(id)}`;
    return from ? `${base}?from=${encodeURIComponent(from)}` : base;
}

/** Current path, for passing as `from` to slidesEditorUrl. */
export function currentPath(): string {
    return window.location.pathname + window.location.search;
}

/** Returns the `from` query param if it is a safe same-origin relative path. */
export function backTargetFromSearch(search: string): string | null {
    const raw = new URLSearchParams(search).get('from');
    // Must start with exactly one '/' and not be protocol-relative (//) or
    // backslash-bypass (/\) — some browsers normalise /\evil.com to //evil.com.
    if (raw?.[0] !== '/' || raw[1] === '/' || raw[1] === '\\') return null;
    return raw;
}
