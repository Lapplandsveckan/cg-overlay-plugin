import styles from './style.module.css';
import { useEffect, useState } from 'react';
import { register } from '../../../lib/overlay/presentation/cg';
import { handleState } from '../../../lib/overlay/presentation/animation';
import { getStylesProxy } from '../../../lib/animation';
import { CG } from '../../../components/CG';

interface PresentationAnimationProps {
    state: number;
    text: string;
    reference: string;
}

// Verse-number marker emitted by the server: ⟨N⟩<verse text…>
const VERSE_NUM_RE = /⟨(\d+)⟩/g;

function renderText(text: string): React.ReactNode {
    if (!text.includes('⟨')) return text;

    const parts: React.ReactNode[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    VERSE_NUM_RE.lastIndex = 0;
    while ((match = VERSE_NUM_RE.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        parts.push(
            <span
                key={match.index}
                className={styles['presentation__verse-number']}
            >
                {match[1]}
            </span>,
        );
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return <>{parts}</>;
}

export const PresentationAnimation: React.FC<PresentationAnimationProps> = ({
    state,
    text,
    reference,
}) => {
    return (
        <CG
            state={state}
            handle={handleState}
            labels={['start', 'end']}
            styles={getStylesProxy(styles)}
        >
            <div className={styles.presentation__main}>
                <div className={styles.presentation__text}>
                    {renderText(text)}
                </div>
                <div className={styles.presentation__reference}>
                    {reference}
                </div>
            </div>
        </CG>
    );
};

const Page = () => {
    const [state, setState] = useState(0);
    const [text, setText] = useState('');
    const [reference, setReference] = useState('');
    useEffect(() => register(setState, setText, setReference), []);

    return (
        <PresentationAnimation
            state={state}
            text={text}
            reference={reference}
        />
    );
};

export default Page;
