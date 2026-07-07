import { useEffect, useState } from 'react';
import styles from './style.module.css';
import { register } from '../../../lib/overlay/videotransition/cg';
import { handleState } from '../../../lib/overlay/videotransition/animation';
import { getStylesProxy } from '../../../lib/animation';
import { CG } from '../../../components/CG';

export const VideoTransitionAnimation: React.FC<{
    state: number;
    direction: string;
    mode: string;
}> = ({ state, direction, mode }) => (
    <CG
        state={state}
        handle={(tl, s, p, st) => handleState(tl, s, p, st, direction, mode)}
        labels={['start', 'end']}
        styles={getStylesProxy(styles)}
    >
        <main className={styles.container}>
            <img
                className={styles['banner-logo']}
                src="/images/beratta-om.png"
                alt="Berätta om"
            />
        </main>
    </CG>
);

const Page = () => {
    const [state, setState] = useState(0);
    const [direction, setDirection] = useState('left');
    const [mode, setMode] = useState('regular');
    useEffect(() => register(setState, setDirection, setMode), []);

    return (
        <VideoTransitionAnimation
            state={state}
            direction={direction}
            mode={mode}
        />
    );
};

export default Page;
