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

type DialogPhase = 'idle' | 'rendering' | 'uploading' | 'creating';

interface ImportPdfDialogProps {
    open: boolean;
    conn: any;
    onDone: (p: Presentation) => void;
    onError: (msg: string) => void;
    onClose: () => void;
}

const ImportPdfDialog: React.FC<ImportPdfDialogProps> = ({
    open,
    conn,
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
        if (f && !title) setTitle(f.name.replace(/\.pdf$/i, ''));
    };

    const handleImport = async () => {
        if (!file || !title.trim()) return;

        setPhase('rendering');
        setRenderProgress({ done: 0, total: 0 });

        const [err, blobs] = await noTryAsync(() =>
            renderPdfToImages(file, p => setRenderProgress(p)),
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
                {t('presentationIndex.importDialogTitle')}
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
                        {file
                            ? file.name
                            : t('presentationIndex.importPickFile')}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf"
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
