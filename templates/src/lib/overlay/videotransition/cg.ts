import { offCGEvent, onCGEvent } from '../../cg';

// state
// 0: hidden
// 1: shown

export function register(
    setState: (state: number) => void,
    setDirection: (direction: string) => void,
) {
    const states = [() => setState(0), () => setState(1)];

    // direction arrives as CG add data on load, and can be refreshed via update
    const update = (params: unknown) => {
        if (typeof (params as Record<string, unknown>)?.direction === 'string')
            setDirection((params as Record<string, unknown>).direction as string);
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
