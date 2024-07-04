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
};

interface SwishAnimationProps {
    number: string;
    state: number;
    labels: string;
}

export const SwishAnimation: React.FC<SwishAnimationProps> = ({ number, state, labels }) => {
    let Labels = labels.split('\n');
    if (Labels.length !== 2) Labels = ['Swish', 'Swish'];

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
                            <SlidingSwish className={styles.swish__sliding__top_top} count={6}/>
                            <SlidingSwish className={styles.swish__sliding__top_bottom} count={6}/>
                        </div>
                        <div className={`${styles.swish__sliding__section} ${styles.swish__sliding__bottom}`}>
                            <SlidingSwish className={styles.swish__sliding__bottom_top} count={6}/>
                            <SlidingSwish className={styles.swish__sliding__bottom_bottom} count={6}/>
                        </div>
                    </div>

                    <div
                        className={styles.swish__number}
                    >
                        {
                            number.split('\n').map((line, i) => (
                                <div key={i}>{line}</div>
                            ))
                        }
                    </div>

                    <div
                        className={styles.swish__top}
                        style={{
                            padding: number.length > 20 ? '0 125px' : '0 175px',
                        }}
                    >
                        {
                            Labels.map((label, i) => (
                                <div key={i} className={styles.swish_top_element}>{label}</div>
                            ))
                        }
                    </div>

                    <div
                        className={styles.swish__side}
                        style={{
                            visibility: labels.split('\n').length === 2 ? 'visible' : 'hidden',
                            transform: 'translateX(-80%)',
                        }}
                    >
                        {
                            Labels.map((label, i) => (
                                <div key={i} className={styles.swish_top_element}>{label}</div>
                            ))
                        }
                    </div>

                    <div
                        className={styles.swish__side}
                        style={{
                            visibility: labels.split('\n').length === 2 ? 'visible' : 'hidden',
                            transform: 'translateX(75%)',
                        }}
                    >
                        {
                            Labels.map((label, i) => (
                                <div key={i} className={styles.swish_top_element}>{label}</div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [number, setNumber] = useState('123 456 78 90');
    const [labels, setLabels] = useState('');
    useEffect(() => register(setState, setNumber, setLabels), []);

    return <SwishAnimation number={number} state={state} labels={labels}/>;
};

export default Page;
