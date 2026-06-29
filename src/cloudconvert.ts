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
