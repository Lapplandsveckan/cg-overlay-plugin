/* eslint-disable max-lines */
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    InputAdornment,
    Link,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { noTryAsync } from 'no-try';
import {
    useSocket,
    MediaDropZone,
    UploadButton,
    useContextMenu,
} from '@web-lib';
import { useTranslation } from '../i18n';
import NameDialog from './NameDialog';

import SlidePreview from './SlidePreview';
import {
    type BibleSlide,
    type HeadingSlide,
    type ImageSlide,
    type Slide,
    type TextSlide,
    type VideoSlide,
    buildThumbnailUrl,
    slideLabel,
    updatePresentation,
    deletePresentation,
    usePresentation,
    useBackgroundImage,
    useFullImage,
    useImageThumbnails,
    fetchBibleSlides,
} from './api';
import {
    BOOKS,
    TRANSLATIONS,
    composeReference,
    normalize,
    parseReference,
    type Book,
} from './bible-api';
import { backTargetFromSearch, slidesHomeUrl } from './urls';
import { formatTime } from '../format';
import { type BroadcastReq, useBroadcast } from '../hooks';
import {
    DEFAULT_FPS,
    fullDurationOf,
    isTrimmed,
    normalizeVideoPayload,
} from '../video-utils';
import { type VideoInspectorValue } from '../play-video/VideoInspector';
import VideoInspectorModal from '../play-video/VideoInspectorModal';

const IMAGE_CODECS = new Set([
    'mjpeg',
    'png',
    'bmp',
    'gif',
    'webp',
    'tiff',
    'jpeg',
    'apng',
]);

/** Classifies a CasparCG media item as a still image or a video, or null if unusable. */
function classifyMedia(item: any): 'image' | 'video' | null {
    const streams = item.mediainfo?.streams;
    if (!streams) return null;
    const duration = Number(item.mediainfo?.format?.duration) || 0;
    const hasAudio = streams.some((s: any) => s.codec?.type === 'audio');
    const hasImageCodec = streams.some((s: any) =>
        IMAGE_CODECS.has(s.codec?.name),
    );
    if (!hasAudio && (hasImageCodec || duration === 0)) return 'image';
    return duration > 0 ? 'video' : null;
}

interface MediaPickerProps {
    selectedId: string | null;
    onSelect: (id: string, kind: 'image' | 'video') => void;
}

const MediaPicker: React.FC<MediaPickerProps> = ({ selectedId, onSelect }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [allMedia, setAllMedia] = useState<
        { item: any; kind: 'image' | 'video' }[]
    >([]);
    const [query, setQuery] = useState('');

    useEffect(() => {
        const load = () =>
            (conn as any).caspar
                .getMedia()
                .then((media: Map<string, any>) => {
                    const items: { item: any; kind: 'image' | 'video' }[] = [];
                    for (const item of media.values()) {
                        const kind = classifyMedia(item);
                        if (kind) items.push({ item, kind });
                    }
                    setAllMedia(items);
                })
                .catch(console.error);

        load();
        (conn as any).caspar.on('media', load);
        return () => void (conn as any).caspar.off('media', load);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allMedia;
        return allMedia.filter(m => m.item.id.toLowerCase().includes(q));
    }, [allMedia, query]);

    return (
        <MediaDropZone
            accept={['image/*', 'video/*']}
            overlayLabel={t('presentationEditor.dropToUpload')}
        >
            <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        size="small"
                        placeholder={t(
                            'presentationEditor.imageSearchPlaceholder',
                        )}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        sx={{ flexGrow: 1 }}
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
                    <UploadButton
                        label={t('presentationEditor.uploadImage')}
                        multiple
                        types={[
                            {
                                description: 'Media',
                                accept: {
                                    'image/*': [
                                        '.png',
                                        '.jpg',
                                        '.jpeg',
                                        '.gif',
                                        '.bmp',
                                        '.webp',
                                        '.tiff',
                                    ],
                                    'video/*': [
                                        '.mp4',
                                        '.mov',
                                        '.mxf',
                                        '.mkv',
                                        '.webm',
                                    ],
                                },
                            },
                        ]}
                        createUpload={(file: File) =>
                            (conn as any).caspar.uploadMedia(file.name, file)
                        }
                    />
                </Stack>
                <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
                    {filtered.length === 0 ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ py: 2, textAlign: 'center' }}
                        >
                            {t('presentationEditor.noImages')}
                        </Typography>
                    ) : (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(auto-fill, minmax(120px, 1fr))',
                                gap: 1,
                            }}
                        >
                            {filtered.map(({ item, kind }) => {
                                const thumbUrl = buildThumbnailUrl(item);
                                const name =
                                    item.id.split('/').pop() ?? item.id;
                                const isSelected = item.id === selectedId;
                                return (
                                    <Box
                                        key={item.id}
                                        onClick={() => onSelect(item.id, kind)}
                                        sx={{
                                            position: 'relative',
                                            aspectRatio: '16/9',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            backgroundColor: '#1a1c22',
                                            backgroundImage: thumbUrl
                                                ? `url(${thumbUrl})`
                                                : undefined,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            border: isSelected
                                                ? '2px solid #4a90e2'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            cursor: 'pointer',
                                            transition: 'border-color 80ms',
                                            '&:hover': {
                                                borderColor: isSelected
                                                    ? '#4a90e2'
                                                    : '#fff',
                                            },
                                        }}
                                    >
                                        {kind === 'video' && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor:
                                                        'rgba(0,0,0,0.2)',
                                                    pointerEvents: 'none',
                                                }}
                                            >
                                                <PlayArrowIcon
                                                    sx={{
                                                        fontSize: 28,
                                                        color: 'rgba(255,255,255,0.85)',
                                                    }}
                                                />
                                            </Box>
                                        )}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                padding: '3px 5px',
                                                backgroundColor:
                                                    'rgba(0,0,0,0.6)',
                                            }}
                                        >
                                            <Typography
                                                fontSize={10}
                                                noWrap
                                                sx={{ color: '#e8eaed' }}
                                                title={item.id}
                                            >
                                                {name}
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Box>
            </Stack>
        </MediaDropZone>
    );
};

