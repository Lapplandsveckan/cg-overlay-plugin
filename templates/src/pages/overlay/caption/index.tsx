import React, { useEffect, useRef, useState } from 'react';
import styles from './style.module.css';
import { register, type CaptionStyle } from '../../../lib/overlay/caption/cg';
import {
    handleState,
    animateSpacer,
} from '../../../lib/overlay/caption/animation';
import { getStylesProxy } from '../../../lib/animation';
import { CG } from '../../../components/CG';

const DEFAULT_STYLE: CaptionStyle = {
    fontSize: 12,
    lines: 2,
};

export const CaptionAnimation: React.FC<{
    state: number;
    lines: string[];
    style: CaptionStyle;
    namnskyltState: number;
}> = ({ state, lines, style, namnskyltState }) => {
    const spacerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (spacerRef.current) animateSpacer(spacerRef.current, namnskyltState);
    }, [namnskyltState]);

    return (
        <CG
            state={state}
            handle={handleState}
            labels={['start', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.caption}>
                <div
                    className={styles.caption__main}
                    style={
                        {
                            '--caption-font-size': `${style.fontSize}vh`,
                        } as React.CSSProperties
                    }
                >
                    {lines.slice(-style.lines).join('\n')}
                </div>
                <div ref={spacerRef} className={styles.caption__spacer} />
            </div>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [lines, setLines] = useState<string[]>([]);
    const [style, setStyle] = useState<CaptionStyle>(DEFAULT_STYLE);
    const [namnskyltState, setNamnskyltState] = useState(0);

    useEffect(
        () => register(setState, setLines, setStyle, setNamnskyltState),
        [],
    );

    return (
        <CaptionAnimation
            state={state}
            lines={lines}
            style={style}
            namnskyltState={namnskyltState}
        />
    );
};

export default Page;
