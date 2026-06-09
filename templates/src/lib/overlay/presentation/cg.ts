import {offCGEvent, onCGEvent} from '../../cg';

// state
// 0: hidden
// 1: shown

type StringHandler = (value: string) => void;
type NumberHandler = (value: number) => void;

export function register(setState: NumberHandler, setText: StringHandler, setReference: StringHandler) {
    const states = [
        () => setState(0),
        () => setState(1),
    ];

    const update = (params) => {
        if (typeof params?.text === 'string') setText(params.text);
        if (typeof params?.reference === 'string') setReference(params.reference);
    };
    onCGEvent('update', update);

    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);

    return () => {
        offCGEvent('update', update);

        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
    };
}

export {};
