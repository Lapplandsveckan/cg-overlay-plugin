// Channel fps must be resolved at runtime via AMCP INFO — cg-manager exposes no fps/config.
export const DEFAULT_CHANNEL_FPS = 50;

// Video-mode tokens (e.g. "1080p5000", "1080i5000") encode rate * 100 (or * 200 if interlaced).
export function parseChannelFps(lines: string[]): number | null {
    const text = lines.join('\n');

    const rateTag = text.match(
        /<(?:framerate|fps)>([\d.]+)<\/(?:framerate|fps)>/i,
    );
    if (rateTag) {
        const fps = Number(rateTag[1]);
        if (Number.isFinite(fps) && fps > 0) return fps;
    }

    const mode = text.match(/(\d{3,4})([ip])(\d{2,4})/i);
    if (mode) {
        const rate = Number(mode[3]);
        if (Number.isFinite(rate) && rate > 0) {
            const interlaced = mode[2].toLowerCase() === 'i';
            return rate / (interlaced ? 200 : 100);
        }
    }

    return null;
}
