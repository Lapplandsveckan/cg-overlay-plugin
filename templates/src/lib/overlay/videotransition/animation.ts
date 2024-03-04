export function handleState(tl: gsap.core.Timeline, state: number, prevState: number, styles: Record<string, string>) {
    if (state === 0) handleHide(tl, styles);
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
    tl.from(styles['banner-logo'], {
        top: '0%',
        autoAlpha: 0.3,
        duration: 2.0,
    }, 'start');

    // Move entire container
    tl.to(styles.container, {
        top: '0%',
        autoAlpha: 1,
        duration: 1.7,
    }, 'start');
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>) {
    // tl.clear();

    // Move the logo
    tl.to(styles['banner-logo'], {
        left: '-100%',
        ease: 'power1.inOut',
        duration: 0.4,
    }, 'end');

    // Move the entire container
    tl.to(styles.container, {
        left: '-100%',
        duration: 0.5,
    }, 'end');
}