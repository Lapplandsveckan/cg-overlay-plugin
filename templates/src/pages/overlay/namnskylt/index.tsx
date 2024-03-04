import styles from './style.module.css';
import React, {useEffect, useState} from 'react';
import {register} from '../../../lib/overlay/namnskylt/cg';
import {handleState} from '../../../lib/overlay/namnskylt/animation';
import {getStylesProxy} from '../../../lib/animation';
import {CG} from '../../../components/CG';

export const NamnskyltAnimation: React.FC<{ name: string, state: number }> = ({ name, state }) => {
    return (
        <CG
            state={state}
            handle={handleState}

            labels={['start', 'mid', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.namnskylt__main}>
                <div className={styles.namnskylt__main__name}>{name}</div>
            </div>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [name, setName] = useState('Anders Andersson');
    useEffect(() => register(setState, setName), []);

    return <NamnskyltAnimation name={name} state={state} />;
};

export default Page;