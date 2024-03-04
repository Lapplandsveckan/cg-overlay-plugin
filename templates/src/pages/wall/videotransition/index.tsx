import styles from './style.module.css';
import {useEffect, useState} from 'react';
import {register} from '../../../lib/wall/videotransition/cg';
import {handleState} from '../../../lib/wall/videotransition/animation';
import {getStylesProxy} from '../../../lib/animation';
import {CG} from '../../../components/CG';

export const VideoTransitionAnimation: React.FC<{ state: number }> = ({ state }) => {
    return (
        <CG
            state={state}
            handle={handleState}

            labels={['start', 'mid', 'end']}
            styles={getStylesProxy(styles)}
        >
            <main className={styles.container}>
                <img className={`${styles['banner-logo']} ${styles['banner-logo-1']}`} src="/images/mod-white.png" alt="Lappis - Mod"/>
                <img className={`${styles['banner-logo']} ${styles['banner-logo-2']}`} src="/images/mod-white.png" alt="Lappis - Mod"/>
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