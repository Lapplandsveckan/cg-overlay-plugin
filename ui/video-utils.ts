// All values here are in seconds; ms only exists inside normalizeVideoPayload.

export interface VideoOptions {
    skipIntro?: boolean;
    fast?: boolean;
    loop?: boolean;
    playNow?: boolean;

    inPoint?: number;
    outPoint?: number;
    volume?: number;
    fadeIn?: number;
    fadeOut?: number;

    clipDuration?: number;
}

export const fullDurationOf = (clip: any): number =>
    Number(clip?.mediainfo?.format?.duration) || 0;

// Fallback until the backend-resolved `channelFps` arrives on the `videos` payload.
export const DEFAULT_FPS = 50;

// e.g. "1:23'04" (m:ss'ff)
export function formatFrameTimecode(
    seconds: number,
    fps = DEFAULT_FPS,
): string {
    const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const totalFrames = Math.round(safeSeconds * fps);
    const wholeSeconds = Math.floor(totalFrames / fps);
    const frames = totalFrames % fps;

    const minutes = Math.floor(wholeSeconds / 60);
    const secs = wholeSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}'${frames
        .toString()
        .padStart(2, '0')}`;
}

export function parseFrameTimecode(
    input: string,
    fps = DEFAULT_FPS,
): number | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const timecode = trimmed.match(/^(\d+):(\d{1,2})(?:'(\d{1,2}))?$/);
    if (timecode) {
        const [, minutes, secs, frames] = timecode;
        return Number(minutes) * 60 + Number(secs) + Number(frames ?? 0) / fps;
    }

    const asSeconds = Number(trimmed);
    return Number.isFinite(asSeconds) ? asSeconds : null;
}

export function effectiveDuration(full: number, o?: VideoOptions): number {
    if (!full) return 0;

    const inPoint = o?.inPoint ?? 0;
    const outPoint = Math.min(o?.outPoint ?? full, full);
    return Math.max(0, outPoint - inPoint);
}

export function isTrimmed(o: VideoOptions | undefined, full: number): boolean {
    const startsLate = (o?.inPoint ?? 0) > 0;
    const endsEarly =
        full > 0 && o?.outPoint !== undefined && o.outPoint < full;
    return startsLate || endsEarly;
}

export const hasFade = (o?: VideoOptions): boolean =>
    (o?.fadeIn ?? 0) > 0 || (o?.fadeOut ?? 0) > 0;

export interface Progress {
    active: boolean;
    elapsed: number;
    timeLeft: number;
    percent: number;
}

export function playbackProgress(
    elapsedSec: number,
    durationSec: number,
    opts: { loop?: boolean; active?: boolean } = {},
): Progress {
    const active = !!opts.active && durationSec > 0;
    if (!active) {
        return {
            active,
            elapsed: elapsedSec,
            timeLeft: durationSec,
            percent: 0,
        };
    }

    // A looping clip's elapsed time wraps to the current lap.
    const elapsed = opts.loop ? elapsedSec % durationSec : elapsedSec;
    const rawPercent = (elapsed / durationSec) * 100;
    const percent = Math.min(100, Math.max(0, rawPercent));
    const timeLeft = opts.loop ? 0 : Math.max(0, durationSec - elapsed);

    return { active, elapsed, timeLeft, percent };
}

export interface NormalizedItem {
    id: string;
    clipId: string | null;
    clip: any;
    title: string;
    options: VideoOptions;
    durationSec: number;
}

export interface NormalizedCurrent extends NormalizedItem {
    elapsedSec: number;
    loop: boolean;
}

export interface NormalizedVideo {
    current: NormalizedCurrent | null;
    queue: NormalizedItem[];
    channelFps: number;
}

function normalizeQueueItem(item: any): NormalizedItem {
    const clip = item?.data;
    const options: VideoOptions = item?.options ?? {};
    const precomputedDuration = options.clipDuration;
    const durationSec =
        precomputedDuration ?? effectiveDuration(fullDurationOf(clip), options);

    return {
        id: item?.id,
        clipId: clip?.id ?? null,
        clip,
        title: clip?.id,
        options,
        durationSec,
    };
}

export function normalizeVideoPayload(data: any): NormalizedVideo {
    const queue = ((data?.queue ?? []) as any[]).map(normalizeQueueItem);
    const channelFps = data?.channelFps ?? DEFAULT_FPS;
    if (!data?.current) return { current: null, queue, channelFps };

    const base = normalizeQueueItem(data.current);

    // Live metadata (ms) is authoritative once playing; else fall back to queue seconds.
    const metadata = data.current.metadata;
    const liveDurationMs = metadata?.clipDuration;
    const durationSec =
        typeof liveDurationMs === 'number'
            ? liveDurationMs / 1000
            : base.durationSec;
    const elapsedMs = metadata?.playDuration ?? 0;

    return {
        current: {
            ...base,
            durationSec,
            elapsedSec: elapsedMs / 1000,
            loop: metadata?.loop ?? false,
        },
        queue,
        channelFps,
    };
}
