import {offCGEvent, onCGEvent} from '../cg';

// state
// 0: hidden
// 1: shown
// 2: minimized

// do not play if state is 2 ???

export function register(setState: (state: number) => void, setName: (name: string) => void) {
    const states = [
        () => setState(0),
        () => setState(1),
        () => setState(2),
    ];

    const name = (params) => params.name && setName(params.name);
    onCGEvent('update', name);

    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);
    onCGEvent('next', states[2]);

    return () => {
        offCGEvent('update', name);

        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
        offCGEvent('next', states[2]);
    };
}


export {};