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

import {
    type Presentation,
    getPresentation,
    startImport,
    useImportStatus,
} from './api';

type DialogPhase = 'idle' | 'uploading' | 'processing';

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

const IMPORTS_FOLDER = 'presentations/_imports';

function isPptx(file: File): boolean {
    return file.name.toLowerCase().endsWith('.pptx') || file.type === PPTX_MIME;
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
    const pendingRef = useRef<{ filename: string; title: string } | null>(null);

    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [phase, setPhase] = useState<DialogPhase>('idle');
    const [jobId, setJobId] = useState<string | null>(null);

    const job = useImportStatus(jobId);

    const fileUpload = useFileUpload({
        createUpload: (f: File) =>
            (conn as any).caspar.uploadMedia(`${IMPORTS_FOLDER}/${f.name}`, f),
    });

    const busy = phase !== 'idle';

    const reset = () => {
        setTitle('');
        setFile(null);
        setPhase('idle');
        setJobId(null);
        pendingRef.current = null;
        fileUpload.reset();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Once the upload finishes, hand off to the server-side import job.
    useEffect(() => {
        if (phase !== 'uploading' || !pendingRef.current) return;
        if (fileUpload.state.phase === 'done') {
            const { filename, title: pTitle } = pendingRef.current;
            setPhase('processing');
            startImport(conn, { filename, title: pTitle })
                .then(j => setJobId(j.id))
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileUpload.state.phase]);

    // Watch the import job through to completion.
    useEffect(() => {
        if (!job) return;
        if (job.status === 'done' && job.presentationId) {
            const id = job.presentationId;
            getPresentation(conn, id)
                .then(p => {
                    reset();
                    if (p) onDone(p);
                    else onError(t('presentationIndex.importError'));
                })
                .catch((err: any) => {
                    reset();
                    onError(err?.message ?? t('presentationIndex.importError'));
                });
        } else if (job.status === 'error') {
            const msg = job.error ?? t('presentationIndex.importError');
            reset();
            onError(msg);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job?.status]);

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

        if (isPptx(file) && !pptxEnabled) {
            onError(t('presentationIndex.importPptxDisabled'));
            return;
        }

        setPhase('uploading');
        pendingRef.current = { filename: file.name, title: title.trim() };

        const [err] = await noTryAsync(() =>
            (conn as any).caspar.createFolder(IMPORTS_FOLDER),
        );
        if (err) {
            reset();
            onError(
                (err as any)?.message ?? t('presentationIndex.importError'),
            );
            return;
        }

        fileUpload.start([file]);
        fileUpload.confirm(); // skip review phase — start immediately
    };

    const progressLabel = (() => {
        if (phase === 'uploading')
            return t('presentationIndex.importUploading');
        if (phase === 'processing' && job) {
            if (job.status === 'converting') {
                const pct =
                    job.percent !== undefined
                        ? ` ${Math.round(job.percent)}%`
                        : '';
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
            if (job.status === 'creating')
                return t('presentationIndex.importCreating');
        }
        return '';
    })();

    const progressValue = (() => {
        if (phase === 'processing' && job) {
            if (job.status === 'converting' && job.percent !== undefined)
                return job.percent;
            if (job.status === 'rendering' && job.pageTotal)
                return ((job.pageDone ?? 0) / job.pageTotal) * 100;
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
