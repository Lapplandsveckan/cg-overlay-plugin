import {offCGEvent, onCGEvent} from '../cg';

// state
// 0: hidden
// 1: shown
// 2: minimized

// do not play if state is 2 ???

export function register(setState: (state: number) => void, setNumber: (number: string) => void) {
    const states = [
        () => setState(0),
        () => setState(1),
        () => setState(2),
    ];

    const number = (params) => params.number && setNumber(params.number);
    onCGEvent('update', number);

    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);
    onCGEvent('next', states[2]);

    return () => {
        offCGEvent('update', number);

        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
        offCGEvent('next', states[2]);
    };
}


export {};