import {offCGEvent, onCGEvent} from '../../cg';

// state
// 0: hidden
// 1: shown

export function register(
    setState: (state: number) => void,
    setNumber: (number: string) => void,
    setLabels: (labels: string) => void,
) {
    const states = [
        () => setState(0),
        () => setState(1),
    ];

    const number = (params) => (params.number && setNumber(params.number), params.labels && setLabels(params.labels));
    onCGEvent('update', number);

    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);

    return () => {
        offCGEvent('update', number);

        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
    };
}


export {};