interface Props {
    id: string;
}

function makeSlideId(): string {
    return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const PresentationEditor: React.FC<Props> = ({ id }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const remote = usePresentation(id);
    const backFrom = backTargetFromSearch(window.location.search);
    const backgroundUrl = useBackgroundImage();

    const [renameOpen, setRenameOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Slide | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderedSlides, setOrderedSlides] = useState<Slide[]>(
        remote?.slides ?? [],
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [anchorId, setAnchorId] = useState<string | null>(null);
    const isPainting = useRef(false);
    const paintedAny = useRef(false);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const dialogOpen =
        renameOpen ||
        addOpen ||
        !!editing ||
        confirmDelete ||
        confirmBulkDelete;

    const clearSelection = () => {
        setSelectedIds(new Set());
        setAnchorId(null);
    };

    useEffect(() => {
        if (!remote) return;
        setOrderedSlides(prev =>
            JSON.stringify(prev) === JSON.stringify(remote.slides)
                ? prev
                : remote.slides,
        );
        const validIds = new Set(remote.slides.map(s => s.id));
        setSelectedIds(prev => {
            const next = new Set([...prev].filter(id => validIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
        setAnchorId(prev => (prev && validIds.has(prev) ? prev : null));
    }, [remote?.slides]);

    useEffect(() => {
        if (selectedIds.size === 0) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedIds(new Set());
                setAnchorId(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedIds.size]);

    useEffect(() => {
        if (dialogOpen) return;

        const onDocMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            const target = e.target as HTMLElement;
            if (
                target.closest?.(
                    'button, a, input, textarea, select, [role="button"], [role="menu"], [role="menuitem"], [role="dialog"], [contenteditable], [data-slide-card]',
                )
            ) {
                return;
            }
            e.preventDefault();
            isPainting.current = true;
            paintedAny.current = false;
            setAnchorId(null);
            const prevUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';
            const onMouseUp = () => {
                isPainting.current = false;
                document.body.style.userSelect = prevUserSelect;
                window.removeEventListener('mouseup', onMouseUp);
                if (!paintedAny.current) clearSelection();
            };
            window.addEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [dialogOpen]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );
    const imageMediaIds = useMemo(
        () =>
            (remote?.slides ?? [])
                .filter(s => s.type === 'image' || s.type === 'video')
                .map(s => (s as ImageSlide | VideoSlide).mediaId),
        [remote?.slides],
    );
    const imageThumbnails = useImageThumbnails(imageMediaIds);

    const handleRename = async (title: string) => {
        setRenameOpen(false);
        const [err] = await noTryAsync(() =>
            updatePresentation(conn, id, { title }),
        );
        if (err) {
            console.error(err);
            setError('Failed to rename presentation');
        }
    };

    if (remote === undefined) {
        return (
            <CenteredMessage>{t('presentationEditor.loading')}</CenteredMessage>
        );
    }
    if (remote === null) {
        return (
            <CenteredMessage>
                <Stack spacing={1.5} alignItems="center">
                    <Typography variant="body1">
                        {t('presentationEditor.notFound')}
                    </Typography>
                    <Link href={backFrom ?? slidesHomeUrl()}>
                        {t('presentationEditor.home')}
                    </Link>
                </Stack>
            </CenteredMessage>
        );
    }

    const persistSlides = async (slides: Slide[]) => {
        setError(null);
        const [err] = await noTryAsync(() =>
            updatePresentation(conn, id, { slides }),
        );
        if (err) {
            console.error(err);
            setError((err as any)?.message ?? 'Failed to save slides');
        }
    };

    const handleAddSlides = (slides: Slide[]) => {
        persistSlides([...remote.slides, ...slides]);
        setAddOpen(false);
    };

    const handleUpdateSlide = (updated: Slide) => {
        persistSlides(
            remote.slides.map(s => (s.id === updated.id ? updated : s)),
        );
        setEditing(null);
    };

    const handleDeleteSlide = (slideId: string) => {
        persistSlides(remote.slides.filter(s => s.id !== slideId));
    };

    const addToSelection = (slideId: string) => {
        paintedAny.current = true;
        setSelectedIds(prev =>
            prev.has(slideId) ? prev : new Set(prev).add(slideId),
        );
    };

    const handleSelectSlide = (slideId: string, e: React.MouseEvent) => {
        if (e.shiftKey && anchorId) {
            const anchorIdx = orderedSlides.findIndex(s => s.id === anchorId);
            const targetIdx = orderedSlides.findIndex(s => s.id === slideId);
            if (anchorIdx !== -1 && targetIdx !== -1) {
                const [from, to] =
                    anchorIdx < targetIdx
                        ? [anchorIdx, targetIdx]
                        : [targetIdx, anchorIdx];
                setSelectedIds(
                    new Set(orderedSlides.slice(from, to + 1).map(s => s.id)),
                );
                return;
            }
        }
        if (e.metaKey || e.ctrlKey) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(slideId)) next.delete(slideId);
                else next.add(slideId);
                return next;
            });
            setAnchorId(slideId);
            return;
        }
        setSelectedIds(new Set([slideId]));
        setAnchorId(slideId);
    };

    const deleteSelected = () => {
        if (selectedIds.size >= 2) {
            setConfirmBulkDelete(true);
            return;
        }
        persistSlides(remote.slides.filter(s => !selectedIds.has(s.id)));
        clearSelection();
    };

    const confirmDeleteSelected = () => {
        setConfirmBulkDelete(false);
        persistSlides(remote.slides.filter(s => !selectedIds.has(s.id)));
        clearSelection();
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(String(event.active.id));
    };

    const handleDragCancel = () => {
        setActiveDragId(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        if (selectedIds.has(activeId) && selectedIds.size > 1) {
            const activeIndex = orderedSlides.findIndex(s => s.id === activeId);
            const overIndex = orderedSlides.findIndex(s => s.id === overId);
            if (activeIndex === -1 || overIndex === -1) return;
            const draggingUp = activeIndex > overIndex;
            const moving = orderedSlides.filter(s => selectedIds.has(s.id));
            const remaining = orderedSlides.filter(s => !selectedIds.has(s.id));
            const insertBefore = remaining.findIndex(s => {
                const idx = orderedSlides.indexOf(s);
                return draggingUp ? idx >= overIndex : idx > overIndex;
            });
            const next =
                insertBefore === -1
                    ? [...remaining, ...moving]
                    : [
                          ...remaining.slice(0, insertBefore),
                          ...moving,
                          ...remaining.slice(insertBefore),
                      ];
            setOrderedSlides(next);
            persistSlides(next);
            return;
        }

        const oldIndex = orderedSlides.findIndex(s => s.id === activeId);
        const newIndex = orderedSlides.findIndex(s => s.id === overId);
        if (oldIndex === -1 || newIndex === -1) return;

        const next = arrayMove(orderedSlides, oldIndex, newIndex);
        setOrderedSlides(next);
        persistSlides(next);
    };

    const handleDeletePresentation = async () => {
        setConfirmDelete(false);
        const [err] = await noTryAsync(() => deletePresentation(conn, id));
        if (err) {
            console.error(err);
            setError('Failed to delete presentation');
            return;
        }
        window.location.assign(backFrom ?? slidesHomeUrl());
    };

    const isGroupDrag =
        activeDragId !== null &&
        selectedIds.has(activeDragId) &&
        selectedIds.size > 1;
    const activeSlide = activeDragId
        ? orderedSlides.find(s => s.id === activeDragId)
        : null;

    return (
        <Box
            sx={{ maxWidth: 1400, margin: '0 auto', padding: { xs: 2, md: 3 } }}
        >
            <Stack spacing={3}>
                <Button
                    variant="text"
                    size="small"
                    startIcon={<ArrowBackIcon />}
                    onClick={() =>
                        backFrom
                            ? window.location.assign(backFrom)
                            : window.history.back()
                    }
                    sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
                >
                    {t('presentationEditor.back')}
                </Button>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography
                        variant="h2"
                        fontWeight={600}
                        sx={
                            !remote.title
                                ? {
                                      color: 'text.disabled',
                                      fontStyle: 'italic',
                                  }
                                : undefined
                        }
                    >
                        {remote.title || t('presentationEditor.untitled')}
                    </Typography>
                    <Tooltip title={t('presentationEditor.renameTooltip')}>
                        <IconButton
                            onClick={() => setRenameOpen(true)}
                            sx={{
                                width: 32,
                                height: 32,
                                padding: 0,
                                color: 'text.secondary',
                                '&:hover': { color: 'text.primary' },
                            }}
                        >
                            <EditIcon sx={{ fontSize: 19 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('presentationEditor.deleteButton')}>
                        <IconButton
                            onClick={() => setConfirmDelete(true)}
                            sx={{
                                width: 32,
                                height: 32,
                                padding: 0,
                                color: 'text.secondary',
                                '&:hover': { color: 'error.main' },
                            }}
                        >
                            <DeleteIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                    </Tooltip>
                    <Box sx={{ flexGrow: 1 }} />
                    <Chip
                        label={t('slides.slideCount', {
                            count: remote.slides.length,
                        })}
                        variant="outlined"
                    />
                    <Button
                        variant="contained"
                        onClick={() => setAddOpen(true)}
                    >
                        {t('presentationEditor.addSlides')}
                    </Button>
                </Stack>

                <NameDialog
                    open={renameOpen}
                    title={t('presentationEditor.renameDialogTitle')}
                    initialName={remote.title}
                    onClose={() => setRenameOpen(false)}
                    onSubmit={handleRename}
                />

                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{
                        padding: '6px 12px',
                        borderRadius: 1,
                        backgroundColor: 'rgba(255,255,255,0.06)',
                    }}
                >
                    <Typography variant="body2">
                        {t('presentationEditor.slidesSelected', {
                            count: selectedIds.size,
                        })}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button
                        size="small"
                        color="error"
                        disabled={selectedIds.size === 0}
                        startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                        onClick={deleteSelected}
                    >
                        {selectedIds.size === 1
                            ? t('presentationEditor.deleteSlide')
                            : t('presentationEditor.deleteNSlides', {
                                  count: selectedIds.size,
                              })}
                    </Button>
                    <Button
                        size="small"
                        disabled={selectedIds.size === 0}
                        startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                        onClick={clearSelection}
                    >
                        {t('presentationEditor.clearSelection')}
                    </Button>
                </Stack>

                {orderedSlides.length === 0 ? (
                    <EmptyState onAdd={() => setAddOpen(true)} />
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <SortableContext
                            items={orderedSlides.map(s => s.id)}
                            strategy={rectSortingStrategy}
                        >
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
                                {orderedSlides.map((slide, idx) => (
                                    <SlideCard
                                        key={slide.id}
                                        slide={slide}
                                        index={idx + 1}
                                        backgroundUrl={backgroundUrl}
                                        imageThumbnails={imageThumbnails}
                                        selected={selectedIds.has(slide.id)}
                                        selectionCount={selectedIds.size}
                                        dimmed={
                                            isGroupDrag &&
                                            selectedIds.has(slide.id) &&
                                            slide.id !== activeDragId
                                        }
                                        suppressTransform={
                                            isGroupDrag &&
                                            slide.id === activeDragId
                                        }
                                        onSelect={e =>
                                            handleSelectSlide(slide.id, e)
                                        }
                                        onPaintEnter={() => {
                                            if (isPainting.current)
                                                addToSelection(slide.id);
                                        }}
                                        onEdit={() => setEditing(slide)}
                                        onDelete={() =>
                                            handleDeleteSlide(slide.id)
                                        }
                                        onDeleteSelected={deleteSelected}
                                    />
                                ))}
                            </Box>
                        </SortableContext>
                        <DragOverlay>
                            {isGroupDrag && activeSlide ? (
                                <GroupDragPreview
                                    slide={activeSlide}
                                    count={selectedIds.size}
                                    backgroundUrl={backgroundUrl}
                                    imageThumbnails={imageThumbnails}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </Stack>

            <AddSlidesDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onAdd={handleAddSlides}
            />

            <EditSlideDialog
                slide={editing}
                onClose={() => setEditing(null)}
                onSave={handleUpdateSlide}
            />

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
                            title: remote.title,
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
                        onClick={handleDeletePresentation}
                    >
                        {t('presentationEditor.delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmBulkDelete}
                onClose={() => setConfirmBulkDelete(false)}
            >
                <DialogTitle>
                    {t('presentationEditor.deleteSlidesConfirmTitle')}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {t('presentationEditor.deleteSlidesConfirmBody', {
                            count: selectedIds.size,
                        })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmBulkDelete(false)}>
                        {t('panel.cancel')}
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={confirmDeleteSelected}
                    >
                        {t('presentationEditor.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const CenteredMessage: React.FC<React.PropsWithChildren> = ({ children }) => (
    <Box sx={{ padding: 6, textAlign: 'center', color: 'text.secondary' }}>
        {children}
    </Box>
);

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    return (
        <Box
            sx={{
                padding: 6,
                textAlign: 'center',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: 2,
                color: 'text.secondary',
            }}
        >
            <Stack spacing={1.5} alignItems="center">
                <Typography variant="body1">
                    {t('presentationEditor.noSlidesYet')}
                </Typography>
                <Typography variant="body2">
                    {t('presentationEditor.noSlidesHelper')}
                </Typography>
                <Button variant="contained" size="small" onClick={onAdd}>
                    {t('presentationEditor.addSlides')}
                </Button>
            </Stack>
        </Box>
    );
};

interface SlideContentProps {
    slide: Slide;
    backgroundUrl?: string | null;
    imageThumbnails?: Record<string, string>;
    selected?: boolean;
    dimmed?: boolean;
}

const SlideContent: React.FC<SlideContentProps> = ({
    slide,
    backgroundUrl,
    imageThumbnails,
    selected,
    dimmed,
}) =>
    slide.type === 'image' || slide.type === 'video' ? (
        <SlidePreview
            imageUrl={imageThumbnails?.[slide.mediaId] ?? null}
            isVideo={slide.type === 'video'}
            selected={selected}
            dimmed={dimmed}
        />
    ) : (
        <SlidePreview
            text={slide.text}
            reference={slide.type === 'bible' ? slide.reference : ''}
            heading={slide.type === 'heading'}
            backgroundUrl={backgroundUrl}
            selected={selected}
            dimmed={dimmed}
        />
    );

interface GroupDragPreviewProps {
    slide: Slide;
    count: number;
    backgroundUrl?: string | null;
    imageThumbnails?: Record<string, string>;
}

const GroupDragPreview: React.FC<GroupDragPreviewProps> = ({
    slide,
    count,
    backgroundUrl,
    imageThumbnails,
}) => (
    <Box sx={{ position: 'relative' }}>
        <SlideContent
            slide={slide}
            backgroundUrl={backgroundUrl}
            imageThumbnails={imageThumbnails}
            selected
        />
        <Box
            sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                minWidth: 22,
                height: 22,
                padding: '0 6px',
                borderRadius: 11,
                backgroundColor: '#4a90e2',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {count}
        </Box>
    </Box>
);

interface SlideCardProps {
    slide: Slide;
    index: number;
    backgroundUrl?: string | null;
    imageThumbnails?: Record<string, string>;
    selected: boolean;
    selectionCount: number;
    dimmed?: boolean;
    suppressTransform?: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onPaintEnter: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onDeleteSelected: () => void;
}

const SlideCard: React.FC<SlideCardProps> = ({
    slide,
    index,
    backgroundUrl,
    imageThumbnails,
    selected,
    selectionCount,
    dimmed,
    suppressTransform,
    onSelect,
    onPaintEnter,
    onEdit,
    onDelete,
    onDeleteSelected,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const menu = useContextMenu();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: slide.id });

    const menuItems =
        selected && selectionCount > 1
            ? [
                  {
                      label: t('presentationEditor.deleteNSlides', {
                          count: selectionCount,
                      }),
                      icon: <DeleteIcon sx={{ fontSize: 16 }} />,
                      danger: true,
                      onClick: onDeleteSelected,
                  },
              ]
            : [
                  {
                      label: t('presentationEditor.editSlide'),
                      icon: <EditIcon sx={{ fontSize: 16 }} />,
                      onClick: onEdit,
                  },
                  {
                      label: t('presentationEditor.deleteSlide'),
                      icon: <DeleteIcon sx={{ fontSize: 16 }} />,
                      danger: true,
                      divider: true,
                      onClick: onDelete,
                  },
              ];

    const handleContextMenu = (e: React.MouseEvent) => {
        menu.bind(menuItems)(e);
    };

    return (
        <Stack
            spacing={1}
            ref={setNodeRef}
            data-slide-card=""
            onMouseEnter={onPaintEnter}
            onContextMenu={handleContextMenu}
            style={{
                transform: suppressTransform
                    ? undefined
                    : CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                zIndex: isDragging ? 1 : 'auto',
            }}
        >
            <Box
                onClick={onSelect}
                onMouseDown={e => {
                    if (e.shiftKey) e.preventDefault();
                }}
                sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    userSelect: 'none',
                    '&:hover .slide-overlay': { opacity: 1 },
                }}
            >
                <SlideContent
                    slide={slide}
                    backgroundUrl={backgroundUrl}
                    imageThumbnails={imageThumbnails}
                    selected={selected}
                    dimmed={dimmed}
                />
                <Stack
                    className="slide-overlay"
                    direction="row"
                    spacing={0.5}
                    onClick={e => e.stopPropagation()}
                    sx={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        opacity: 0,
                        transition: 'opacity 80ms',
                    }}
                >
                    <Tooltip title={t('presentationEditor.reorderSlide')}>
                        <IconButton
                            {...attributes}
                            {...listeners}
                            sx={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                cursor: 'grab',
                                '&:active': { cursor: 'grabbing' },
                                '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                },
                            }}
                        >
                            <DragIndicatorIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('presentationEditor.editSlide')}>
                        <IconButton
                            onClick={onEdit}
                            sx={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                },
                            }}
                        >
                            <EditIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('presentationEditor.deleteSlide')}>
                        <IconButton
                            onClick={onDelete}
                            sx={{
                                width: 28,
                                height: 28,
                                padding: 0,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                color: '#e88c8c',
                                '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>
            <Typography
                variant="body2"
                color="text.secondary"
                sx={{ paddingLeft: 0.25 }}
            >
                {index}. {slideLabel(slide)}
            </Typography>
        </Stack>
    );
};

interface AddSlidesDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (slides: Slide[]) => void;
}

const DEFAULT_BIBLE = {
    book: 'Johannesevangeliet',
    chapter: '3',
    verseRange: '16',
};

const AddSlidesDialog: React.FC<AddSlidesDialogProps> = ({
    open,
    onClose,
    onAdd,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [mode, setMode] = useState<'bible' | 'text' | 'heading' | 'media'>(
        'bible',
    );

    // Bible state
    const [translation, setTranslation] = useState(TRANSLATIONS[0].id);
    const [book, setBook] = useState(DEFAULT_BIBLE.book);
    const [chapter, setChapter] = useState(DEFAULT_BIBLE.chapter);
    const [verseRange, setVerseRange] = useState(DEFAULT_BIBLE.verseRange);
    const [reference, setReference] = useState(composeReference(DEFAULT_BIBLE));
    const [merge, setMerge] = useState(true);
    const [inlineNumbers, setInlineNumbers] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Text state
    const [textContent, setTextContent] = useState('');

    const { verseStart, verseEnd, wholeChapter, rangeError } = useMemo(
        () => parseVerseRange(verseRange),
        [verseRange],
    );
    const parsedChapter = Number(chapter);
    const referenceMismatch = !parseReference(reference);
    const bibleValid =
        book.trim() &&
        Number.isFinite(parsedChapter) &&
        parsedChapter > 0 &&
        !rangeError &&
        !referenceMismatch;

    // Updates the reference field to reflect an edit made via the
    // book/chapter/verses controls, without touching the field while the
    // user is typing a reference directly.
    const setBibleControl = (
        next: Partial<{ book: string; chapter: string; verseRange: string }>,
    ) => {
        const merged = { book, chapter, verseRange, ...next };
        if (next.book !== undefined) setBook(next.book);
        if (next.chapter !== undefined) setChapter(next.chapter);
        if (next.verseRange !== undefined) setVerseRange(next.verseRange);
        setReference(composeReference(merged));
    };

    const handleReferenceChange = (value: string) => {
        setReference(value);
        const parsed = parseReference(value);
        if (parsed) {
            setBook(parsed.book);
            setChapter(parsed.chapter);
            setVerseRange(parsed.verseRange);
        }
    };

    const filterBooks = (options: Book[], inputValue: string): Book[] => {
        const q = normalize(inputValue);
        if (!q) return options;
        return options.filter(
            b => normalize(b.name).includes(q) || normalize(b.abbr).includes(q),
        );
    };

    const handleSubmitBible = async () => {
        if (!bibleValid) return;
        setLoading(true);
        setError(null);
        const [err, results] = await noTryAsync(() =>
            fetchBibleSlides(conn, {
                translation,
                book: book.trim(),
                chapter: parsedChapter,
                verseStart,
                verseEnd,
                wholeChapter,
                merge,
                inlineNumbers,
            }),
        );
        if (err) {
            console.error(err);
            setError((err as any)?.message ?? 'Failed to fetch verses');
        } else {
            const slides: BibleSlide[] = results!.map(v => ({
                type: 'bible',
                id: makeSlideId(),
                text: v.text,
                reference: v.reference,
                translation,
                book: book.trim(),
                chapter: parsedChapter,
                verse: v.verse,
            }));
            onAdd(slides);
        }
        setLoading(false);
    };

    const handleSubmitText = () => {
        const slide: TextSlide = {
            type: 'text',
            id: makeSlideId(),
            text: textContent.trim(),
        };
        onAdd([slide]);
        setTextContent('');
    };

    const handleSubmitHeading = () => {
        const slide: HeadingSlide = {
            type: 'heading',
            id: makeSlideId(),
            text: textContent.trim(),
        };
        onAdd([slide]);
        setTextContent('');
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                component: 'form',
                onSubmit: (e: React.FormEvent) => {
                    e.preventDefault();
                    if (mode === 'bible') handleSubmitBible();
                    else if (mode === 'text') handleSubmitText();
                    else if (mode === 'heading') handleSubmitHeading();
                },
            }}
        >
            <DialogTitle>{t('presentationEditor.addSlidesTitle')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ marginTop: 1 }}>
                    <Stack direction="row" spacing={1}>
                        <Button
                            type="button"
                            size="small"
                            variant={
                                mode === 'bible' ? 'contained' : 'outlined'
                            }
                            onClick={() => setMode('bible')}
                        >
                            {t('presentationEditor.bibleVerse')}
                        </Button>
                        <Button
                            type="button"
                            size="small"
                            variant={mode === 'text' ? 'contained' : 'outlined'}
                            onClick={() => setMode('text')}
                        >
                            {t('presentationEditor.textSlide')}
                        </Button>
                        <Button
                            type="button"
                            size="small"
                            variant={
                                mode === 'heading' ? 'contained' : 'outlined'
                            }
                            onClick={() => setMode('heading')}
                        >
                            {t('presentationEditor.headingSlide')}
                        </Button>
                        <Button
                            type="button"
                            size="small"
                            variant={
                                mode === 'media' ? 'contained' : 'outlined'
                            }
                            onClick={() => setMode('media')}
                        >
                            {t('presentationEditor.mediaSlide')}
                        </Button>
                    </Stack>

                    {mode === 'bible' && (
                        <>
                            <TextField
                                select
                                label={t('presentationEditor.translationLabel')}
                                value={translation}
                                onChange={e => setTranslation(e.target.value)}
                                fullWidth
                            >
                                {TRANSLATIONS.map(t => (
                                    <MenuItem key={t.id} value={t.id}>
                                        {t.label}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label={t('presentationEditor.referenceLabel')}
                                value={reference}
                                onChange={e =>
                                    handleReferenceChange(e.target.value)
                                }
                                placeholder={t(
                                    'presentationEditor.referencePlaceholder',
                                )}
                                error={referenceMismatch}
                                helperText={
                                    referenceMismatch
                                        ? t(
                                              'presentationEditor.referenceUnknownBook',
                                          )
                                        : undefined
                                }
                                fullWidth
                            />

                            <Autocomplete
                                options={BOOKS}
                                value={BOOKS.find(b => b.name === book) ?? null}
                                onChange={(_, b) =>
                                    b && setBibleControl({ book: b.name })
                                }
                                getOptionLabel={b => b.name}
                                isOptionEqualToValue={(a, b) =>
                                    a.abbr === b.abbr
                                }
                                filterOptions={(options, state) =>
                                    filterBooks(options, state.inputValue)
                                }
                                renderOption={(props, b) => (
                                    <Box component="li" {...props} key={b.abbr}>
                                        {b.name}
                                    </Box>
                                )}
                                renderInput={params => (
                                    <TextField
                                        {...params}
                                        label={t(
                                            'presentationEditor.bookLabel',
                                        )}
                                    />
                                )}
                                fullWidth
                            />

                            <Stack direction="row" spacing={1}>
                                <TextField
                                    label={t('presentationEditor.chapterLabel')}
                                    type="number"
                                    value={chapter}
                                    onChange={e =>
                                        setBibleControl({
                                            chapter: e.target.value,
                                        })
                                    }
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label={t('presentationEditor.versesLabel')}
                                    value={verseRange}
                                    onChange={e =>
                                        setBibleControl({
                                            verseRange: e.target.value,
                                        })
                                    }
                                    placeholder={t(
                                        'presentationEditor.versesPlaceholder',
                                    )}
                                    error={!!rangeError}
                                    helperText={
                                        rangeError
                                            ? t(rangeError)
                                            : wholeChapter
                                              ? t(
                                                    'presentationEditor.wholeChapter',
                                                )
                                              : t(
                                                    'presentationEditor.verseCount',
                                                    {
                                                        count:
                                                            verseEnd -
                                                            verseStart +
                                                            1,
                                                    },
                                                )
                                    }
                                    sx={{ flex: 1 }}
                                />
                            </Stack>

                            <Accordion
                                disableGutters
                                elevation={0}
                                sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    '&:before': { display: 'none' },
                                }}
                            >
                                <AccordionSummary
                                    sx={{
                                        minHeight: 36,
                                        '& .MuiAccordionSummary-content': {
                                            margin: '6px 0',
                                        },
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        {t(
                                            'presentationEditor.additionalOptions',
                                        )}
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ paddingTop: 0 }}>
                                    <Stack>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={merge}
                                                    onChange={e =>
                                                        setMerge(
                                                            e.target.checked,
                                                        )
                                                    }
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Typography variant="body2">
                                                    {t(
                                                        'presentationEditor.mergeVerses',
                                                    )}
                                                </Typography>
                                            }
                                        />
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={inlineNumbers}
                                                    onChange={e =>
                                                        setInlineNumbers(
                                                            e.target.checked,
                                                        )
                                                    }
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <Typography variant="body2">
                                                    {t(
                                                        'presentationEditor.inlineNumbers',
                                                    )}
                                                </Typography>
                                            }
                                        />
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        </>
                    )}

                    {mode === 'text' && (
                        <TextField
                            label={t('presentationEditor.textLabel')}
                            value={textContent}
                            onChange={e => setTextContent(e.target.value)}
                            multiline
                            minRows={4}
                            fullWidth
                            autoFocus
                            placeholder={t(
                                'presentationEditor.textPlaceholder',
                            )}
                        />
                    )}

                    {mode === 'heading' && (
                        <TextField
                            label={t('presentationEditor.headingLabel')}
                            value={textContent}
                            onChange={e => setTextContent(e.target.value)}
                            multiline
                            minRows={2}
                            fullWidth
                            autoFocus
                            placeholder={t(
                                'presentationEditor.headingPlaceholder',
                            )}
                        />
                    )}

                    {mode === 'media' && (
                        <MediaPicker
                            selectedId={null}
                            onSelect={(mediaId, kind) =>
                                onAdd([
                                    {
                                        type: kind,
                                        id: makeSlideId(),
                                        mediaId,
                                    },
                                ])
                            }
                        />
                    )}

                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button type="button" onClick={onClose} disabled={loading}>
                    {t('panel.cancel')}
                </Button>
                {mode === 'bible' && (
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!bibleValid || loading}
                    >
                        {loading
                            ? t('presentationEditor.fetching')
                            : t('panel.add')}
                    </Button>
                )}
                {mode === 'text' && (
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!textContent.trim()}
                    >
                        {t('panel.add')}
                    </Button>
                )}
                {mode === 'heading' && (
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!textContent.trim()}
                    >
                        {t('panel.add')}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

interface EditSlideDialogProps {
    slide: Slide | null;
    onClose: () => void;
    onSave: (slide: Slide) => void;
}

const EditSlideDialog: React.FC<EditSlideDialogProps> = ({
    slide,
    onClose,
    onSave,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [text, setText] = useState('');
    const [reference, setReference] = useState('');
    const [mediaId, setMediaId] = useState('');
    const [mediaKind, setMediaKind] = useState<'image' | 'video'>('image');
    const [clip, setClip] = useState<any | null>(null);
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [channelFps, setChannelFps] = useState(DEFAULT_FPS);
    const [trim, setTrim] = useState<VideoInspectorValue>({
        inPoint: 0,
        outPoint: 0,
        volume: 1,
    });
    const outPointExplicit = useRef(false);
    const backgroundUrl = useBackgroundImage();
    const isMedia = slide?.type === 'image' || slide?.type === 'video';
    const isVideo = mediaKind === 'video';
    const selectedImageUrl = useFullImage(isMedia ? mediaId : null);

    useEffect(() => {
        if (!slide) return;
        if (slide.type === 'image' || slide.type === 'video') {
            setMediaId(slide.mediaId);
            setMediaKind(slide.type);
            const video = slide.type === 'video' ? slide : null;
            outPointExplicit.current = video?.outPoint !== undefined;
            setTrim({
                inPoint: video?.inPoint ?? 0,
                outPoint: video?.outPoint ?? 0,
                volume: video?.volume ?? 1,
            });
        } else {
            setText(slide.text);
            setReference(slide.type === 'bible' ? slide.reference : '');
        }
    }, [slide?.id]);

    // Loads the raw CasparCG media item for the selected video, so the
    // inspector can scrub a real <video> and know the full duration.
    useEffect(() => {
        if (!isVideo || !mediaId) {
            setClip(null);
            return;
        }
        (conn as any).caspar
            .getMedia()
            .then((map: Map<string, any>) => setClip(map.get(mediaId) ?? null))
            .catch(console.error);

        const onMedia = (key: string, value: any) => {
            if (key === mediaId && value) setClip(value);
        };
        (conn as any).caspar.on('media', onMedia);
        return () => (conn as any).caspar.off('media', onMedia);
    }, [conn, isVideo, mediaId]);

    useEffect(() => {
        conn.rawRequest('/api/plugin/lappis/videos', 'GET', {})
            .then((res: any) =>
                setChannelFps(normalizeVideoPayload(res.data).channelFps),
            )
            .catch(() => {});
    }, [conn]);
    useBroadcast(
        conn,
        'plugin/lappis/videos',
        'UPDATE',
        useCallback(
            (req: BroadcastReq) =>
                setChannelFps(normalizeVideoPayload(req.data).channelFps),
            [],
        ),
    );

    const fullDuration = fullDurationOf(clip);

    // Untrimmed slides default the out point to the full clip once its
    // duration loads, so the inspector opens edge-to-edge instead of at 0.
    useEffect(() => {
        if (outPointExplicit.current || !fullDuration) return;
        outPointExplicit.current = true;
        setTrim(prev => ({ ...prev, outPoint: fullDuration }));
        // Also depend on clip?.id: a clip swap with an identical duration
        // wouldn't otherwise retrigger this effect.
    }, [fullDuration, clip?.id]);

    const trimmed = outPointExplicit.current && isTrimmed(trim, fullDuration);
    const volumeChanged = trim.volume !== 1;
    const trimRangeValid = trim.outPoint > trim.inPoint;

    const inspectorSummary = [
        trimmed &&
            t('playVideo.trimmedChip', {
                in: formatTime(trim.inPoint),
                out: formatTime(trim.outPoint),
            }),
        volumeChanged &&
            t('playVideo.volumeChip', {
                volume: Math.round(trim.volume * 100),
            }),
    ]
        .filter(Boolean)
        .join(' · ');

    if (!slide) return null;

    const selectMedia = (id: string, kind: 'image' | 'video') => {
        if (id !== mediaId) {
            outPointExplicit.current = false;
            setTrim({ inPoint: 0, outPoint: 0, volume: 1 });
        }
        setMediaId(id);
        setMediaKind(kind);
    };

    const handleSave = () => {
        if (slide.type === 'image' || slide.type === 'video') {
            if (!mediaId) return;
            // Rebuild from just `id` — spreading the old image/video slide
            // would leak its stale inPoint/outPoint/volume through whenever
            // the trim/volume aren't actively set on this save.
            if (mediaKind === 'video') {
                onSave({
                    type: 'video',
                    id: slide.id,
                    mediaId,
                    ...(trimmed && trimRangeValid
                        ? { inPoint: trim.inPoint, outPoint: trim.outPoint }
                        : {}),
                    ...(volumeChanged ? { volume: trim.volume } : {}),
                });
            } else {
                onSave({ type: 'image', id: slide.id, mediaId });
            }
        } else if (slide.type === 'bible') {
            onSave({ ...slide, text, reference });
        } else {
            onSave({ ...slide, text });
        }
    };

    return (
        <Dialog
            open={!!slide}
            onClose={onClose}
            fullWidth
            maxWidth={false}
            PaperProps={{
                component: 'form',
                onSubmit: (e: React.FormEvent) => {
                    e.preventDefault();
                    handleSave();
                },
                sx: { width: 'min(92vw, 1100px)', maxWidth: 'none' },
            }}
        >
            <DialogTitle>{t('presentationEditor.editSlide')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ marginTop: 1 }}>
                    {isMedia ? (
                        <>
                            <SlidePreview
                                imageUrl={selectedImageUrl}
                                isVideo={mediaKind === 'video'}
                            />
                            {isVideo && clip && (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1.5}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ flexGrow: 1, minWidth: 0 }}
                                        noWrap
                                    >
                                        {inspectorSummary ||
                                            t('playVideo.noTrim')}
                                    </Typography>
                                    <Button
                                        type="button"
                                        size="small"
                                        variant="outlined"
                                        startIcon={
                                            <ContentCutIcon
                                                sx={{ fontSize: 16 }}
                                            />
                                        }
                                        onClick={() => setInspectorOpen(true)}
                                        sx={{ flexShrink: 0 }}
                                    >
                                        {t('playVideo.openInspector')}
                                    </Button>
                                </Stack>
                            )}
                            <MediaPicker
                                selectedId={mediaId}
                                onSelect={selectMedia}
                            />
                        </>
                    ) : (
                        <>
                            <SlidePreview
                                text={text}
                                reference={reference}
                                heading={slide.type === 'heading'}
                                backgroundUrl={backgroundUrl}
                            />

                            {slide.type === 'bible' && (
                                <TextField
                                    label={t(
                                        'presentationEditor.referenceLabel',
                                    )}
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    fullWidth
                                />
                            )}

                            <TextField
                                label={t('presentationEditor.textLabel')}
                                value={text}
                                onChange={e => setText(e.target.value)}
                                multiline
                                minRows={4}
                                fullWidth
                            />
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button type="button" onClick={onClose}>
                    {t('panel.cancel')}
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    disabled={isMedia && !mediaId}
                >
                    {t('presentationEditor.save')}
                </Button>
            </DialogActions>
            {isVideo && (
                <VideoInspectorModal
                    open={inspectorOpen}
                    onClose={() => setInspectorOpen(false)}
                    clip={clip}
                    value={trim}
                    onChange={setTrim}
                    fps={channelFps}
                />
            )}
        </Dialog>
    );
};

function parseVerseRange(input: string): {
    verseStart: number;
    verseEnd: number;
    wholeChapter: boolean;
    rangeError: string | null;
} {
    const trimmed = input.trim();
    if (!trimmed)
        return {
            verseStart: 0,
            verseEnd: 0,
            wholeChapter: false,
            rangeError: 'presentationEditor.verseRequired',
        };

    if (trimmed === '*')
        return {
            verseStart: 0,
            verseEnd: 0,
            wholeChapter: true,
            rangeError: null,
        };

    const match = trimmed.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match)
        return {
            verseStart: 0,
            verseEnd: 0,
            wholeChapter: false,
            rangeError: 'presentationEditor.verseFormat',
        };

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;

    if (!Number.isFinite(start) || start <= 0)
        return {
            verseStart: 0,
            verseEnd: 0,
            wholeChapter: false,
            rangeError: 'presentationEditor.verseInvalidStart',
        };
    if (!Number.isFinite(end) || end < start)
        return {
            verseStart: 0,
            verseEnd: 0,
            wholeChapter: false,
            rangeError: 'presentationEditor.verseEndGte',
        };
    if (end - start > 50)
        return {
            verseStart: 0,
            verseEnd: 0,
            wholeChapter: false,
            rangeError: 'presentationEditor.verseRangeLong',
        };

    return {
        verseStart: start,
        verseEnd: end,
        wholeChapter: false,
        rangeError: null,
    };
}

export default PresentationEditor;
