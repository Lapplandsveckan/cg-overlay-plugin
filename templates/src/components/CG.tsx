import {useEffect, useRef, useState} from 'react';
import {gsap} from 'gsap';
import {useGSAP} from '@gsap/react';

interface CGProps {
    state: number;
    handle: (timeline: gsap.core.Timeline, state: number, prevState: number, styles: Record<string, string>) => unknown;

    labels: string[];
    styles: Record<string, string>;

    children: React.ReactNode;
}

export const CG: React.FC<CGProps> = ({ state, handle, labels, styles, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [prevState, setPrevState] = useState<number>(state);
    const [timeline, setTimeline] = useState<gsap.core.Timeline>(null);

    useGSAP(() => {
        if (timeline) timeline.kill();

        const tl = gsap.timeline({
            defaults: {
                duration: 2,
                ease: 'power2.inOut',
            },
        });

        for (const label of labels)
            tl.addLabel(label);

        setTimeline(tl);
    }, { scope: ref, dependencies: [] });

    useEffect(() => {
        if (!timeline) return;
        if (state === prevState) return;

        setPrevState(state);
        handle(timeline, state, prevState, styles);
    }, [state, timeline]);

    return (
        <div ref={ref}>
            {children}
        </div>
    );
}