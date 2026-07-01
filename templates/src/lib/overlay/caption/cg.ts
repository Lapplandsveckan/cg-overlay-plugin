import { offCGEvent, onCGEvent, readyCG } from '../../cg';
import { connectCaptionStream, type CaptionStreamConfig } from './stream';

// state
// 0: hidden
// 1: shown

export interface CaptionConfig extends Partial<CaptionStreamConfig> {
    fontSize?: number;
    lines?: number;
    namnskyltState?: number;
}

export interface CaptionStyle {
    fontSize: number;
    lines: number;
}

// Fields that require reopening the CaptionKit stream when they change.
// namnskyltState/fontSize updates arrive as partial payloads and must not
// tear down an already-connected stream.
const streamKey = (c: CaptionConfig) =>
    JSON.stringify([c.channel, c.language, c.realtimeBase, c.lines]);

export function register(
    setState: (state: number) => void,
    setLines: (lines: string[]) => void,
    setStyle: (style: CaptionStyle) => void,
    setNamnskyltState: (state: number) => void,
) {
    let disconnect: () => void = () => {};
    let lastStreamKey: string | null = null;
    let config: CaptionConfig = {};

    const reconnect = () => {
        disconnect();
        disconnect = connectCaptionStream(
            config as CaptionStreamConfig,
            config.lines,
            setLines,
        );
    };

    const update = (params: CaptionConfig) => {
        config = { ...config, ...params };

        // Fall back in case a partial update (e.g. namnskyltState-only)
        // somehow arrives before the initial CG-ADD config.
        setStyle({
            fontSize: config.fontSize ?? 12,
            lines: config.lines ?? 2,
        });
        setNamnskyltState(config.namnskyltState ?? 0);

        const key = streamKey(config);
        if (key === lastStreamKey) return;
        lastStreamKey = key;

        reconnect();
    };
    onCGEvent('update', update);

    const states = [() => setState(0), () => setState(1)];
    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);

    // Reused as the "clear" signal: drop whatever backlog piled up (e.g.
    // while a video played) and reconnect with a fresh cursor so stale
    // entries can't get re-emitted by the stream's own prune timer.
    const clear = () => {
        setLines([]);
        reconnect();
    };
    onCGEvent('next', clear);

    readyCG();

    return () => {
        offCGEvent('update', update);
        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
        offCGEvent('next', clear);
        disconnect();
    };
}

export {};
