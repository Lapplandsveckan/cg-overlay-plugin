import styles from './style.module.css';
import {useEffect, useState} from 'react';
import {register} from '../../../lib/wall/namnskylt/cg';
import {handleState} from '../../../lib/wall/namnskylt/animation';
import {getStylesProxy} from '../../../lib/animation';
import {CG} from '../../../components/CG';

export const TextAnimation: React.FC<{ name: string, state: number }> = ({ name, state }) => {
    return (
        <CG
            state={state}
            handle={handleState}

            labels={['start', 'end']}
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
    const [name, setName] = useState('');
    useEffect(() => register(setState, setName), []);

    return <TextAnimation name={name} state={state} />;
};

export default Page;
