(() => {
    let cg = null;
    window.__cg = c => {
        cg = c;
        flush();
    };

    const buffer = [];
    const flush = () => {
        if (!cg) return;

        for (const cmd of buffer) {
            cg(...cmd);
        }
        buffer.length = 0;
    };

    window.update = params => {
        try {
            buffer.push(['update', JSON.parse(params)]);
            // eslint-disable-next-line no-empty
        } catch {}
    };

    window.play = () => buffer.push(['play']);
    window.next = () => buffer.push(['next']);
    window.stop = () => buffer.push(['stop']);
})();
