import styles from './style.module.css';
import {useEffect, useState} from 'react';
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

export const SwishAnimation: React.FC<{ number: string, state: number }> = ({ number, state }) => {
    return (
        <CG
            state={state}
            handle={handleState}

            labels={['start', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.swish__main}>
                <div className={styles.swish__sliding}>
                    <SlidingSwish className={styles.swish__sliding__top} count={6} />
                    <SlidingSwish className={styles.swish__sliding__bottom} count={6} />
                </div>

                <div className={styles.swish__number}>{number}</div>
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