import React, { useEffect, useState } from 'react';
import styles from './style.module.css';
import { register } from '../../../lib/wall/videotransition/cg';
import { handleState } from '../../../lib/wall/videotransition/animation';
import { getStylesProxy } from '../../../lib/animation';
import { CG } from '../../../components/CG';

export const VideoTransitionAnimation: React.FC<{
    state: number;
    mode: string;
}> = ({ state, mode }) => (
    <CG
        state={state}
        handle={(tl, s, p, st) => handleState(tl, s, p, st, mode)}
        labels={['start', 'mid', 'end']}
        styles={getStylesProxy(styles)}
    >
        <main className={styles.container}>
            <img
                className={`${styles['banner-logo']} ${styles['banner-logo-1']}`}
                src="/images/mod-white.png"
                alt="Lappis - Mod"
            />
            <img
                className={`${styles['banner-logo']} ${styles['banner-logo-2']}`}
                src="/images/mod-white.png"
                alt="Lappis - Mod"
            />
        </main>
    </CG>
);

const Page = () => {
    const [state, setState] = useState(0);
    const [mode, setMode] = useState('regular');
    useEffect(() => register(setState, setMode), []);

    return <VideoTransitionAnimation state={state} mode={mode} />;
};

export default Page;
