import { useCallback, useEffect, useState } from 'react';

import { useSocket } from '@web-lib';

import { type BroadcastReq, useBroadcast } from '../hooks';
import { ROOT } from './slides-crud';

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

export function startImport(
    conn: any,
    input: { filename: string; title: string },
): Promise<ImportJob> {
    return conn
        .rawRequest(`${ROOT}/presentations/import`, 'ACTION', input)
        .then((res: any) => res?.data);
}

export function getImportJob(conn: any, id: string): Promise<ImportJob | null> {
    return conn
        .rawRequest(`${ROOT}/presentation-imports/${id}`, 'GET', {})
        .then((res: any) => res?.data ?? null);
}

/** Translates an import job's status into a human-readable progress label. */
export function importJobLabel(
    job: ImportJob | null,
    t: (key: string, opts?: Record<string, unknown>) => string,
): string {
    if (!job) return '';
    if (job.status === 'converting') {
        const pct =
            job.percent !== undefined ? ` ${Math.round(job.percent)}%` : '';
        return `${t('presentationIndex.importConverting')}${pct}`;
    }
    if (job.status === 'rendering') {
        return job.pageTotal
            ? t('presentationIndex.importRendering', {
                  done: job.pageDone ?? 0,
                  total: job.pageTotal,
              })
            : t('presentationIndex.importRenderingStart');
    }
    if (job.status === 'creating') return t('presentationIndex.importCreating');
    return '';
}

/** Tracks a single import job's live status, from start through done/error. */
export function useImportStatus(jobId: string | null): ImportJob | null {
    const conn = useSocket();
    const [job, setJob] = useState<ImportJob | null>(null);

    useEffect(() => {
        if (!jobId) {
            setJob(null);
            return;
        }
        getImportJob(conn, jobId).then(setJob).catch(console.error);
    }, [conn, jobId]);

    const onUpdate = useCallback(
        (req: BroadcastReq) => {
            if (req.data?.id === jobId) setJob(req.data);
        },
        [jobId],
    );
    useBroadcast(
        conn,
        'plugin/lappis/presentation-imports',
        'UPDATE',
        onUpdate,
    );

    return job;
}
