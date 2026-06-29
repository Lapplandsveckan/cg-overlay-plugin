import { EventEmitter } from 'events';
const events = new EventEmitter();

export type CGEvent = 'update' | 'play' | 'next' | 'stop';

// Last-value cache so listeners that attach after the event (e.g. due to
// slow React init under CEF load) still receive it on subscribe.
let lastPlayStop: 'play' | 'stop' | null = null;
let lastUpdate: unknown = null;

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

// Called by each template's register() after all onCGEvent subscriptions so
// the harness buffer (public/cg.js) flushes into already-attached listeners.
export function readyCG() {
    if (typeof window === 'undefined') return;

    const emit = (event: string, ...args: any[]) => {
        if (event === 'play') lastPlayStop = 'play';
        else if (event === 'stop') lastPlayStop = 'stop';
        else if (event === 'update') lastUpdate = args[0];
        events.emit(event, ...args);
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
