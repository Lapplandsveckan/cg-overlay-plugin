import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fork } from 'child_process';

/**
 * Render each PDF page to a PNG Buffer in a child process to avoid native
 * module cache issues. Accepts file path to read PDF directly from disk.
 */
export async function renderPdfToImages(
    pdfSource: string | Buffer,
    onProgress?: (done: number, total: number) => void,
    outputDir?: string,
): Promise<Buffer[]> {
    const shouldCleanupOutput = !outputDir;
    const actualOutputDir =
        outputDir || (await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-render-')));

    let pdfPath: string;
    let shouldCleanupInput = false;
    try {
        if (typeof pdfSource === 'string') {
            pdfPath = pdfSource;
        } else {
            shouldCleanupInput = true;
            const tmpDir = await fs.mkdtemp(
                path.join(os.tmpdir(), 'pdf-input-'),
            );
            pdfPath = path.join(tmpDir, 'input.pdf');
            await fs.writeFile(pdfPath, pdfSource as any);
        }

        const workerPath = path.join(__dirname, 'pdf-render-worker.js');
        const worker = fork(workerPath, [pdfPath, actualOutputDir], {
            execArgv: [],
        });

        await new Promise<void>((resolve, reject) => {
            worker.on('message', (msg: any) => {
                if (msg.done && msg.total) {
                    onProgress?.(msg.done, msg.total);
                }
            });

            worker.on('error', reject);

            worker.on('exit', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(
                        new Error(`PDF render worker exited with code ${code}`),
                    );
                }
            });
        });

        const files = await fs.readdir(actualOutputDir);
        const pageFiles = files
            .filter(f => f.startsWith('page-') && f.endsWith('.png'))
            .sort();

        const buffers: Buffer[] = [];
        for (const file of pageFiles) {
            const buffer = await fs.readFile(path.join(actualOutputDir, file));
            buffers.push(buffer);
        }

        return buffers;
    } finally {
        if (shouldCleanupOutput) {
            await fs.rm(actualOutputDir, { recursive: true, force: true });
        }
        if (shouldCleanupInput) {
            await fs.rm(path.dirname(pdfPath), {
                recursive: true,
                force: true,
            });
        }
    }
}
