import styles from './style.module.css';
import {useEffect, useState} from 'react';
import {register} from '../../../lib/overlay/videotransition/cg';
import {handleState} from '../../../lib/overlay/videotransition/animation';
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
            <main className={styles.container}>
                <img className={styles['banner-logo']} src="/images/mod-white.png" alt="Lappis - Mod"/>
            </main>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    useEffect(() => register(setState), []);

    return <VideoTransitionAnimation state={state} />;
};

export default Page;