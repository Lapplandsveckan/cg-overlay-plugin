export function handleState(
    tl: gsap.core.Timeline,
    state: number,
    prevState: number,
    styles: Record<string, string>,
    direction: string,
    fast = false,
) {
    if (fast) {
        if (state === 1) handleSweep(tl, styles, direction);
        if (state === 0) handleSweepReset(tl, styles);
        return;
    }
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

// Fast mode: sweep in from top, then immediately slide off to the side.
// Total duration ~0.7 s; the ATEM cut fires at ~0.5 s (backend FAST_TRANSITION_CUT_DELAY)
// to stay well within the covered window even accounting for CG round-trip latency.
function handleSweep(
    tl: gsap.core.Timeline,
    styles: Record<string, string>,
    direction: string,
) {
    const exitX = direction === 'right' ? '100%' : '-100%';
    tl.clear();

    tl.set(styles.container, { top: '-100%', left: '0%', autoAlpha: 1 });
    tl.set(styles['banner-logo'], { left: '0%' });

    // Slide down to cover
    tl.to(styles.container, { top: '0%', duration: 0.35, ease: 'power1.in' });

    // Slide off to the side
    tl.to(styles.container, {
        left: exitX,
        duration: 0.35,
        ease: 'power1.out',
    });
    tl.to(
        styles['banner-logo'],
        { left: exitX, duration: 0.35, ease: 'power1.out' },
        '<',
    );
}

// Reset silently off-screen after the sweep has already exited.
function handleSweepReset(
    tl: gsap.core.Timeline,
    styles: Record<string, string>,
) {
    tl.clear();
    tl.set(styles.container, { top: '-100%', left: '0%' });
    tl.set(styles['banner-logo'], { left: '0%' });
}
