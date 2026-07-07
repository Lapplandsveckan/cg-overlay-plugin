import { EventEmitter } from 'events';
const events = new EventEmitter();

export type CGEvent = 'update' | 'play' | 'next' | 'stop';

// Last-value cache so listeners that attach after the event (e.g. due to
// slow React init under CEF load) still receive it on subscribe.
let lastPlayStop: 'play' | 'stop' | null = null;
let lastUpdate: unknown = null;

// hcId threaded from the backend through CG ADD/UPDATE options.
// Captured on every update; used when play fires to send paint acks back.
let currentHcId: string | null = null;

export function onCGEvent(event: CGEvent, callback: (...args: any[]) => void) {
    events.on(event, callback);
    // Replay the last known state to close any remaining listener-registration gap.
    if (event === 'play' && lastPlayStop === 'play') callback();
    else if (event === 'stop' && lastPlayStop === 'stop') callback();
    else if (event === 'update' && lastUpdate !== null) callback(lastUpdate);
}

export function offCGEvent(event: CGEvent, callback: (...args: any[]) => void) {
    events.off(event, callback);
}

// POST a healthcheck ack to the plugin's local template server.
// Fire-and-forget — must never throw or block rendering.
function postAck(hcId: string, phase: 'play' | 'painted') {
    fetch(`${location.origin}/_cg/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hcId, phase }),
    }).catch(() => {});
}

// Called by each template's register() after all onCGEvent subscriptions so
// the harness buffer (public/cg.js) flushes into already-attached listeners.
export function readyCG() {
    if (typeof window === 'undefined') return;

    const emit = (event: string, ...args: any[]) => {
        if (event === 'play') {
            lastPlayStop = 'play';
        } else if (event === 'stop') {
            lastPlayStop = 'stop';
            currentHcId = null; // reset so a stale id doesn't bleed into the next play
        } else if (event === 'update') {
            lastUpdate = args[0];
            // Track the latest hcId from backend options so we can ack after play.
            const incoming = (lastUpdate as any)?.hcId;
            if (typeof incoming === 'string') currentHcId = incoming;
        }
        events.emit(event, ...args);

        // After emitting play, post healthcheck acks back to the plugin server.
        if (event === 'play' && currentHcId) {
            const id = currentHcId;
            postAck(id, 'play');
            // Double-rAF: the first rAF schedules work before the next paint;
            // the second fires after the browser has actually composited that
            // frame — confirming the overlay visually rendered, not just
            // "GSAP was told to animate."
            requestAnimationFrame(() =>
                requestAnimationFrame(() => postAck(id, 'painted')),
            );
        }
    };

    window['__cg'](emit);

    window['update'] = params => {
        try {
            emit('update', JSON.parse(params));
        } catch {
            // intentionally empty
        }
    };

    window['play'] = () => emit('play');
    window['next'] = () => emit('next');
    window['stop'] = () => emit('stop');
}

export {};
