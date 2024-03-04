import styles from './style.module.css';
import {useEffect, useState} from 'react';
import {register} from '../../../lib/overlay/bars/cg';
import {handleState} from '../../../lib/overlay/bars/animation';
import {getStylesProxy} from '../../../lib/animation';
import {CG} from '../../../components/CG';

export const VideoTransitionAnimation: React.FC<{ state: number }> = ({ state }) => {
    return (
        <CG
            state={state}
            handle={handleState}

            labels={['start', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.bar} style={{ top: 0 }} />
            <div className={styles.bar} style={{ bottom: 0 }} />
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    useEffect(() => register(setState), []);

    return <VideoTransitionAnimation state={state} />;
};

export default Page;