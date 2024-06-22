import {useEffect, useState} from 'react';

export function formatNumber(value: number) {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function useAnimatedNumbers(value: number, duration: number, dependencies: any[]) {
    const [number, setNumber] = useState(0);
    useEffect(() => {
        const start = Date.now();
        let cancelled = false;

        const tick = () => {
            if (cancelled)
                return;

            const now = Date.now();
            const progress = Math.min(1, (now - start) / duration);
            setNumber(value * progress);

            if (progress < 1)
                requestAnimationFrame(tick);
        };

        tick();

        return () => void (cancelled = true);
    }, dependencies);

    return number;
}