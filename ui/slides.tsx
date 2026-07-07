import React, { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { noTryAsync } from 'no-try';
import { useContextMenu, useRundownLive, useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import { setRundownDragPayload } from './drag';
import SlidePreview from './slides/SlidePreview';
import RunModal from './slides/RunModal';
import {
    createPresentation,
    deletePresentation,
    duplicatePresentation,
    pausePlayback,
    playSlide,
    resumePlayback,
    stopPlayback,
    type Presentation,
    slideRef,
    slideText,
    useBackgroundImage,
    useImageThumbnails,
    usePlaybackState,
    usePresentation,
    usePresentations,
} from './slides/api';
import { currentPath, slidesEditorUrl, slidesHomeUrl } from './slides/urls';

interface PresentationCardProps {
    presentation: Presentation;
    isLive: boolean;
    onRun: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}

const PresentationCard: React.FC<PresentationCardProps> = ({
    presentation,
    isLive,
    onRun,
    onEdit,
    onDuplicate,
    onDelete,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const firstSlide = presentation.slides[0];
    const backgroundUrl = useBackgroundImage();
    const coverMediaIds =
        firstSlide?.type === 'image' ? [firstSlide.mediaId] : [];
    const coverThumbs = useImageThumbnails(coverMediaIds);
    const menu = useContextMenu();
    const activate = () => (isLive ? onRun() : onEdit());

    const menuItems = [
        {
            label: t('contextMenu.playNow'),
            icon: <PlayArrowIcon sx={{ fontSize: 18 }} />,
            onClick: onRun,
        },
        {
            label: t('contextMenu.open'),
            icon: <EditIcon sx={{ fontSize: 18 }} />,
            onClick: onEdit,
        },
        {
            label: t('contextMenu.duplicate'),
            icon: <ContentCopyIcon sx={{ fontSize: 18 }} />,
            onClick: onDuplicate,
        },
        {
            label: t('contextMenu.delete'),
            icon: <DeleteIcon sx={{ fontSize: 18 }} />,
            danger: true,
            divider: true,
            onClick: onDelete,
        },
    ];

    return (
        <Box
            draggable
            onDragStart={e =>
                setRundownDragPayload(e, {
                    type: 'slides',
                    data: { presentationId: presentation.id },
                    title: presentation.title,
                })
            }
            onClick={activate}
            onContextMenu={menu.bind(menuItems)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
                if (e.key === 'Enter') activate();
            }}
            sx={{
                cursor: 'grab',
                userSelect: 'none',
                outline: 'none',
                '&:active': { cursor: 'grabbing' },
                '&:hover .pres-title': { color: '#4a90e2' },
                '&:hover .pres-thumb': { borderColor: '#4a90e2' },
            }}
        >
            <Stack spacing={0.75}>
                <Box
                    className="pres-thumb"
                    sx={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 1,
                        overflow: 'hidden',
                        transition: 'border-color 80ms',
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
                                fontSize: 12,
                                fontStyle: 'italic',
                            }}
                        >
                            {t('panel.emptySlide')}
                        </Box>
                    )}
                </Box>
                <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ paddingLeft: 0.25 }}
                >
                    <Typography
                        className="pres-title"
                        variant="body2"
                        sx={{
                            flexGrow: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#e8eaed',
                        }}
                    >
                        {presentation.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {presentation.slides.length}
                    </Typography>
                </Stack>
            </Stack>
        </Box>
    );
};

const SlidesTab: React.FC = () => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const isLive = useRundownLive();
    const playback = usePlaybackState();
    const { presentations } = usePresentations();
    const [creating, setCreating] = useState(false);
    const [query, setQuery] = useState('');
    const [runningId, setRunningId] = useState<string | null>(null);
    const running = usePresentation(runningId);
    const [deleting, setDeleting] = useState<Presentation | null>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!presentations) return [];
        return presentations.filter(
            p => !q || p.title.toLowerCase().includes(q),
        );
    }, [presentations, query]);

    const handleCreate = async () => {
        setCreating(true);
        const [err, p] = await noTryAsync(() =>
            createPresentation(conn, { title: 'Untitled', slides: [] }),
        );
        if (err) {
            console.error(err);
            setCreating(false);
            return;
        }
        window.location.assign(slidesEditorUrl(p!.id, currentPath()));
    };

    const handleDelete = async () => {
        if (!deleting) return;
        const [err] = await noTryAsync(() =>
            deletePresentation(conn, deleting.id),
        );
        if (err) console.error(err);
        setDeleting(null);
    };

    return (
        <Stack
            spacing={1.5}
            sx={{ padding: 1.5, height: '100%', boxSizing: 'border-box' }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
            >
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ minWidth: 0 }}
                    noWrap
                >
                    {t('panel.slidesHint')}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <TextField
                        size="small"
                        placeholder={t('panel.search')}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        sx={{ width: 160 }}
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
                    <Button
                        variant="outlined"
                        size="small"
                        component="a"
                        href={slidesHomeUrl()}
                    >
                        {t('panel.openAll')}
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleCreate}
                        disabled={creating}
                    >
                        {creating
                            ? t('panel.creating')
                            : t('panel.newPresentation')}
                    </Button>
                </Stack>
            </Stack>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
                {presentations === null ? null : presentations.length === 0 ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{ height: '100%', color: 'text.secondary' }}
                    >
                        <Typography variant="body2">
                            {t('panel.noPresentations')}
                        </Typography>
                    </Stack>
                ) : filtered.length === 0 ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{ height: '100%', color: 'text.secondary' }}
                    >
                        <Typography variant="body2">
                            {t('panel.noResults')}
                        </Typography>
                    </Stack>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 1.5,
                        }}
                    >
                        {filtered.map(p => (
                            <PresentationCard
                                key={p.id}
                                presentation={p}
                                isLive={isLive}
                                onRun={() => setRunningId(p.id)}
                                onEdit={() =>
                                    window.location.assign(
                                        slidesEditorUrl(p.id, currentPath()),
                                    )
                                }
                                onDuplicate={() =>
                                    duplicatePresentation(conn, p.id).catch(
                                        console.error,
                                    )
                                }
                                onDelete={() => setDeleting(p)}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            <RunModal
                open={!!runningId}
                presentation={running ?? null}
                playback={playback}
                onClose={() => setRunningId(null)}
                onClear={() => stopPlayback(conn).catch(console.error)}
                onPlay={(slideId, grabAttention) =>
                    runningId &&
                    playSlide(conn, runningId, slideId, grabAttention).catch(
                        console.error,
                    )
                }
                onPauseVideo={() => pausePlayback(conn).catch(console.error)}
                onResumeVideo={() => resumePlayback(conn).catch(console.error)}
            />

            <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
                <DialogTitle>
                    {t('presentationEditor.deleteConfirmTitle')}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {t('presentationEditor.deleteConfirmBody', {
                            title: deleting?.title,
                        })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleting(null)}>
                        {t('panel.cancel')}
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDelete}
                    >
                        {t('presentationEditor.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

export default SlidesTab;
