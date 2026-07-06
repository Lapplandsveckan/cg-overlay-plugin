import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { noTryAsync } from 'no-try';
import { useSocket, useContextMenu } from '@web-lib';
import { useTranslation } from '../i18n';

import PresentationCover from './PresentationCover';
import CreateTile from './CreateTile';
import {
    type Presentation,
    createPresentation,
    deletePresentation,
    duplicatePresentation,
    usePresentations,
    useBackgroundImage,
} from './api';
import { currentPath, slidesEditorUrl } from './urls';
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
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!presentations) return [];
        return presentations.filter(
            p => !q || p.title.toLowerCase().includes(q),
        );
    }, [presentations, query]);

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
        window.location.assign(slidesEditorUrl(p!.id, currentPath()));
    };

    const handleImportDone = (p: Presentation) => {
        setImportOpen(false);
        window.location.assign(slidesEditorUrl(p.id, currentPath()));
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
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <TextField
                        size="small"
                        placeholder={t('presentationIndex.search')}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        sx={{ width: 200 }}
                        InputProps={{
                            endAdornment: query ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setQuery('')}
                                    >
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />
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
                    {filtered.map(p => (
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
            {presentations !== null &&
                query.trim() !== '' &&
                filtered.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        {t('presentationIndex.noResults')}
                    </Typography>
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

const PresentationTile: React.FC<{
    presentation: Presentation;
    backgroundUrl?: string | null;
    conn: any;
    onRefresh: () => void;
}> = ({ presentation, backgroundUrl, conn, onRefresh }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const menu = useContextMenu();
    const [confirmDelete, setConfirmDelete] = useState(false);

    const menuItems = [
        {
            label: t('contextMenu.open'),
            icon: <OpenInNewIcon sx={{ fontSize: 18 }} />,
            onClick: () =>
                window.location.assign(
                    slidesEditorUrl(presentation.id, currentPath()),
                ),
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
                href={slidesEditorUrl(presentation.id, currentPath())}
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
                    <PresentationCover
                        presentation={presentation}
                        backgroundUrl={backgroundUrl}
                    />
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
