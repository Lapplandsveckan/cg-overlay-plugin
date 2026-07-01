import { gsap } from 'gsap';

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

// Mirrors the namnskylt template's own footprint/timing (see
// lib/overlay/namnskylt/animation.ts) so the caption's spacer box grows and
// shrinks in lockstep with the name tag: 0 hidden, 1 full (25vh over 1s), 2
// minimized (10vh over 0.9s).
const SPACER_HEIGHT = { 0: '0vh', 1: '25vh', 2: '10vh' };
const SPACER_DURATION = { 0: 1, 1: 1, 2: 0.9 };

export function animateSpacer(el: HTMLElement, state: number) {
    gsap.to(el, {
        height: SPACER_HEIGHT[state] ?? '0vh',
        duration: SPACER_DURATION[state] ?? 1,
        ease: 'power2.inOut',
    });
}
