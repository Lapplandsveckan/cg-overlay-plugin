export function handleState(
    tl: gsap.core.Timeline,
    state: number,
    prevState: number,
    styles: Record<string, string>,
    direction: string,
) {
    if (state === 0) handleHide(tl, styles, direction);
    if (state === 1) handleShow(tl, styles);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.set(styles['banner-logo'], {
        left: '0%',
    });

    tl.set(styles.container, {
        left: '0%',
        top: '-100%',
    });

    // Move the logo
    tl.from(
        styles['banner-logo'],
        {
            top: '0%',
            autoAlpha: 0.3,
            duration: 2.0,
        },
        'start',
    );

    // Move entire container
    tl.to(
        styles.container,
        {
            top: '0%',
            autoAlpha: 1,
            duration: 1.7,
        },
        'start',
    );
}

function handleHide(
    tl: gsap.core.Timeline,
    styles: Record<string, string>,
    direction: string,
) {
    // Slide toward the screen's own edge so both sides exit outward.
    const exitX = direction === 'right' ? '100%' : '-100%';

    // Move the logo
    tl.to(
        styles['banner-logo'],
        {
            left: exitX,
            ease: 'power1.inOut',
            duration: 0.4,
        },
        'end',
    );

    // Move the entire container
    tl.to(
        styles.container,
        {
            left: exitX,
            duration: 0.5,
        },
        'end',
    );
}
