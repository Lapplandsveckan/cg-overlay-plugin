import {offCGEvent, onCGEvent} from '../../cg';

// state
// 0: hidden
// 1: shown

export function register(setState: (state: number) => void, setName: (name: string) => void) {
    const states = [
        () => setState(0),
        () => setState(1),
    ];

    const name = (params) => params.name && setName(params.name);
    onCGEvent('update', name);

    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);

    return () => {
        offCGEvent('update', name);

        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
    };
}


export {};