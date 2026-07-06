import path from 'path';
import type * as PdfjsModule from 'pdfjs-dist/legacy/build/pdf.mjs';

type Pdfjs = typeof PdfjsModule;

/** Target render width in pixels (broadcast-safe). */
const TARGET_WIDTH = 1920;

const standardFontDataUrl = path.join(__dirname, 'standard_fonts') + path.sep;

// pdfjs-dist's legacy build is ESM-only, so webpack leaves it external and
// it's loaded here via a real dynamic import() instead of being bundled.
// A real import() ensures the worker and polyfills resolve from the same
// deployed node_modules.
let pdfjsPromise: Promise<Pdfjs> | null = null;
function loadPdfjs(): Promise<Pdfjs> {
    return (pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs').then(
        pdfjs => {
            // pdfjs runs its parser via a "fake worker" it dynamically imports
            // at runtime; point it at the copy webpack places next to dist/index.js.
            pdfjs.GlobalWorkerOptions.workerSrc = path.join(
                __dirname,
                'pdf.worker.mjs',
            );
            return pdfjs;
        },
    ));
}

/** Render each PDF page to a PNG Buffer, sequentially to bound memory. */
export async function renderPdfToImages(
    pdf: Buffer,
    onProgress?: (done: number, total: number) => void,
): Promise<Buffer[]> {
    const pdfjs = await loadPdfjs();

    const doc = await pdfjs.getDocument({
        data: new Uint8Array(pdf),
        isEvalSupported: false,
        useWorkerFetch: false,
        standardFontDataUrl,
        // Node has no document.fonts, so pdf.js can't resolve embedded/subsetted
        // fonts by family name for ctx.fillText (they'd fall back to a generic
        // font and render as tofu). Disabling font-face makes pdf.js render every
        // glyph as a compiled vector outline (Path2D) instead, which needs no
        // font-name resolution and works for embedded, subsetted, and standard-14
        // fonts alike.
        disableFontFace: true,
    }).promise;

    try {
        const total = doc.numPages;
        if (total === 0) throw new Error('PDF has no pages');

        const buffers: Buffer[] = [];
        const canvasFactory = doc.canvasFactory as any;

        for (let i = 1; i <= total; i++) {
            const page = await doc.getPage(i);

            try {
                const viewport = page.getViewport({ scale: 1 });
                const scale = TARGET_WIDTH / viewport.width;
                const scaled = page.getViewport({ scale });

                const { canvas, context } = canvasFactory.create(
                    Math.round(scaled.width),
                    Math.round(scaled.height),
                );

                // pdf.js renders onto a transparent canvas; fill white first so
                // pages without their own background don't show through as transparent.
                context.fillStyle = '#fff';
                context.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({
                    canvasContext: context,
                    viewport: scaled,
                }).promise;

                buffers.push(canvas.toBuffer('image/png'));
            } finally {
                page.cleanup();
            }

            onProgress?.(i, total);
        }

        return buffers;
    } finally {
        await doc.destroy();
    }
}
