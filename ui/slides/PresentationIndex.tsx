import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { noTryAsync } from 'no-try';
import { useSocket, useContextMenu } from '@web-lib';
import { useTranslation } from '../i18n';

import SlidePreview from './SlidePreview';
import {
    type Presentation,
    createPresentation,
    deletePresentation,
    duplicatePresentation,
    usePresentations,
    useBackgroundImage,
    useImageThumbnails,
    slideRef,
    slideText,
} from './api';
import { slidesEditorUrl } from './urls';
import NameDialog from './NameDialog';
import ImportPdfDialog from './ImportPdfDialog';

export const PresentationIndex: React.FC = () => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const { presentations, refresh } = usePresentations();
    const backgroundUrl = useBackgroundImage();
    const [creating, setCreating] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [pptxEnabled, setPptxEnabled] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        conn.rawRequest('/api/plugin/lappis/presentations/convert', 'GET', {})
            .then((r: any) => setPptxEnabled(!!r?.data?.enabled))
            .catch(() => setPptxEnabled(false));
    }, [conn]);

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
                <Tooltip
                    title={t(
                        pptxEnabled
                            ? 'presentationIndex.importPdfTooltip'
                            : 'presentationIndex.importPdfOnlyTooltip',
                    )}
                >
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<UploadFileIcon />}
                        onClick={() => setImportOpen(true)}
                    >
                        {t(
                            pptxEnabled
                                ? 'presentationIndex.importPdf'
                                : 'presentationIndex.importPdfOnly',
                        )}
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
                        gridTemplateColumns:
                            'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 2.5,
                        minWidth: 0,
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
                            conn={conn}
                            onRefresh={refresh}
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
                pptxEnabled={pptxEnabled}
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
    conn: any;
    onRefresh: () => void;
}> = ({ presentation, backgroundUrl, conn, onRefresh }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const menu = useContextMenu();
    const [confirmDelete, setConfirmDelete] = useState(false);

    const firstSlide = presentation.slides[0];
    const coverMediaIds =
        firstSlide?.type === 'image' ? [firstSlide.mediaId] : [];
    const coverThumbs = useImageThumbnails(coverMediaIds);

    const menuItems = [
        {
            label: t('contextMenu.open'),
            icon: <OpenInNewIcon sx={{ fontSize: 18 }} />,
            onClick: () =>
                window.location.assign(slidesEditorUrl(presentation.id)),
        },
        {
            label: t('contextMenu.duplicate'),
            icon: <ContentCopyIcon sx={{ fontSize: 18 }} />,
            onClick: () =>
                duplicatePresentation(conn, presentation.id)
                    .then(onRefresh)
                    .catch(console.error),
        },
        {
            label: t('contextMenu.delete'),
            icon: <DeleteIcon sx={{ fontSize: 18 }} />,
            danger: true,
            divider: true,
            onClick: () => setConfirmDelete(true),
        },
    ];

    return (
        <>
            <Stack
                spacing={1}
                component="a"
                href={slidesEditorUrl(presentation.id)}
                onContextMenu={menu.bind(menuItems)}
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
                        firstSlide.type === 'image' ? (
                            <SlidePreview
                                imageUrl={
                                    coverThumbs[firstSlide.mediaId] ?? null
                                }
                            />
                        ) : (
                            <SlidePreview
                                text={slideText(firstSlide)}
                                reference={slideRef(firstSlide)}
                                backgroundUrl={backgroundUrl}
                            />
                        )
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

            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
            >
                <DialogTitle>
                    {t('presentationEditor.deleteConfirmTitle')}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {t('presentationEditor.deleteConfirmBody', {
                            title: presentation.title,
                        })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>
                        {t('panel.cancel')}
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => {
                            setConfirmDelete(false);
                            deletePresentation(conn, presentation.id)
                                .then(onRefresh)
                                .catch(console.error);
                        }}
                    >
                        {t('presentationEditor.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default PresentationIndex;
