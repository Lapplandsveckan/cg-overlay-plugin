export function handleState(tl: gsap.core.Timeline, state: number, prevState: number, styles: Record<string, string>) {
    if (state === 0) handleHide(tl, styles);
    if (state === 1) handleShow(tl, styles);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.set(styles.container, {
        left: '0%',
        top: '-100%',
    });

    tl.to(styles.container, {
        top: '0%',
        autoAlpha: 1,
        duration: 1.7,
    }, 'start');
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.to(styles.container, {
        left: '-100%',
        duration: 0.5,
    }, 'end');
}
