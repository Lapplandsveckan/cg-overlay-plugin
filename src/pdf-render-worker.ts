import path from 'path';
import * as fs from 'fs/promises';
import type * as PdfjsModule from 'pdfjs-dist/legacy/build/pdf.mjs';

type Pdfjs = typeof PdfjsModule;

const TARGET_WIDTH = 1920;

const standardFontDataUrl = path.join(__dirname, 'standard_fonts') + path.sep;

async function loadPdfjs(): Promise<Pdfjs> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = path.join(
        __dirname,
        'pdf.worker.mjs',
    );
    return pdfjs as Pdfjs;
}

async function main() {
    const [pdfPath, outDir] = process.argv.slice(2);
    if (!pdfPath || !outDir) {
        console.error('Usage: pdf-render-worker <pdf-path> <output-dir>');
        process.exit(1);
    }

    try {
        const pdfBuffer = await fs.readFile(pdfPath);
        const pdfjs = await loadPdfjs();

        const doc = await pdfjs
            .getDocument({
                data: new Uint8Array(pdfBuffer),
                isEvalSupported: false,
                useWorkerFetch: false,
                standardFontDataUrl,
                disableFontFace: true,
            })
            .promise.catch(err => {
                throw new Error(
                    `Failed to load PDF: ${(err as Error).message}`,
                );
            });

        const total = doc.numPages;
        if (total === 0) throw new Error('PDF has no pages');

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

                context.fillStyle = '#fff';
                context.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({
                    canvasContext: context,
                    viewport: scaled,
                }).promise;

                const pad = String(i).padStart(2, '0');
                const pngPath = path.join(outDir, `page-${pad}.png`);
                const buffer = canvas.toBuffer('image/png');
                await fs.writeFile(pngPath, buffer);

                process.send?.({ done: i, total });
            } finally {
                page.cleanup();
            }
        }

        await doc.destroy();
        process.exit(0);
    } catch (err) {
        console.error('PDF render error:', (err as Error).message);
        process.exit(1);
    }
}

main();
