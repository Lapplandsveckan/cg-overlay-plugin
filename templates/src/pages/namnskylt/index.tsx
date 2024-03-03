import styles from './style.module.css';
import {useEffect, useRef, useState} from 'react';
import {register} from '../../lib/namnskylt/cg';
import { gsap } from 'gsap';
import {useGSAP} from '@gsap/react';
import {handleState} from '../../lib/namnskylt/animation';
import {getStylesProxy} from '../../lib/animation';

export const NamnskyltAnimation: React.FC<{ name: string, state: number }> = ({ name, state }) => {
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
            <div className={styles.namnskylt__main}>
                <div className={styles.namnskylt__main__name}>{name}</div>
            </div>
        </div>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [name, setName] = useState('Anders Andersson');
    useEffect(() => register(setState, setName), []);

    return <NamnskyltAnimation name={name} state={state} />;
};

export default Page;