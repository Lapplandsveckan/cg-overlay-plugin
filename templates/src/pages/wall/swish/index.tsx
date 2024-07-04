import styles from './style.module.css';
import React, {useEffect, useState} from 'react';
import {register} from '../../../lib/wall/swish/cg';
import {handleState} from '../../../lib/wall/swish/animation';
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
    const Labels = labels.split('\n');
    return (
        <CG
            state={state}
            handle={handleState}

            labels={['start', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.swish__main}>
                <div className={styles.swish__sliding}>
                    <SlidingSwish className={styles.swish__sliding__top} count={6}/>
                    <SlidingSwish className={styles.swish__sliding__bottom} count={6}/>
                </div>

                <div
                    className={styles.swish__number}
                    style={{
                        fontSize: number.length > 20 ? '150pt' : '200pt',
                    }}
                >
                    {number}
                </div>

                <div
                    className={styles.swish__side}
                    style={{
                        visibility: Labels.length === 2 ? 'visible' : 'hidden',
                        transform: 'translateX(-70%)',
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
                        visibility: Labels.length === 2 ? 'visible' : 'hidden',
                        transform: 'translateX(65%)',
                    }}
                >
                    {
                        Labels.map((label, i) => (
                            <div key={i} className={styles.swish_top_element}>{label}</div>
                        ))
                    }
                </div>
            </div>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    // const [number, setNumber] = useState('123 456 78 90');
    const [number, setNumber] = useState('123 456 78 90');
    const [labels, setLabels] = useState('');
    useEffect(() => register(setState, setNumber, setLabels), []);

    return <SwishAnimation number={number} state={state} labels={labels}/>;
};

export default Page;
