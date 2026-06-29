import React, { useEffect, useRef, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { noTryAsync } from 'no-try';
import { useFileUpload } from '@web-lib';
import { useTranslation } from '../i18n';

import { type Presentation, createPresentation } from './api';
import {
    slugify,
    makeSlideId,
    mediaIdFromPath,
    renderPdfToImages,
    type RenderProgress,
} from './import';

type DialogPhase =
    | 'idle'
    | 'converting'
    | 'rendering'
    | 'uploading'
    | 'creating';

interface ImportPdfDialogProps {
    open: boolean;
    conn: any;
    pptxEnabled: boolean;
    onDone: (p: Presentation) => void;
    onError: (msg: string) => void;
    onClose: () => void;
}

const PPTX_MIME =
    'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function isPptx(file: File): boolean {
    return file.name.toLowerCase().endsWith('.pptx') || file.type === PPTX_MIME;
}

interface ConvertProgress {
    step?: 'upload' | 'convert' | 'export';
    percent?: number;
}

/** Convert PPTX → PDF via CloudConvert (backend creates the job; browser uploads/downloads directly). */
async function convertPptxToPdf(
    file: File,
    conn: any,
    onProgress?: (p: ConvertProgress) => void,
): Promise<File> {
    // 1. Backend creates the CloudConvert job and returns a pre-signed upload form.
    const [createErr, job] = await noTryAsync(() =>
        conn.rawRequest(
            '/api/plugin/lappis/presentations/convert/create',
            'ACTION',
            {
                filename: file.name,
            },
        ),
    );
    if (createErr)
        throw new Error(
            `Failed to create conversion job: ${(createErr as Error).message}`,
        );

    const { jobId, upload } = (job as any)?.data as {
        jobId: string;
        upload: { url: string; parameters: Record<string, string> };
    };

    // 2. Browser uploads PPTX directly to CloudConvert via the pre-signed form.
    onProgress?.({ step: 'upload' });
    const form = new FormData();
    for (const [k, v] of Object.entries(upload.parameters)) form.append(k, v);
    form.append('file', file); // file field must be last

    const [uploadErr, uploadRes] = await noTryAsync(() =>
        fetch(upload.url, { method: 'POST', body: form }),
    );
    if (uploadErr || !uploadRes!.ok) {
        throw new Error(
            `PPTX upload to CloudConvert failed: ${uploadRes?.statusText ?? (uploadErr as Error).message}`,
        );
    }

    // 3. Poll job status until finished or error.
    let downloadUrl: string | undefined;
    for (let attempts = 0; attempts < 120; attempts++) {
        await new Promise(r => setTimeout(r, 1500));
        const [pollErr, result] = await noTryAsync(() =>
            conn.rawRequest(
                '/api/plugin/lappis/presentations/convert/status',
                'ACTION',
                {
                    jobId,
                },
            ),
        );
        if (pollErr)
            throw new Error(`Polling failed: ${(pollErr as Error).message}`);
        const {
            status,
            downloadUrl: url,
            message,
            step,
            percent,
        } = (result as any)?.data as {
            status: string;
            downloadUrl?: string;
            message?: string;
            step?: ConvertProgress['step'];
            percent?: number;
        };
        if (status === 'error') throw new Error(message ?? 'Conversion failed');
        onProgress?.({ step, percent });
        if (status === 'finished') {
            downloadUrl = url;
            break;
        }
    }
    if (!downloadUrl) throw new Error('Conversion timed out');

    // 4. Browser fetches the resulting PDF directly from CloudConvert.
    const [fetchErr, res] = await noTryAsync(() => fetch(downloadUrl!));
    if (fetchErr || !res!.ok) {
        throw new Error(
            `PDF download failed: ${res?.statusText ?? (fetchErr as Error).message}`,
        );
    }
    const blob = await res!.blob();
    return new File([blob], file.name.replace(/\.pptx$/i, '.pdf'), {
        type: 'application/pdf',
    });
}

