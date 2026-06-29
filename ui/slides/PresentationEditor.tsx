/* eslint-disable max-lines */
import React, { useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
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

import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
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
import { BOOKS, TRANSLATIONS } from './bible-api';
import { pluginHomeUrl } from './urls';

function isImageMedia(item: any): boolean {
    if (!item.mediainfo?.streams) return false;
    return !item.mediainfo.streams.some((s: any) => s.codec?.type === 'video');
}

interface ImagePickerProps {
    selectedId: string | null;
    onSelect: (id: string) => void;
}

const ImagePicker: React.FC<ImagePickerProps> = ({ selectedId, onSelect }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [allImages, setAllImages] = useState<any[]>([]);
    const [query, setQuery] = useState('');

    useEffect(() => {
        const load = () =>
            (conn as any).caspar
                .getMedia()
                .then((media: Map<string, any>) => {
                    const imgs: any[] = [];
                    for (const item of media.values()) {
                        if (isImageMedia(item)) imgs.push(item);
                    }
                    setAllImages(imgs);
                })
                .catch(console.error);

        load();
        (conn as any).caspar.on('media', load);
        return () => void (conn as any).caspar.off('media', load);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allImages;
        return allImages.filter(m => m.id.toLowerCase().includes(q));
    }, [allImages, query]);

    return (
        <MediaDropZone
            accept={['image/*']}
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
                                description: 'Images',
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
                            {filtered.map(item => {
                                const thumbUrl = buildThumbnailUrl(item);
                                const name =
                                    item.id.split('/').pop() ?? item.id;
                                const isSelected = item.id === selectedId;
                                return (
                                    <Box
                                        key={item.id}
                                        onClick={() => onSelect(item.id)}
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
    const backgroundUrl = useBackgroundImage();

    const [renameOpen, setRenameOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Slide | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [orderedSlides, setOrderedSlides] = useState<Slide[]>(
        remote?.slides ?? [],
    );
    useEffect(() => {
        if (!remote) return;
        const sameOrder =
            remote.slides.length === orderedSlides.length &&
            remote.slides.every((s, i) => s.id === orderedSlides[i]?.id);
        if (!sameOrder) setOrderedSlides(remote.slides);
    }, [remote?.slides]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );
    const imageMediaIds = useMemo(
        () =>
            (remote?.slides ?? [])
                .filter(s => s.type === 'image')
                .map(s => (s as ImageSlide).mediaId),
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
                    <Link href={pluginHomeUrl()}>
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = orderedSlides.findIndex(s => s.id === active.id);
        const newIndex = orderedSlides.findIndex(s => s.id === over.id);
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
        window.location.assign(pluginHomeUrl());
    };

    return (
        <Box
            sx={{ maxWidth: 1400, margin: '0 auto', padding: { xs: 2, md: 3 } }}
        >
            <Stack spacing={3}>
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

                {orderedSlides.length === 0 ? (
                    <EmptyState onAdd={() => setAddOpen(true)} />
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
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
                                        onEdit={() => setEditing(slide)}
                                        onDelete={() =>
                                            handleDeleteSlide(slide.id)
                                        }
                                    />
                                ))}
                            </Box>
                        </SortableContext>
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

interface SlideCardProps {
    slide: Slide;
    index: number;
    backgroundUrl?: string | null;
    imageThumbnails?: Record<string, string>;
    onEdit: () => void;
    onDelete: () => void;
}

const SlideCard: React.FC<SlideCardProps> = ({
    slide,
    index,
    backgroundUrl,
    imageThumbnails,
    onEdit,
    onDelete,
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

    const menuItems = [
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

    return (
        <Stack
            spacing={1}
            ref={setNodeRef}
            onContextMenu={menu.bind(menuItems)}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                zIndex: isDragging ? 1 : 'auto',
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    '&:hover .slide-overlay': { opacity: 1 },
                }}
            >
                {slide.type === 'image' ? (
                    <SlidePreview
                        imageUrl={imageThumbnails?.[slide.mediaId] ?? null}
                    />
                ) : (
                    <SlidePreview
                        text={slide.text}
                        reference={
                            slide.type === 'bible' ? slide.reference : ''
                        }
                        heading={slide.type === 'heading'}
                        backgroundUrl={backgroundUrl}
                    />
                )}
                <Stack
                    className="slide-overlay"
                    direction="row"
                    spacing={0.5}
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

const AddSlidesDialog: React.FC<AddSlidesDialogProps> = ({
    open,
    onClose,
    onAdd,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [mode, setMode] = useState<'bible' | 'text' | 'heading' | 'image'>(
        'bible',
    );

    // Bible state
    const [translation, setTranslation] = useState(TRANSLATIONS[0].id);
    const [book, setBook] = useState('Johannesevangeliet');
    const [chapter, setChapter] = useState('3');
    const [verseRange, setVerseRange] = useState('16');
    const [merge, setMerge] = useState(true);
    const [inlineNumbers, setInlineNumbers] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Text state
    const [textContent, setTextContent] = useState('');

    const { verseStart, verseEnd, rangeError } = useMemo(
        () => parseVerseRange(verseRange),
        [verseRange],
    );
    const parsedChapter = Number(chapter);
    const bibleValid =
        book.trim() &&
        Number.isFinite(parsedChapter) &&
        parsedChapter > 0 &&
        !rangeError;

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
                                mode === 'image' ? 'contained' : 'outlined'
                            }
                            onClick={() => setMode('image')}
                        >
                            {t('presentationEditor.imageSlide')}
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
                                select
                                label={t('presentationEditor.bookLabel')}
                                value={book}
                                onChange={e => setBook(e.target.value)}
                                fullWidth
                            >
                                {BOOKS.map(b => (
                                    <MenuItem key={b.abbr} value={b.name}>
                                        {b.name}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <Stack direction="row" spacing={1}>
                                <TextField
                                    label={t('presentationEditor.chapterLabel')}
                                    type="number"
                                    value={chapter}
                                    onChange={e => setChapter(e.target.value)}
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label={t('presentationEditor.versesLabel')}
                                    value={verseRange}
                                    onChange={e =>
                                        setVerseRange(e.target.value)
                                    }
                                    placeholder={t(
                                        'presentationEditor.versesPlaceholder',
                                    )}
                                    error={!!rangeError}
                                    helperText={
                                        rangeError
                                            ? t(rangeError)
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
                                        {t('playVideo.additionalOptions')}
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

                    {mode === 'image' && (
                        <ImagePicker
                            selectedId={null}
                            onSelect={mediaId =>
                                onAdd([
                                    {
                                        type: 'image',
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
    const [text, setText] = useState('');
    const [reference, setReference] = useState('');
    const [mediaId, setMediaId] = useState('');
    const backgroundUrl = useBackgroundImage();
    const selectedImageUrl = useFullImage(
        slide?.type === 'image' ? mediaId : null,
    );

    useEffect(() => {
        if (!slide) return;
        if (slide.type === 'image') {
            setMediaId(slide.mediaId);
        } else {
            setText(slide.text);
            setReference(slide.type === 'bible' ? slide.reference : '');
        }
    }, [slide?.id]);

    if (!slide) return null;

    const handleSave = () => {
        if (slide.type === 'image') {
            if (!mediaId) return;
            onSave({ ...slide, mediaId });
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
                    {slide.type === 'image' ? (
                        <>
                            <SlidePreview imageUrl={selectedImageUrl} />
                            <ImagePicker
                                selectedId={mediaId}
                                onSelect={setMediaId}
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
                    disabled={slide.type === 'image' && !mediaId}
                >
                    {t('presentationEditor.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

function parseVerseRange(input: string): {
    verseStart: number;
    verseEnd: number;
    rangeError: string | null;
} {
    const trimmed = input.trim();
    if (!trimmed)
        return {
            verseStart: 0,
            verseEnd: 0,
            rangeError: 'presentationEditor.verseRequired',
        };

    const match = trimmed.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match)
        return {
            verseStart: 0,
            verseEnd: 0,
            rangeError: 'presentationEditor.verseFormat',
        };

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;

    if (!Number.isFinite(start) || start <= 0)
        return {
            verseStart: 0,
            verseEnd: 0,
            rangeError: 'presentationEditor.verseInvalidStart',
        };
    if (!Number.isFinite(end) || end < start)
        return {
            verseStart: 0,
            verseEnd: 0,
            rangeError: 'presentationEditor.verseEndGte',
        };
    if (end - start > 50)
        return {
            verseStart: 0,
            verseEnd: 0,
            rangeError: 'presentationEditor.verseRangeLong',
        };

    return { verseStart: start, verseEnd: end, rangeError: null };
}

export default PresentationEditor;
