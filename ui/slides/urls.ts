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

export function slidesEditorUrl(id: string): string {
    return `${SLIDES_BASE}/${encodeURIComponent(id)}`;
}
