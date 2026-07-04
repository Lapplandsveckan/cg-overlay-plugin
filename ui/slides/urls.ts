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

export function slidesEditorUrl(id: string): string {
    return `${SLIDES_BASE}/${encodeURIComponent(id)}`;
}
