// All slides navigation goes through this helper so the absolute path stays
// in one place. cg-manager mounts plugins at /plugins/<plugin-name>/<sub>
// via a Next.js [[...slug]] catch-all, so the full path is forwarded to the
// plugin page component. We use absolute URLs because relative ones don't
// resolve correctly from outside the plugin page (rundown editor, bottom
// panel) — and from inside the plugin page they only resolve correctly when
// the current URL is /plugins/lappis (one level up), not deeper.

export const PLUGIN_BASE = '/plugins/lappis';
export const SLIDES_BASE = `${PLUGIN_BASE}/slides`;

export function pluginHomeUrl(): string {
    return PLUGIN_BASE;
}

export function slidesEditorUrl(id: string, from?: string): string {
    const base = `${SLIDES_BASE}/${encodeURIComponent(id)}`;
    return from ? `${base}?from=${encodeURIComponent(from)}` : base;
}

/** Returns the `from` query param if it is a safe same-origin relative path. */
export function backTargetFromSearch(search: string): string | null {
    const raw = new URLSearchParams(search).get('from');
    // Must start with exactly one '/' and not be protocol-relative (//) or
    // backslash-bypass (/\) — some browsers normalise /\evil.com to //evil.com.
    if (!raw || raw[0] !== '/' || raw[1] === '/' || raw[1] === '\\') return null;
    return raw;
}
