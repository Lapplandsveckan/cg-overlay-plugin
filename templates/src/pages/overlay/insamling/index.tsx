import styles from './style.module.css';
import {useEffect, useRef, useState} from 'react';
import {register} from '../../../lib/overlay/insamling/cg';
import {handleState, setCanvas} from '../../../lib/overlay/insamling/animation';
import {getStylesProxy, Styles} from '../../../lib/animation';
import {CG} from '../../../components/CG';
import {formatNumber, useAnimatedNumbers} from '../../../lib/overlay/insamling/numbers';

export const InsamlingAnimation: React.FC<{ state: number, goal: number, now: number }> = ({ state, goal, now }) => {
    const animatedNow = useAnimatedNumbers(now, 3000, [now, state]);
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvas.current) return;
        setCanvas(canvas.current);
    }, [canvas.current]);

    return (
        <CG
            state={state}
            handle={(tl, state, _, styles) => handleState(tl, state, styles, goal, now)}

            labels={['start', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.diagram__main}>
                <canvas className={styles.canvas} ref={canvas} />
                <img className={styles.logo} src="/images/Lappis_NEG_v1.1.png" alt="Logo"/>
                <div className={styles.logo_sub}>Insamlade Medel</div>

                <div className={styles.diagram}>
                    <div className={styles['diagram-info']}>
                        <div id="goal" className={styles['diagram-pillar']} style={{backgroundColor: '#ff006a'}}>
                            <p className={styles.amount}>{formatNumber(goal)}</p>
                        </div>
                        <p>Insamlingsmål</p>
                    </div>
                    <div className={styles['diagram-info']}>
                        <div id="now" className={styles['diagram-pillar']} style={{backgroundColor: '#009cff'}}>
                            <p className={styles.amount}>{formatNumber(animatedNow)}</p>
                        </div>
                        <p>Insamlade Medel</p>
                    </div>
                </div>
            </div>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [goal, setGoal] = useState(100000);
    const [now, setNow] = useState(100000);
    useEffect(() => register(setState, setGoal, setNow), []);

    return <InsamlingAnimation state={state} goal={goal} now={now}/>;
};

export default Page;