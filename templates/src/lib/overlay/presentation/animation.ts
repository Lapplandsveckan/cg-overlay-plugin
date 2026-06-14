export function handleState(
    tl: gsap.core.Timeline,
    state: number,
    prevState: number,
    styles: Record<string, string>,
) {
    if (state === 0) handleHide(tl, styles);
    if (state === 1) handleShow(tl, styles);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.to(
        styles.presentation__main,
        {
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
        },
        'start',
    );
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.to(
        styles.presentation__main,
        {
            opacity: 0,
            duration: 0.4,
            ease: 'power2.in',
        },
        'end',
    );
}
