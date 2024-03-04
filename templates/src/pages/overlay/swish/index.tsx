import styles from './style.module.css';
import React, {useEffect, useState} from 'react';
import {register} from '../../../lib/overlay/swish/cg';
import {handleState} from '../../../lib/overlay/swish/animation';
import {getStylesProxy} from '../../../lib/animation';
import {CG} from '../../../components/CG';

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
    return (
        <CG
            state={state}
            handle={handleState}

            labels={['start', 'mid', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.swish__main}>
                <div className={styles.swish__wrapper}>
                    <div className={styles.swish__sliding}>
                        <div className={`${styles.swish__sliding__section} ${styles.swish__sliding__top}`}>
                            <SlidingSwish className={styles.swish__sliding__top_top} count={6} />
                            <SlidingSwish className={styles.swish__sliding__top_bottom} count={6} />
                        </div>
                        <div className={`${styles.swish__sliding__section} ${styles.swish__sliding__bottom}`}>
                            <SlidingSwish className={styles.swish__sliding__bottom_top} count={6} />
                            <SlidingSwish className={styles.swish__sliding__bottom_bottom} count={6} />
                        </div>
                    </div>

                    <div className={styles.swish__number}>{number}</div>

                    <div className={styles.swish__top}>
                        <div className={styles.swish_top_element}>Swish</div>
                        <div className={styles.swish_top_element}>Swish</div>
                    </div>
                </div>
            </div>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [number, setNumber] = useState('123 456 78 90');
    useEffect(() => register(setState, setNumber), []);

    return <SwishAnimation number={number} state={state} />;
};

export default Page;