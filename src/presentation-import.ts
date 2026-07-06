import * as fs from 'fs/promises';
import * as path from 'path';
import { noTryAsync } from 'no-try';
import type { PluginAPI } from '@lappis/cg-manager';
import type LappisOverlayPlugin from './index';
import { renderPdfToImages } from './pdf-render';
import { convertPptxToPdf, isConversionEnabled } from './cloudconvert';
import type { Slide } from './presentations';

export type ImportStatus =
    | 'pending'
    | 'converting'
    | 'rendering'
    | 'creating'
    | 'done'
    | 'error';

export interface ImportJob {
    id: string;
    title: string;
    status: ImportStatus;
    step?: 'upload' | 'convert' | 'export';
    percent?: number;
    pageDone?: number;
    pageTotal?: number;
    presentationId?: string;
    error?: string;
    createdAt: number;
}

export const PPTX_MIME =
    'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export function isPptx(filename: string): boolean {
    return filename.toLowerCase().endsWith('.pptx');
}

export function isPdf(filename: string): boolean {
    return filename.toLowerCase().endsWith('.pdf');
}

/** Lowercase, dashes, strip anything not alphanumeric or dash/underscore. */
function slugify(title: string): string {
    return (
        title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9_-]/g, '')
            .replace(/-{2,}/g, '-')
            .replace(/^-|-$/g, '') || 'presentation'
    );
}

