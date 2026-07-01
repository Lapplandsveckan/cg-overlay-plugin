import React, { useEffect, useState } from 'react';
import styles from './style.module.css';
import { register, type CaptionStyle } from '../../../lib/overlay/caption/cg';
import { handleState } from '../../../lib/overlay/caption/animation';
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
}> = ({ state, lines, style }) => (
    <CG
        state={state}
        handle={handleState}
        labels={['start', 'end']}
        styles={getStylesProxy(styles)}
    >
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
    </CG>
);

const Page = () => {
    const [state, setState] = useState(0);
    const [lines, setLines] = useState<string[]>([]);
    const [style, setStyle] = useState<CaptionStyle>(DEFAULT_STYLE);

    useEffect(() => register(setState, setLines, setStyle), []);

    return <CaptionAnimation state={state} lines={lines} style={style} />;
};

export default Page;
