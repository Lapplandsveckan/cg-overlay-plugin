import {InsamlingCanvas} from './canvas';

const insamlingCanvas = new InsamlingCanvas();
export function setCanvas(canvas: HTMLCanvasElement) {
    insamlingCanvas.setCanvas(canvas);
}

export function handleState(tl: gsap.core.Timeline, state: number, styles: Record<string, string>, goal: number, now: number) {
    if (state === 0) handleHide(tl, styles);
    if (state === 1) handleShow(tl, styles, goal, now);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>, goal: number, now: number) {
    insamlingCanvas.fillCoins();
    tl.clear();

    tl.to(styles['diagram__main'], {
        opacity: 1,
        duration: 0,
    }, 'start');

    tl.set('#now', {
        height: 0,
        duration: 3,
    }, 'start');

    tl.set('#goal', {
        height: 700,
        duration: 3,
    }, 'start');

    const proportion = now / goal;

    tl.to('#now', {
        height: Math.min(800 * proportion, 700),
        duration: 3,
        ease: 'none',
    }, 'start');

    tl.to('#goal', {
        height: Math.min(800 / proportion, 700),
        duration: 3,
        ease: 'none',
    }, 'start');
}

function handleHide(tl: gsap.core.Timeline, styles: Record<string, string>) {
    insamlingCanvas.clearCoins();
    tl.clear();

    tl.to(styles['diagram__main'], {
        opacity: 0,
        duration: 0,
    }, 'end');
}