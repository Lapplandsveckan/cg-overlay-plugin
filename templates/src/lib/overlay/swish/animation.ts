export function handleState(tl: gsap.core.Timeline, state: number, prevState: number, styles: Record<string, string>) {
    if (state === 0) handleHide(tl, styles);
    if (state === 1) handleShow(tl, styles);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.set(styles.swish__main, {
        top: '-50%',
    }, 'start');

    tl.set(styles.swish__number, {
        top: '-100%',
    }, 'start');

    tl.set(styles.swish__top, {
        top: '-100%',
    }, 'start');

    tl.to(styles.swish__main, {
        top: '0%',
        duration: 1,
    }, 'mid');

    tl.to(styles.swish__number, {
        top: '7.5%',

        duration: 1,
    }, 'mid');

    tl.to(styles.swish__top, {
        top: '3.25%',

        duration: 1,
    }, 'mid');
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.to(styles.swish__main, {
        top: '-50%',
        duration: 0.3,
    }, 'end');
}
