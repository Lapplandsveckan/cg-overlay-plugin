import {offCGEvent, onCGEvent} from '../../cg';

// state
// 0: hidden
// 1: shown
// 2: sides not shown

export function register(setState: (state: number) => void) {
    const states = [
        () => setState(0),
        () => setState(1),
        () => setState(2),
    ];

    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);
    onCGEvent('next', states[2]);

    return () => {
        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
        offCGEvent('next', states[2]);
    };
}


export {};