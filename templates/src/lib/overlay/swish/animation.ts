export function handleState(
    tl: gsap.core.Timeline,
    state: number,
    prevState: number,
    styles: Record<string, string>,
    fromBelow = false,
) {
    if (state === 0) handleHide(tl, styles, fromBelow);
    if (state === 1) handleShow(tl, styles);
    if (state === 2) handleMinimize(tl, styles, prevState, fromBelow);
}

function handleShow(tl: gsap.core.Timeline, styles: Record<string, string>) {
    tl.clear();

    tl.set(
        styles.swish__main,
        {
            top: '110%',
        },
        'start',
    );

    tl.set(
        styles.swish__sliding__top,
        {
            translateX: '0',
        },
        'start',
    );

    tl.set(
        styles.swish__sliding__bottom,
        {
            translateX: '0',
        },
        'start',
    );

    tl.set(
        styles.swish__number,
        {
            top: '50%',
            fontSize: '120pt',
            flexDirection: 'column',
        },
        'start',
    );

    tl.set(
        styles.swish__top,
        {
            top: '-120%',
        },
        'start',
    );

    // Move entire container
    tl.to(
        styles.swish__main,
        {
            top: '0%',
            duration: 1,
        },
        'start',
    );
}

function handleMinimize(
    tl: gsap.core.Timeline,
    styles: Record<string, string>,
    prevState: number,
    fromBelow = false,
) {
    // tl.clear();

    tl.set(
        styles.swish__number,
        {
            flexDirection: 'row',
        },
        'start',
    );

    const mainTarget = fromBelow ? '90%' : '-100%';
    const numberTarget = fromBelow ? '5%' : '105%';
    const topTarget = fromBelow ? '0%' : '100%';

    let delay = 0.3;
    if (prevState === 0) {
        delay = 0;
        tl.set(
            styles.swish__main,
            {
                top: fromBelow ? '110%' : '-110%',
            },
            'start',
        );

        tl.set(
            styles.swish__sliding__top,
            {
                translateX: '250%',
            },
            'start',
        );

        tl.set(
            styles.swish__sliding__bottom,
            {
                translateX: '-250%',
            },
            'start',
        );

        tl.set(
            styles.swish__number,
            {
                top: '50%',
                fontSize: '120pt',
            },
            'start',
        );

        tl.set(
            styles.swish__top,
            {
                top: fromBelow ? '120%' : '-120%',
            },
            'start',
        );
    } else {
        tl.to(
            styles.swish__sliding__top,
            {
                translateX: '250%',
                duration: 1,
            },
            'mid',
        );

        tl.to(
            styles.swish__sliding__bottom,
            {
                translateX: '-250%',
                duration: 1,
            },
            'mid',
        );
    }

    tl.to(
        styles.swish__main,
        {
            top: mainTarget,
            duration: 1,
            delay,
        },
        'mid',
    );

    tl.to(
        styles.swish__number,
        {
            top: numberTarget,
            fontSize: '80px',

            duration: 1,
            delay,
        },
        'mid',
    );

    tl.to(
        styles.swish__top,
        {
            top: topTarget,

            duration: 1,
            delay,
        },
        'mid',
    );
}

function handleHide(
    tl: gsap.core.Timeline,
    styles: Record<string, string>,
    fromBelow = false,
) {
    tl.clear();

    tl.to(
        styles.swish__main,
        {
            top: fromBelow ? '110%' : '-110%',
            duration: 0.3,
        },
        'end',
    );
}
