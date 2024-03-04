export function handleState(tl: gsap.core.Timeline, state: number, prevState: number, styles: Record<string, string>) {
    if (state === 0) handleHide(tl, styles);
    if (state === 1) handleShow(tl, styles);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    // which height? 60, 100, 108, 120?
    tl.to(styles.bar, {
        height: 108,
        duration: 4,
    }, 'start');
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.to(styles.bar, {
        height: 0,
        duration: 4,
    }, 'end');
}