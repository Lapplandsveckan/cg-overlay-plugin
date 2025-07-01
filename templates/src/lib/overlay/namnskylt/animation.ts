export function handleState(tl: gsap.core.Timeline, state: number, prevState: number, styles: Record<string, string>) {
    if (state === 0) handleHide(tl, styles, prevState);
    if (state === 1) handleShow(tl, styles);
    if (state === 2) handleMinimize(tl, styles, prevState);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.set(styles.namnskylt__main, {
        top: '100%',
    }, 'start');

    // Move the text
    tl.set(styles.namnskylt__main__name, {
        top: '87.5%',
        scale: 1,
    }, 'start');

    // Move entire container
    tl.to(styles.namnskylt__main, {
        top: '0%',
        duration: 1,
    }, 'start');
}

function handleMinimize(tl: gsap.core.Timeline, styles: Record<string, string>, prevState: number) {
    tl.clear();

    let duration = 0.9;
    if (prevState === 0) {
        duration = 0.6;

        tl.set(styles.namnskylt__main, {
            top: '100%',
        }, 'start');

        // Move the text
        tl.set(styles.namnskylt__main__name, {
            top: '5%',
            scale: 0.5,
        }, 'start');
    }

    // Move entire container
    tl.to(styles.namnskylt__main, {
        top: '12.7%', // dont ask
        duration,
    }, 'mid');

    // Move the text
    tl.to(styles.namnskylt__main__name, {
        top: '80%',
        scale: 0.75,
        duration,
    }, 'mid');
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>, prevState: number) {
    tl.clear();

    // Move the entire container
    tl.to(styles.namnskylt__main, {
        top: '100%',
        duration: 1,
    }, 'end');
}
