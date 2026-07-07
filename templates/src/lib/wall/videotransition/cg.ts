import { offCGEvent, onCGEvent, readyCG } from '../../cg';

// state
// 0: hidden
// 1: shown
// 2: sides not shown
// (the current effect never sends 'next' — state 2 is unreachable today,
// kept for parity with the design in case that changes)

export function register(
    setState: (state: number) => void,
    setMode: (mode: string) => void,
) {
    const states = [() => setState(0), () => setState(1), () => setState(2)];

    // mode arrives as CG add data on load, refreshed via update
    const update = (params: unknown) => {
        const p = params as Record<string, unknown>;
        if (typeof p?.mode === 'string') setMode(p.mode as string);
    };

    onCGEvent('update', update);
    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);
    onCGEvent('next', states[2]);

    readyCG();

    return () => {
        offCGEvent('update', update);
        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
        offCGEvent('next', states[2]);
    };
}

export {};
