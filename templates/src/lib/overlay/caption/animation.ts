export function handleState(
    tl: gsap.core.Timeline,
    state: number,
    _prevState: number,
    styles: Record<string, string>,
) {
    if (state === 0) handleHide(tl, styles);
    if (state === 1) handleShow(tl, styles);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();
    tl.set(styles.caption__main, { opacity: 0 }, 'start');
    tl.to(styles.caption__main, { opacity: 1, duration: 0.4 }, 'start');
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();
    tl.to(styles.caption__main, { opacity: 0, duration: 0.4 }, 'end');
}
