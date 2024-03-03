import { EventEmitter } from 'events';
const events = new EventEmitter();

export type CGEvent = 'update' | 'play' | 'next' | 'stop';

export function onCGEvent(event: CGEvent, callback: (...args: any[]) => void) {
    events.on(event, callback);
}

export function offCGEvent(event: CGEvent, callback: (...args: any[]) => void) {
    events.off(event, callback);
}

if (typeof window !== 'undefined') {
    window['__cg'](events.emit);

    window['update'] = (params) => {
        try {
            events.emit('update', JSON.parse(params));
        } catch (e) {}
    };

    window['play'] = () => events.emit('play');
    window['next'] = () => events.emit('next');
    window['stop'] = () => events.emit('stop');
}
export {};