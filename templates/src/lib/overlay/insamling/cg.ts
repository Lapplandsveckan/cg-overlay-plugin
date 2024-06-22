import {offCGEvent, onCGEvent} from '../../cg';

// state
// 0: hidden
// 1: shown

type Handler = (value: number) => void
export function register(setState: Handler, setGoal: Handler, setNow: Handler) {
    const states = [
        () => setState(0),
        () => setState(1),
    ];

    const numbers = (params) => {
        if (params.goal) setGoal(params.goal);
        if (params.now) setNow(params.now);
    };
    onCGEvent('update', numbers);

    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);

    return () => {
        offCGEvent('update', numbers);

        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
    };
}


export {};