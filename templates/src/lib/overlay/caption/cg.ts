import { offCGEvent, onCGEvent, readyCG } from '../../cg';
import { connectCaptionStream, type CaptionStreamConfig } from './stream';

// state
// 0: hidden
// 1: shown

export interface CaptionConfig extends CaptionStreamConfig {
    fontSize: number;
    lines: number;
}

export interface CaptionStyle {
    fontSize: number;
    lines: number;
}

export function register(
    setState: (state: number) => void,
    setLines: (lines: string[]) => void,
    setStyle: (style: CaptionStyle) => void,
) {
    let disconnect: () => void = () => {};

    const update = (params: CaptionConfig) => {
        setStyle({
            fontSize: params.fontSize,
            lines: params.lines,
        });

        disconnect();
        disconnect = connectCaptionStream(params, params.lines, setLines);
    };
    onCGEvent('update', update);

    const states = [() => setState(0), () => setState(1)];
    onCGEvent('stop', states[0]);
    onCGEvent('play', states[1]);

    readyCG();

    return () => {
        offCGEvent('update', update);
        offCGEvent('stop', states[0]);
        offCGEvent('play', states[1]);
        disconnect();
    };
}

export {};
