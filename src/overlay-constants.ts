export const CHANNELS = {
    LEFT: 1,
    RIGHT: 2,
    VIDEO: 3,
    WALL: 4,
};

export const MAIN_SIDES = [CHANNELS.LEFT, CHANNELS.RIGHT] as const;

export const GROUPS = {
    BARS: 'bars',
    OVERLAY: 'overlay',
    VIDEO: 'video',
    PRESENTATION: 'presentation',
};

export const getGroup = (channel: number, group: string) =>
    `${channel}:${group}`;

// Time for both LEFT and RIGHT templates to finish loading (CG ADD) before we
// fire CG PLAY, so the two halves animate in together instead of offset.
export const LOAD_DELAY = 200;
// Delay before cutting ATEM to the slides channel on first play, giving
// CasparCG time to render the new slide before it goes to air.
export const ATEM_CUT_DELAY = 300;
// How long to hold the video transition cover before cutting ATEM to the source.
export const VIDEO_TRANSITION_CUT_DELAY = 3000;
// Delay for fast-sweep transitions: cut while the screen is covered.
// The slide-in animation is 700ms, but starts after CG round-trip latency;
// 1000ms gives a comfortable margin while still landing before the exit begins.
export const FAST_TRANSITION_CUT_DELAY = 1000;
// Recycle idle (off-air, not recently used) templates after this duration.
export const IDLE_RECYCLE_MS = 10 * 60_000;
// Overlap window before clearing the previous image slide: new effect activates
// first (on a higher layer), then the old one is cleared after this delay.
export const SLIDE_SWAP_DEACTIVATE_DELAY = 80;

// Crop transform for the channel-3 -> wall route mirror during video
// playback: a centered slice of the source frame sized so it renders at the
// content's native aspect ratio on the (wider, non-16:9) wall canvas.
const CONTENT_WIDTH = 1920;
const CONTENT_HEIGHT = 1080;
// Physical wall canvas the mirror is drawn onto (two projectors, overlapping).
const WALL_WIDTH = 3552;
const WALL_HEIGHT = 1080;
const WALL_VIDEO_CROP_WIDTH =
    CONTENT_WIDTH / CONTENT_HEIGHT / (WALL_WIDTH / WALL_HEIGHT);
export const WALL_VIDEO_TRANSFORM: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
] = [
    0,
    0,
    1,
    1,
    0.5 - WALL_VIDEO_CROP_WIDTH / 2,
    0,
    0.5 + WALL_VIDEO_CROP_WIDTH / 2,
    1,
];

export const IDLE_SWEEP_INTERVAL_MS = 60_000;
// Max auto-replay attempts per template before giving up and requiring manual
// retrigger. Prevents a reload loop when a template is persistently broken.
export const MAX_RECOVERY = 2;

export const delay = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms));