const ImportPdfDialog: React.FC<ImportPdfDialogProps> = ({
    open,
    conn,
    pptxEnabled,
    onDone,
    onError,
    onClose,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderRef = useRef('');
    const pendingRef = useRef<{ title: string; mediaIds: string[] } | null>(
        null,
    );

    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [phase, setPhase] = useState<DialogPhase>('idle');
    const [convertProgress, setConvertProgress] = useState<ConvertProgress>({});
    const [renderProgress, setRenderProgress] = useState<RenderProgress>({
        done: 0,
        total: 0,
    });

    const fileUpload = useFileUpload({
        createUpload: (f: File) =>
            (conn as any).caspar.uploadMedia(
                `${folderRef.current}${f.name}`,
                f,
            ),
    });

    const busy = phase !== 'idle';

    const reset = () => {
        setTitle('');
        setFile(null);
        setPhase('idle');
        setConvertProgress({});
        setRenderProgress({ done: 0, total: 0 });
        pendingRef.current = null;
        folderRef.current = '';
        fileUpload.reset();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Once uploads finish, create the presentation.
    useEffect(() => {
        if (phase !== 'uploading' || !pendingRef.current) return;
        if (fileUpload.state.phase === 'done') {
            const { title: pTitle, mediaIds } = pendingRef.current;
            setPhase('creating');
            const slides = mediaIds.map(mediaId => ({
                type: 'image' as const,
                id: makeSlideId(),
                mediaId,
            }));
            createPresentation(conn, { title: pTitle, slides })
                .then(p => {
                    reset();
                    onDone(p);
                })
                .catch((err: any) => {
                    reset();
                    onError(err?.message ?? t('presentationIndex.importError'));
                });
        } else if (fileUpload.state.phase === 'error') {
            const msg =
                fileUpload.state.error ?? t('presentationIndex.importError');
            reset();
            onError(msg);
        }
    }, [fileUpload.state.phase]);

    const handleClose = () => {
        if (busy) return;
        reset();
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        if (f && !title) setTitle(f.name.replace(/\.(pdf|pptx)$/i, ''));
    };

    const handleImport = async () => {
        if (!file || !title.trim()) return;

        let pdfFile = file;

        if (isPptx(file)) {
            if (!pptxEnabled) {
                onError(t('presentationIndex.importPptxDisabled'));
                return;
            }
            setPhase('converting');
            setConvertProgress({});
            const [err, converted] = await noTryAsync(() =>
                convertPptxToPdf(file, conn, p => setConvertProgress(p)),
            );
            if (err) {
                reset();
                onError(
                    (err as any)?.message ?? t('presentationIndex.importError'),
                );
                return;
            }
            pdfFile = converted!;
        }

        setPhase('rendering');
        setRenderProgress({ done: 0, total: 0 });

        const [err, blobs] = await noTryAsync(() =>
            renderPdfToImages(pdfFile, p => setRenderProgress(p)),
        );
        if (err) {
            reset();
            onError(
                (err as any)?.message ?? t('presentationIndex.importError'),
            );
            return;
        }

        const folder = `presentations/${slugify(title.trim())}/`;
        folderRef.current = folder;

        const uploadFiles = blobs!.map((blob, i) => {
            const pad = String(i + 1).padStart(2, '0');
            return new File([blob], `page-${pad}.png`, { type: 'image/png' });
        });

        pendingRef.current = {
            title: title.trim(),
            mediaIds: uploadFiles.map(f =>
                mediaIdFromPath(`${folder}${f.name}`),
            ),
        };

        // Ensure the destination folder exists before uploading.
        await (conn as any).caspar.createFolder(folder.replace(/\/$/, ''));

        setPhase('uploading');
        fileUpload.start(uploadFiles);
        fileUpload.confirm(); // skip review phase — start immediately
    };

    const progressLabel = (() => {
        if (phase === 'converting') {
            const pct =
                convertProgress.percent !== undefined
                    ? ` ${Math.round(convertProgress.percent)}%`
                    : '';
            return `${t('presentationIndex.importConverting')}${pct}`;
        }
        if (phase === 'rendering') {
            return renderProgress.total > 0
                ? t('presentationIndex.importRendering', {
                      done: renderProgress.done,
                      total: renderProgress.total,
                  })
                : t('presentationIndex.importRenderingStart');
        }
        if (phase === 'uploading') {
            const { currentIndex, queue } = fileUpload.state;
            return t('presentationIndex.importUploading', {
                done: currentIndex + 1,
                total: queue.length,
            });
        }
        if (phase === 'creating') return t('presentationIndex.importCreating');
        return '';
    })();

    const progressValue = (() => {
        if (phase === 'converting' && convertProgress.percent !== undefined)
            return convertProgress.percent;
        if (phase === 'rendering' && renderProgress.total > 0)
            return (renderProgress.done / renderProgress.total) * 100;
        if (phase === 'uploading') {
            const { currentIndex, queue, currentProgress } = fileUpload.state;
            if (!queue.length) return undefined;
            return (
                ((currentIndex + currentProgress / 100) / queue.length) * 100
            );
        }
        return undefined;
    })();

    const accept = pptxEnabled
        ? `application/pdf,.pdf,${PPTX_MIME},.pptx`
        : 'application/pdf,.pdf';
    const pickLabel = pptxEnabled
        ? t('presentationIndex.importPickFile')
        : t('presentationIndex.importPickFilePdf');

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                component: 'form',
                onSubmit: (e: React.FormEvent) => {
                    e.preventDefault();
                    handleImport();
                },
            }}
        >
            <DialogTitle>
                {pptxEnabled
                    ? t('presentationIndex.importDialogTitle')
                    : t('presentationIndex.importDialogTitlePdf')}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ marginTop: 1 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadFileIcon />}
                        disabled={busy}
                        sx={{
                            justifyContent: 'flex-start',
                            textTransform: 'none',
                        }}
                    >
                        {file ? file.name : pickLabel}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={accept}
                            hidden
                            onChange={handleFileChange}
                        />
                    </Button>
                    <TextField
                        label={t('presentationIndex.importTitleLabel')}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        disabled={busy}
                        fullWidth
                        autoFocus={false}
                    />
                    {busy && (
                        <Stack spacing={0.5}>
                            <LinearProgress
                                variant={
                                    progressValue !== undefined
                                        ? 'determinate'
                                        : 'indeterminate'
                                }
                                value={progressValue}
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {progressLabel}
                            </Typography>
                            {phase === 'converting' && (
                                <Typography
                                    variant="caption"
                                    color="text.disabled"
                                >
                                    {t(
                                        'presentationIndex.importConvertingHint',
                                    )}
                                </Typography>
                            )}
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button type="button" onClick={handleClose} disabled={busy}>
                    {t('presentationIndex.importCancel')}
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    disabled={busy || !file || !title.trim()}
                >
                    {busy
                        ? t('presentationIndex.importImporting')
                        : t('presentationIndex.importConfirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImportPdfDialog;
