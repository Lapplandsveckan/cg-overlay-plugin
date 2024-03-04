import styles from './style.module.css';
import {useEffect, useRef, useState} from 'react';
import {register} from '../../../lib/wall/videotransition/cg';
import { gsap } from 'gsap';
import {useGSAP} from '@gsap/react';
import {handleState} from '../../../lib/wall/videotransition/animation';
import {getStylesProxy} from '../../../lib/animation';

export const VideoTransitionAnimation: React.FC<{ state: number }> = ({ state }) => {
    const ref = useRef<HTMLDivElement>(null);
    const timeline = useRef<gsap.core.Timeline>();
    const [prevState, setPrevState] = useState<number>(state);

    useGSAP(() => {
        if (state === prevState) return;
        setPrevState(state);

        if (timeline.current) timeline.current.kill();
        const tl = timeline.current = gsap.timeline({
            defaults: {
                duration: 2,
                ease: 'power2.inOut',
            },
        });

        tl.addLabel('start');
        tl.addLabel('mid');
        tl.addLabel('end');

        handleState(tl, state, prevState, getStylesProxy(styles));
    }, { scope: ref, dependencies: [state] });

    return (
        <div ref={ref}>
            <main className={styles.container}>
                <img className={`${styles['banner-logo']} ${styles['banner-logo-1']}`} src="/images/mod-white.png" alt="Lappis - Mod"/>
                <img className={`${styles['banner-logo']} ${styles['banner-logo-2']}`} src="/images/mod-white.png" alt="Lappis - Mod"/>
            </main>
        </div>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    useEffect(() => register(setState), []);

    return <VideoTransitionAnimation state={state} />;
};

export default Page;