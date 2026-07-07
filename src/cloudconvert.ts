import CloudConvert from 'cloudconvert';
import { noTryAsync } from 'no-try';

export function isConversionEnabled(): boolean {
    return !!process.env.CLOUDCONVERT_API_KEY;
}

function makeClient(): CloudConvert {
    const key = process.env.CLOUDCONVERT_API_KEY;
    if (!key) throw new Error('CLOUDCONVERT_API_KEY env var is not set');
    return new CloudConvert(key);
}

export interface ConversionJob {
    jobId: string;
    upload: {
        url: string;
        parameters: Record<string, string>;
    };
}

export async function createConversionJob(
    filename: string,
): Promise<ConversionJob> {
    const cc = makeClient();
    const [err, job] = await noTryAsync(() =>
        cc.jobs.create({
            tasks: {
                'upload-file': { operation: 'import/upload' },
                'convert-file': {
                    operation: 'convert',
                    input: ['upload-file'],
                    /* eslint-disable camelcase */
                    input_format: 'pptx',
                    output_format: 'pdf',
                    /* eslint-enable camelcase */
                    filename: `${filename.replace(/\.[^/.]+$/, '')}.pdf`,
                },
                'export-file': {
                    operation: 'export/url',
                    input: ['convert-file'],
                },
            },
        }),
    );
    if (err) throw err;

    const uploadTask = job!.tasks.find(t => t.name === 'upload-file');
    const form = uploadTask?.result?.form as
        | { url: string; parameters: Record<string, string> }
        | undefined;
    if (!form?.url)
        throw new Error('CloudConvert did not return an upload form');

    return {
        jobId: job!.id,
        upload: { url: form.url, parameters: form.parameters ?? {} },
    };
}

export type ConversionStatus = 'pending' | 'finished' | 'error';

export interface ConversionResult {
    status: ConversionStatus;
    downloadUrl?: string;
    message?: string;
    // Coarse progress while pending: which step is running and its percent (0-100).
    step?: 'upload' | 'convert' | 'export';
    percent?: number;
}

const STEP_BY_TASK: Record<string, ConversionResult['step']> = {
    'upload-file': 'upload',
    'convert-file': 'convert',
    'export-file': 'export',
};

export async function getConversionResult(
    jobId: string,
): Promise<ConversionResult> {
    const cc = makeClient();
    const [err, job] = await noTryAsync(() => cc.jobs.get(jobId));
    if (err) return { status: 'error', message: (err as Error).message };

    const s = job!.status;
    if (s === 'error') {
        const msg =
            job!.tasks.find(t => t.message)?.message ?? 'Conversion failed';
        return { status: 'error', message: msg };
    }
    if (s !== 'finished') {
        // Report the first not-yet-finished task as the current step.
        const active =
            job!.tasks.find(t => t.status === 'processing') ??
            job!.tasks.find(t => t.status !== 'finished');
        const percent = (active as any)?.percent;
        return {
            status: 'pending',
            step: active ? STEP_BY_TASK[active.name] : undefined,
            percent: typeof percent === 'number' ? percent : undefined,
        };
    }

    const exportTask = job!.tasks.find(t => t.name === 'export-file');
    const downloadUrl = exportTask?.result?.files?.[0]?.url;
    if (!downloadUrl)
        return { status: 'error', message: 'No export URL in result' };

    return { status: 'finished', downloadUrl };
}

/** Convert a PPTX buffer to a PDF buffer via CloudConvert, polling until done. */
export async function convertPptxToPdf(
    buffer: Buffer,
    filename: string,
    onProgress?: (p: Pick<ConversionResult, 'step' | 'percent'>) => void,
): Promise<Buffer> {
    const { jobId, upload } = await createConversionJob(filename);

    onProgress?.({ step: 'upload' });
    const form = new FormData();
    for (const [k, v] of Object.entries(upload.parameters)) form.append(k, v);
    form.append('file', new Blob([new Uint8Array(buffer)]), filename); // file field must be last

    const [uploadErr, uploadRes] = await noTryAsync(() =>
        fetch(upload.url, { method: 'POST', body: form }),
    );
    if (uploadErr || !uploadRes!.ok) {
        throw new Error(
            `PPTX upload to CloudConvert failed: ${uploadRes?.statusText ?? (uploadErr as Error).message}`,
        );
    }

    let downloadUrl: string | undefined;
    for (let attempts = 0; attempts < 120; attempts++) {
        await new Promise(r => setTimeout(r, 1500));
        const result = await getConversionResult(jobId);
        if (result.status === 'error')
            throw new Error(result.message ?? 'Conversion failed');
        onProgress?.({ step: result.step, percent: result.percent });
        if (result.status === 'finished') {
            downloadUrl = result.downloadUrl;
            break;
        }
    }
    if (!downloadUrl) throw new Error('Conversion timed out');

    const [fetchErr, res] = await noTryAsync(() => fetch(downloadUrl!));
    if (fetchErr || !res!.ok) {
        throw new Error(
            `PDF download failed: ${res?.statusText ?? (fetchErr as Error).message}`,
        );
    }
    return Buffer.from(await res!.arrayBuffer());
}
