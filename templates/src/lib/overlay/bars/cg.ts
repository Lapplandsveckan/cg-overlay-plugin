import {offCGEvent, onCGEvent} from '../../cg';

// state
// 0: hidden
// 1: shown

export function register(setState: (state: number) => void) {
    const states = [
        () => setState(0),
        () => setState(1),
    ];

    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);

    return () => {
        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
    };
}


export {};