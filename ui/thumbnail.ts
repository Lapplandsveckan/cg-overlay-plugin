// Safe base64 encoding for large byte arrays.
// Spreading the full array as function arguments (String.fromCharCode(...bigArray))
// overflows the call stack for large thumbnails — chunk it instead.
const CHUNK = 0x2000;

export function bytesToBase64(bytes: number[]): string {
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
