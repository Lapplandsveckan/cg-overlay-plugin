import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { noTryAsync } from 'no-try';
import { useSocket, useFileUpload } from '@web-lib';
import { useTranslation } from '../i18n';

import SlidePreview from './SlidePreview';
import {
    type Presentation,
    createPresentation,
    usePresentations,
    useBackgroundImage,
    slideRef,
    slideText,
} from './api';
import { slidesEditorUrl } from './urls';
import NameDialog from './NameDialog';
import {
    slugify,
    makeSlideId,
    mediaIdFromPath,
    renderPdfToImages,
    type RenderProgress,
} from './import';

export const PresentationIndex: React.FC = () => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const { presentations } = usePresentations();
    const backgroundUrl = useBackgroundImage();
    const [creating, setCreating] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async (title: string) => {
        setCreateOpen(false);
        setCreating(true);
        setError(null);
        const [err, p] = await noTryAsync(() =>
            createPresentation(conn, { title, slides: [] }),
        );
        if (err) {
            console.error(err);
            setError((err as any)?.message ?? 'Failed to create presentation');
            setCreating(false);
            return;
        }
        window.location.assign(slidesEditorUrl(p!.id));
    };

    const handleImportDone = (p: Presentation) => {
        setImportOpen(false);
        window.location.assign(slidesEditorUrl(p.id));
    };

    const handleImportError = (msg: string) => {
        setImportOpen(false);
        setError(msg);
    };

    return (
        <Stack spacing={3}>
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
            >
                <Typography variant="h5" fontWeight={600}>
                    {t('presentationIndex.heading')}
                </Typography>
                <Tooltip title={t('presentationIndex.importPdfTooltip')}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<UploadFileIcon />}
                        onClick={() => setImportOpen(true)}
                    >
                        {t('presentationIndex.importPdf')}
                    </Button>
                </Tooltip>
            </Stack>

            {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {presentations === null ? (
                <Typography variant="body2" color="text.secondary">
                    {t('presentationIndex.loading')}
                </Typography>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                            lg: 'repeat(4, 1fr)',
                        },
                        gap: 2.5,
                    }}
                >
                    <CreateTile
                        onClick={() => setCreateOpen(true)}
                        disabled={creating}
                    />
                    {presentations.map(p => (
                        <PresentationTile
                            key={p.id}
                            presentation={p}
                            backgroundUrl={backgroundUrl}
                        />
                    ))}
                </Box>
            )}

            <NameDialog
                open={createOpen}
                title={t('presentationIndex.newPresentationDialogTitle')}
                initialName=""
                confirmLabel={t('presentationIndex.create')}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
            />

            <ImportPdfDialog
                open={importOpen}
                conn={conn}
                onDone={handleImportDone}
                onError={handleImportError}
                onClose={() => setImportOpen(false)}
            />
        </Stack>
    );
};

const CreateTile: React.FC<{ onClick: () => void; disabled: boolean }> = ({
    onClick,
    disabled,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    return (
        <Box
            onClick={disabled ? undefined : onClick}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={e => {
                if (disabled) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            sx={{
                cursor: disabled ? 'progress' : 'pointer',
                outline: 'none',
                aspectRatio: '16/9',
                borderRadius: 1.5,
                border: '1px dashed rgba(255,255,255,0.2)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                color: 'text.secondary',
                transition: 'border-color 120ms, background-color 120ms',
                '&:hover, &:focus-visible': disabled
                    ? {}
                    : {
                          borderColor: '#4a90e2',
                          backgroundColor: 'rgba(74,144,226,0.06)',
                          color: 'text.primary',
                      },
            }}
        >
            <Box
                component="span"
                sx={{ fontSize: 36, lineHeight: 1, fontWeight: 300 }}
            >
                +
            </Box>
            <Typography variant="body2">
                {disabled
                    ? t('panel.creating')
                    : t('presentationIndex.newPresentation')}
            </Typography>
        </Box>
    );
};

const PresentationTile: React.FC<{
    presentation: Presentation;
    backgroundUrl?: string | null;
}> = ({ presentation, backgroundUrl }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const firstSlide = presentation.slides[0];
    return (
        <Stack
            spacing={1}
            component="a"
            href={slidesEditorUrl(presentation.id)}
            sx={{
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
                '&:hover .pres-card-title': { color: '#4a90e2' },
                '&:hover .pres-thumb': { borderColor: '#4a90e2' },
            }}
        >
            <Box
                className="pres-thumb"
                sx={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 1.5,
                    transition: 'border-color 80ms',
                    overflow: 'hidden',
                }}
            >
                {firstSlide ? (
                    <SlidePreview
                        text={slideText(firstSlide)}
                        reference={slideRef(firstSlide)}
                        backgroundUrl={backgroundUrl}
                    />
                ) : (
                    <Box
                        sx={{
                            aspectRatio: '16/9',
                            backgroundColor: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(255,255,255,0.35)',
                            fontSize: 14,
                            fontStyle: 'italic',
                        }}
                    >
                        {t('presentationIndex.empty')}
                    </Box>
                )}
            </Box>
            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ paddingLeft: 0.25 }}
            >
                <Typography
                    className="pres-card-title"
                    variant="body1"
                    sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {presentation.title}
                </Typography>
                <Chip
                    label={`${presentation.slides.length}`}
                    size="small"
                    variant="outlined"
                />
            </Stack>
        </Stack>
    );
};

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

export default PresentationIndex;
