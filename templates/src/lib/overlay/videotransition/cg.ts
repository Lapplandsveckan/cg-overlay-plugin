import { offCGEvent, onCGEvent, readyCG } from '../../cg';

// state
// 0: hidden
// 1: shown

export function register(
    setState: (state: number) => void,
    setDirection: (direction: string) => void,
    setMode: (mode: string) => void,
) {
    const states = [() => setState(0), () => setState(1)];

    // direction and mode arrive as CG add data on load, refreshed via update
    const update = (params: unknown) => {
        const p = params as Record<string, unknown>;
        if (typeof p?.direction === 'string')
            setDirection(p.direction as string);
        if (typeof p?.mode === 'string') setMode(p.mode as string);
    };

    onCGEvent('update', update);
    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);

    readyCG();

    return () => {
        offCGEvent('update', update);
        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
    };
}

export {};
