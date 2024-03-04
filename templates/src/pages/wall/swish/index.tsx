import styles from './style.module.css';
import {useEffect, useRef, useState} from 'react';
import {register} from '../../../lib/wall/swish/cg';
import { gsap } from 'gsap';
import {useGSAP} from '@gsap/react';
import {handleState} from '../../../lib/wall/swish/animation';
import {getStylesProxy} from '../../../lib/animation';

export const SlidingSwish: React.FC<{ count: number, className: string }> = ({ count, className }) => {
    return (
        <div className={`${styles.swish__sliding__row} ${className}`}>
            {
                Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={styles.swish__sliding__text}>Swish</div>
                ))
            }
        </div>
    );
}

export const SwishAnimation: React.FC<{ number: string, state: number }> = ({ number, state }) => {
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
        tl.addLabel('end');

        handleState(tl, state, prevState, getStylesProxy(styles));
    }, { scope: ref, dependencies: [state] });

    return (
        <div ref={ref}>
            <div className={styles.swish__main}>
                <div className={styles.swish__sliding}>
                    <SlidingSwish className={styles.swish__sliding__top} count={6} />
                    <SlidingSwish className={styles.swish__sliding__bottom} count={6} />
                </div>

                <div className={styles.swish__number}>{number}</div>
            </div>
        </div>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [number, setNumber] = useState('123 456 78 90');
    useEffect(() => register(setState, setNumber), []);

    return <SwishAnimation number={number} state={state} />;
};

export default Page;