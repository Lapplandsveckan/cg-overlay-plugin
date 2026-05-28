import styles from './style.module.css';
import {useEffect, useState} from 'react';
import {register} from '../../../lib/overlay/bibelord/cg';
import {handleState} from '../../../lib/overlay/bibelord/animation';
import {getStylesProxy} from '../../../lib/animation';
import {CG} from '../../../components/CG';

interface BibelordAnimationProps {
    state: number;
    text: string;
    reference: string;
}

export const BibelordAnimation: React.FC<BibelordAnimationProps> = ({state, text, reference}) => {
    return (
        <CG
            state={state}
            handle={handleState}

            labels={['start', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.bibelord__main}>
                <div className={styles.bibelord__text}>{text}</div>
                <div className={styles.bibelord__reference}>{reference}</div>
            </div>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [text, setText] = useState('');
    const [reference, setReference] = useState('');
    useEffect(() => register(setState, setText, setReference), []);

    return <BibelordAnimation state={state} text={text} reference={reference}/>;
};

export default Page;
