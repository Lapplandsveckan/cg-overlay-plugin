export function handleState(tl: gsap.core.Timeline, state: number, prevState: number, styles: Record<string, string>) {
    if (state === 0) handleHide(tl, styles);
    if (state === 1) handleShow(tl, styles);
    if (state === 2) handleSides(tl, styles);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.set(styles['banner-logo-1'], {
        left: '25%',
        width: '50%',
    });

    tl.set(styles['banner-logo-2'], {
        right: '25%',
        width: '50%',
    });

    tl.set(styles.container, {
       // top: '-100%',
        opacity: 0,
    });

    // Move entire container
    tl.to(styles.container, {
        // top: '0%',
        opacity: 1,
        autoAlpha: 1,
        duration: 1.7,
    }, 'start');
}

function handleSides(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.to(styles['banner-logo-1'], {
        left: '0%',
        width: '25%',
        ease: 'power1.inOut',
        duration: 0.4,
    }, 'mid');

    tl.to(styles['banner-logo-2'], {
        right: '0%',
        width: '25%',
        ease: 'power1.inOut',
        duration: 0.4,
    }, 'mid');
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    // Move the logo
    tl.to(styles['banner-logo'], {
        ease: 'power1.inOut',
        duration: 0.5,
    }, 'end');

    // Move the entire container
    tl.to(styles.container, {
        // top: '-100%',
        opacity: 0,
        duration: 0.5,
    }, 'end');
}