function makeSlideId(): string {
    return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeJobId(): string {
    return `import-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Derive the CasparCG media ID from an upload path: strip extension, uppercase. */
function mediaIdFromPath(uploadPath: string): string {
    return uploadPath.replace(/\.[^/.]+$/, '').toUpperCase();
}

export interface StartImportInput {
    filename: string;
    title: string;
    /** Pre-assigned presentation id (e.g. for a rundown drop, fixed at drop time
     *  so the rundown entry can reference it before the import finishes). */
    presentationId?: string;
}

export const IMPORTS_FOLDER = 'presentations/_imports';
const MEDIA_INDEX_TIMEOUT_MS = 30_000;
const MEDIA_INDEX_POLL_MS = 250;
const RAW_READ_RETRIES = 5;
const RAW_READ_RETRY_MS = 200;
const JOB_RETENTION_MS = 10 * 60_000;

export class PresentationImportManager {
    private plugin: LappisOverlayPlugin;
    private api: PluginAPI;
    private jobs = new Map<string, ImportJob>();

    public constructor(plugin: LappisOverlayPlugin) {
        this.plugin = plugin;
        this.api = plugin['api'];
    }

    public list(): ImportJob[] {
        return Array.from(this.jobs.values());
    }

    public get(id: string): ImportJob | null {
        return this.jobs.get(id) ?? null;
    }

    public start(input: StartImportInput): ImportJob {
        const job: ImportJob = {
            id: makeJobId(),
            title: input.title.trim() || 'Untitled',
            status: 'pending',
            presentationId: input.presentationId,
            createdAt: Date.now(),
        };
        this.jobs.set(job.id, job);

        this.run(job, input)
            .catch(err => {
                this.plugin.getLogger().scope('presentation-import').error(err);
                this.update(job.id, {
                    status: 'error',
                    error: err?.message ?? 'Import failed',
                });
            })
            .finally(() => {
                setTimeout(() => this.jobs.delete(job.id), JOB_RETENTION_MS);
            });

        return job;
    }

    private update(id: string, patch: Partial<ImportJob>) {
        const current = this.jobs.get(id);
        if (!current) return;
        const next = { ...current, ...patch };
        this.jobs.set(id, next);
        this.plugin.broadcast('presentation-imports', 'UPDATE', next);
    }

    private async run(job: ImportJob, input: StartImportInput) {
        if (input.filename !== path.basename(input.filename)) {
            throw new Error(`Invalid filename: ${input.filename}`);
        }

        if (isPptx(input.filename) && !isConversionEnabled()) {
            throw new Error('PPTX conversion is not enabled on this server');
        }

        // The raw PDF/PPTX upload is never scanned as media (the scanner only
        // indexes images/videos), so read it straight from its known path
        // instead of waiting on the media DB. A short retry covers any
        // write-flush lag right after the client's upload call resolves.
        const mediaRoot = this.api.getMediaRoot();
        const rawPath = path.join(mediaRoot, IMPORTS_FOLDER, input.filename);
        const raw = await this.readFileWithRetry(rawPath);

        try {
            let pdfBuffer = raw;
            if (isPptx(input.filename)) {
                this.update(job.id, { status: 'converting' });
                pdfBuffer = await convertPptxToPdf(raw, input.filename, p =>
                    this.update(job.id, { step: p.step, percent: p.percent }),
                );
            }

            this.update(job.id, {
                status: 'rendering',
                step: undefined,
                percent: undefined,
                pageDone: 0,
                pageTotal: 0,
            });
            const pages = await renderPdfToImages(pdfBuffer, (done, total) =>
                this.update(job.id, { pageDone: done, pageTotal: total }),
            );

            // Suffix with the job id so two imports sharing a title never
            // collide on the same folder (the error-path `fs.rm` below would
            // otherwise wipe another presentation's media on collision).
            const folder = `presentations/${slugify(job.title)}-${job.id}`;
            const folderPath = path.join(mediaRoot, folder);

            const [runErr, presentation] = await noTryAsync(() =>
                this.writePagesAndCreate(
                    job,
                    folder,
                    folderPath,
                    mediaRoot,
                    pages,
                ),
            );
            if (runErr) {
                // Clean up any partially written pages so failed imports don't
                // leave orphaned media behind.
                await fs.rm(folderPath, { recursive: true, force: true });
                throw runErr;
            }

            this.plugin.broadcast(
                'presentations',
                'UPDATE',
                this.plugin.presentations.list(),
            );

            this.update(job.id, {
                status: 'done',
                presentationId: presentation!.id,
            });
        } finally {
            // Best-effort cleanup of the raw upload, whether the import
            // succeeded or failed — failure here shouldn't mask the outcome.
            await fs.unlink(rawPath).catch(() => {});
        }
    }

    private async readFileWithRetry(filePath: string): Promise<Buffer> {
        for (let attempt = 0; ; attempt++) {
            const [err, data] = await noTryAsync(() => fs.readFile(filePath));
            if (!err) return data!;
            if (attempt >= RAW_READ_RETRIES)
                throw new Error(
                    `Failed to read uploaded file: ${(err as Error).message}`,
                );
            await new Promise(r => setTimeout(r, RAW_READ_RETRY_MS));
        }
    }

    private async writePagesAndCreate(
        job: ImportJob,
        folder: string,
        folderPath: string,
        mediaRoot: string,
        pages: Buffer[],
    ) {
        await fs.mkdir(folderPath, { recursive: true });

        const mediaIds: string[] = [];
        for (let i = 0; i < pages.length; i++) {
            const pad = String(i + 1).padStart(2, '0');
            const relPath = `${folder}/page-${pad}.png`;
            await fs.writeFile(
                path.join(mediaRoot, relPath),
                new Uint8Array(pages[i]),
            );
            mediaIds.push(mediaIdFromPath(relPath));
        }

        await this.awaitIndexed(mediaIds);

        this.update(job.id, { status: 'creating' });
        const slides: Slide[] = mediaIds.map(mediaId => ({
            type: 'image',
            id: makeSlideId(),
            mediaId,
        }));
        return this.plugin.presentations.create({
            id: job.presentationId,
            title: job.title,
            slides,
        });
    }

    private async awaitIndexed(mediaIds: string[]): Promise<void> {
        const deadline = Date.now() + MEDIA_INDEX_TIMEOUT_MS;
        const db = this.api.getFileDatabase();
        while (Date.now() < deadline) {
            if (mediaIds.every(id => db.get(id)?.mediaPath)) return;
            await new Promise(r => setTimeout(r, MEDIA_INDEX_POLL_MS));
        }
        throw new Error('Timed out waiting for uploaded pages to be indexed');
    }
}
