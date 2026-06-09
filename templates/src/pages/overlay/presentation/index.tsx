import styles from './style.module.css';
import {useEffect, useState} from 'react';
import {register} from '../../../lib/overlay/presentation/cg';
import {handleState} from '../../../lib/overlay/presentation/animation';
import {getStylesProxy} from '../../../lib/animation';
import {CG} from '../../../components/CG';

interface PresentationAnimationProps {
    state: number;
    text: string;
    reference: string;
}

export const PresentationAnimation: React.FC<PresentationAnimationProps> = ({state, text, reference}) => {
    return (
        <CG
            state={state}
            handle={handleState}

            labels={['start', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.presentation__main}>
                <div className={styles.presentation__text}>{text}</div>
                <div className={styles.presentation__reference}>{reference}</div>
            </div>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [text, setText] = useState('');
    const [reference, setReference] = useState('');
    useEffect(() => register(setState, setText, setReference), []);

    return <PresentationAnimation state={state} text={text} reference={reference}/>;
};

export default Page;
