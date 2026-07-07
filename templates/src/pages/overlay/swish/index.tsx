import React, { useEffect, useState } from 'react';
import styles from './style.module.css';
import { register } from '../../../lib/overlay/swish/cg';
import { handleState } from '../../../lib/overlay/swish/animation';
import { getStylesProxy } from '../../../lib/animation';
import { CG } from '../../../components/CG';

export const SlidingSwish: React.FC<{ count: number; className: string }> = ({
    count,
    className,
}) => (
    <div className={`${styles.swish__sliding__row} ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={styles.swish__sliding__text}>
                Swish
            </div>
        ))}
    </div>
);

interface SwishAnimationProps {
    number: string;
    state: number;
    labels: string;
    fromBelow: boolean;
}

const resolveLabels = (
    labels: string,
): { labels: string[]; hasLabels: boolean } => {
    const parts = labels.split('\n');
    if (parts.length === 2) return { labels: parts, hasLabels: true };
    if (parts.length === 1 && parts[0].trim() !== '')
        return { labels: [parts[0], parts[0]], hasLabels: true };
    return { labels: ['Swish', 'Swish'], hasLabels: false };
};

export const SwishAnimation: React.FC<SwishAnimationProps> = ({
    number,
    state,
    labels,
    fromBelow,
}) => {
    const { labels: Labels, hasLabels } = resolveLabels(labels);

    return (
        <CG
            state={state}
            handle={(tl, s, p, st) => handleState(tl, s, p, st, fromBelow)}
            labels={['start', 'mid', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.swish__main}>
                <div className={styles.swish__wrapper}>
                    <div className={styles.swish__sliding}>
                        <div
                            className={`${styles.swish__sliding__section} ${styles.swish__sliding__top}`}
                        >
                            <SlidingSwish
                                className={styles.swish__sliding__top_top}
                                count={6}
                            />
                            <SlidingSwish
                                className={styles.swish__sliding__top_bottom}
                                count={6}
                            />
                        </div>
                        <div
                            className={`${styles.swish__sliding__section} ${styles.swish__sliding__bottom}`}
                        >
                            <SlidingSwish
                                className={styles.swish__sliding__bottom_top}
                                count={6}
                            />
                            <SlidingSwish
                                className={styles.swish__sliding__bottom_bottom}
                                count={6}
                            />
                        </div>
                    </div>

                    <div className={styles.swish__number}>
                        {number.split('\n').map((line, i) => (
                            <div key={i}>{line}</div>
                        ))}
                    </div>

                    <div
                        className={styles.swish__top}
                        style={{
                            padding: number.length > 20 ? '0 125px' : '0 175px',
                        }}
                    >
                        {Labels.map((label, i) => (
                            <div key={i} className={styles.swish_top_element}>
                                {label}
                            </div>
                        ))}
                    </div>

                    <div
                        className={styles.swish__side}
                        style={{
                            visibility: hasLabels ? 'visible' : 'hidden',
                            transform: 'translateX(-80%)',
                        }}
                    >
                        {Labels.map((label, i) => (
                            <div key={i} className={styles.swish_top_element}>
                                {label}
                            </div>
                        ))}
                    </div>

                    <div
                        className={styles.swish__side}
                        style={{
                            visibility: hasLabels ? 'visible' : 'hidden',
                            transform: 'translateX(75%)',
                        }}
                    >
                        {Labels.map((label, i) => (
                            <div key={i} className={styles.swish_top_element}>
                                {label}
                            </div>
                        ))}
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
    const [fromBelow, setFromBelow] = useState(false);
    useEffect(() => register(setState, setNumber, setLabels, setFromBelow), []);

    return (
        <SwishAnimation
            number={number}
            state={state}
            labels={labels}
            fromBelow={fromBelow}
        />
    );
};

export default Page;
