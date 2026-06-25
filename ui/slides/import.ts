import * as pdfjs from 'pdfjs-dist';

// Pin the worker version to match installed pdfjs-dist.
pdfjs.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

/** Target render width in pixels (broadcast-safe). */
const TARGET_WIDTH = 1920;

export function makeSlideId(): string {
    return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Lowercase, dashes, strip anything not alphanumeric or dash/underscore. */
export function slugify(title: string): string {
    return (
        title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9_-]/g, '')
            .replace(/-{2,}/g, '-')
            .replace(/^-|-$/g, '') || 'presentation'
    );
}

/**
 * Derive the CasparCG media ID from an upload path.
 * Mirrors server-side `getId` in cg-manager: strip extension, uppercase.
 */
export function mediaIdFromPath(uploadPath: string): string {
    return uploadPath.replace(/\.[^/.]+$/, '').toUpperCase();
}

export interface RenderProgress {
    done: number;
    total: number;
}

/** Render each PDF page to a PNG Blob, sequentially to bound memory. */
export async function renderPdfToImages(
    file: File,
    onProgress?: (p: RenderProgress) => void,
): Promise<Blob[]> {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;

    try {
        const total = pdf.numPages;
        if (total === 0) throw new Error('PDF has no pages');

        const blobs: Blob[] = [];

        for (let i = 1; i <= total; i++) {
            const page = await pdf.getPage(i);

            try {
                const viewport = page.getViewport({ scale: 1 });
                const scale = TARGET_WIDTH / viewport.width;
                const scaled = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.width = Math.round(scaled.width);
                canvas.height = Math.round(scaled.height);

                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Could not get 2d canvas context');
                await page.render({ canvasContext: ctx, viewport: scaled })
                    .promise;

                const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob(
                        b =>
                            b
                                ? resolve(b)
                                : reject(new Error('Canvas toBlob failed')),
                        'image/png',
                    );
                });

                // Release canvas backing memory before moving to the next page
                canvas.width = 0;
                canvas.height = 0;

                blobs.push(blob);
            } finally {
                page.cleanup();
            }

            onProgress?.({ done: i, total });
        }

        return blobs;
    } finally {
        await pdf.destroy();
    }
}
