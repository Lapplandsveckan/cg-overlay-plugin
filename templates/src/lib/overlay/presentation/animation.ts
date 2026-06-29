export function handleState(
    tl: gsap.core.Timeline,
    state: number,
    prevState: number,
    styles: Record<string, string>,
) {
    if (state === 0) handleHide(tl, styles);
    if (state === 1) handleShow(tl, styles);
    // Force playback from the start so the newly-built tween always animates,
    // even if the timeline was sitting completed/suspended since mount.
    tl.restart();
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();
    tl.set(styles.presentation__main, { opacity: 1 });
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();
    tl.set(styles.presentation__main, { opacity: 0 });
}
