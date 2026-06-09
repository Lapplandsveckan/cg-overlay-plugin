import React, {useEffect, useMemo, useState} from 'react';
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
    Link,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

// @ts-ignore
import {useSocket} from '@web-lib';

import SlidePreview from './SlidePreview';
import {BibleSlide, Presentation, Slide, TextSlide, slideLabel, updatePresentation, deletePresentation, usePresentation, useBackgroundImage} from './api';
import {fetchVerses, formatReference, TRANSLATIONS} from './bible-api';
import {slidesIndexUrl} from './urls';

interface Props {
    id: string;
}

function makeSlideId(): string {
    return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const COMMON_BOOKS = ['1 Mos', 'Ps', 'Ords', 'Jes', 'Matt', 'Mark', 'Luk', 'Joh', 'Apg', 'Rom', '1 Kor', '2 Kor', 'Gal', 'Ef', 'Fil', 'Kol', 'Hebr', 'Jak', '1 Joh', 'Upp'];

export const PresentationEditor: React.FC<Props> = ({id}) => {
    const conn = useSocket();
    const remote = usePresentation(id);
    const backgroundUrl = useBackgroundImage();

    const [localTitle, setLocalTitle] = useState<string | null>(null);
    const [savingTitle, setSavingTitle] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Slide | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (remote && localTitle === null) setLocalTitle(remote.title);
    }, [remote, localTitle]);

    // Debounced title save.
    useEffect(() => {
        if (localTitle === null || !remote) return;
        if (localTitle === remote.title) return;

        const handle = setTimeout(async () => {
            setSavingTitle(true);
            try {
                await updatePresentation(conn, id, {title: localTitle});
            } catch (err) {
                console.error(err);
            } finally {
                setSavingTitle(false);
            }
        }, 600);

        return () => clearTimeout(handle);
    }, [localTitle, remote, id]);

    if (remote === undefined) {
        return <CenteredMessage>Loading…</CenteredMessage>;
    }
    if (remote === null) {
        return (
            <CenteredMessage>
                <Stack spacing={1.5} alignItems="center">
                    <Typography variant="body1">Presentation not found.</Typography>
                    <Link href={slidesIndexUrl()}>← Back to presentations</Link>
                </Stack>
            </CenteredMessage>
        );
    }

    const persistSlides = async (slides: Slide[]) => {
        setError(null);
        try {
            await updatePresentation(conn, id, {slides});
        } catch (err: any) {
            console.error(err);
            setError(err?.message ?? 'Failed to save slides');
        }
    };

    const handleAddSlides = (slides: Slide[]) => {
        persistSlides([...remote.slides, ...slides]);
        setAddOpen(false);
    };

    const handleUpdateSlide = (updated: Slide) => {
        persistSlides(remote.slides.map(s => s.id === updated.id ? updated : s));
        setEditing(null);
    };

    const handleDeleteSlide = (slideId: string) => {
        persistSlides(remote.slides.filter(s => s.id !== slideId));
    };

    const handleDeletePresentation = async () => {
        setConfirmDelete(false);
        try {
            await deletePresentation(conn, id);
            window.location.assign(slidesIndexUrl());
        } catch (err) {
            console.error(err);
            setError('Failed to delete presentation');
        }
    };

    return (
        <Box sx={{maxWidth: 1400, margin: '0 auto', padding: {xs: 2, md: 3}}}>
            <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Link href={slidesIndexUrl()} sx={{fontSize: 14}}>← Presentations</Link>
                    <Box sx={{flexGrow: 1}} />
                    {savingTitle && (
                        <Typography variant="caption" color="text.secondary">Saving…</Typography>
                    )}
                    <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => setConfirmDelete(true)}
                    >
                        Delete presentation
                    </Button>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="center">
                    <TextField
                        value={localTitle ?? ''}
                        onChange={e => setLocalTitle(e.target.value)}
                        variant="standard"
                        placeholder="Untitled"
                        InputProps={{
                            sx: {fontSize: 32, fontWeight: 500},
                        }}
                        sx={{flexGrow: 1}}
                    />
                    <Chip
                        label={`${remote.slides.length} slide${remote.slides.length === 1 ? '' : 's'}`}
                        variant="outlined"
                    />
                </Stack>

                {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

                <Stack direction="row" alignItems="center" justifyContent="flex-end">
                    <Button variant="contained" onClick={() => setAddOpen(true)}>
                        + Add slides
                    </Button>
                </Stack>

                {remote.slides.length === 0 ? (
                    <EmptyState onAdd={() => setAddOpen(true)} />
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
                        {remote.slides.map((slide, idx) => (
                            <SlideCard
                                key={slide.id}
                                slide={slide}
                                index={idx + 1}
                                backgroundUrl={backgroundUrl}
                                onEdit={() => setEditing(slide)}
                                onDelete={() => handleDeleteSlide(slide.id)}
                            />
                        ))}
                    </Box>
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

            <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
                <DialogTitle>Delete presentation?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        "{remote.title}" will be permanently removed.
                        Any rundown entries that reference it will show "Presentation missing".
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDeletePresentation}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const CenteredMessage: React.FC<React.PropsWithChildren> = ({children}) => (
    <Box sx={{padding: 6, textAlign: 'center', color: 'text.secondary'}}>{children}</Box>
);

const EmptyState: React.FC<{onAdd: () => void}> = ({onAdd}) => (
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
            <Typography variant="body1">No slides yet.</Typography>
            <Typography variant="body2">
                Add Bible verses or a text slide to get started.
            </Typography>
            <Button variant="contained" size="small" onClick={onAdd}>+ Add slides</Button>
        </Stack>
    </Box>
);

interface SlideCardProps {
    slide: Slide;
    index: number;
    backgroundUrl?: string | null;
    onEdit: () => void;
    onDelete: () => void;
}

const SlideCard: React.FC<SlideCardProps> = ({slide, index, backgroundUrl, onEdit, onDelete}) => (
    <Stack spacing={1}>
        <Box sx={{position: 'relative', '&:hover .slide-overlay': {opacity: 1}}}>
            <SlidePreview
                text={slide.text}
                reference={slide.type === 'bible' ? slide.reference : ''}
                backgroundUrl={backgroundUrl}
            />
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
                <Tooltip title="Edit slide">
                    <IconButton
                        size="small"
                        onClick={onEdit}
                        sx={{
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            '&:hover': {backgroundColor: 'rgba(0,0,0,0.8)'},
                        }}
                    >
                        <Box component="span" sx={{fontSize: 14}}>✎</Box>
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete slide">
                    <IconButton
                        size="small"
                        onClick={onDelete}
                        sx={{
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#e88c8c',
                            '&:hover': {backgroundColor: 'rgba(0,0,0,0.8)'},
                        }}
                    >
                        <Box component="span" sx={{fontSize: 16, lineHeight: 1, fontWeight: 300}}>×</Box>
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{paddingLeft: 0.25}}>
            {index}. {slideLabel(slide)}
        </Typography>
    </Stack>
);

interface AddSlidesDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (slides: Slide[]) => void;
}

const AddSlidesDialog: React.FC<AddSlidesDialogProps> = ({open, onClose, onAdd}) => {
    const [mode, setMode] = useState<'bible' | 'text'>('bible');

    // Bible state
    const [translation, setTranslation] = useState(TRANSLATIONS[0].id);
    const [book, setBook] = useState('Joh');
    const [chapter, setChapter] = useState('3');
    const [verseRange, setVerseRange] = useState('16');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Text state
    const [textContent, setTextContent] = useState('');

    const {verseStart, verseEnd, rangeError} = useMemo(() => parseVerseRange(verseRange), [verseRange]);
    const parsedChapter = Number(chapter);
    const bibleValid = book.trim() && Number.isFinite(parsedChapter) && parsedChapter > 0 && !rangeError;

    const handleSubmitBible = async () => {
        if (!bibleValid) return;
        setLoading(true);
        setError(null);
        try {
            const verses = await fetchVerses({
                translation,
                book: book.trim(),
                chapter: parsedChapter,
                verseStart,
                verseEnd,
            });
            const slides: BibleSlide[] = verses.map(v => ({
                type: 'bible',
                id: makeSlideId(),
                text: v.text,
                reference: formatReference(v.book, v.chapter, v.verse),
                translation,
                book: v.book,
                chapter: v.chapter,
                verse: v.verse,
            }));
            onAdd(slides);
        } catch (err: any) {
            console.error(err);
            setError(err?.message ?? 'Failed to fetch verses');
        } finally {
            setLoading(false);
        }
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

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Add slides</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{marginTop: 1}}>
                    <Stack direction="row" spacing={1}>
                        <Button
                            size="small"
                            variant={mode === 'bible' ? 'contained' : 'outlined'}
                            onClick={() => setMode('bible')}
                        >
                            Bible verse
                        </Button>
                        <Button
                            size="small"
                            variant={mode === 'text' ? 'contained' : 'outlined'}
                            onClick={() => setMode('text')}
                        >
                            Text slide
                        </Button>
                    </Stack>

                    {mode === 'bible' && (
                        <>
                            <TextField
                                select
                                label="Translation"
                                value={translation}
                                onChange={e => setTranslation(e.target.value)}
                                fullWidth
                            >
                                {TRANSLATIONS.map(t => (
                                    <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                label="Book"
                                value={book}
                                onChange={e => setBook(e.target.value)}
                                placeholder="Joh"
                                helperText="e.g. Joh, Rom, Ps"
                                inputProps={{list: 'presentation-book-list'}}
                            />
                            <datalist id="presentation-book-list">
                                {COMMON_BOOKS.map(b => <option key={b} value={b} />)}
                            </datalist>

                            <Stack direction="row" spacing={1}>
                                <TextField
                                    label="Chapter"
                                    type="number"
                                    value={chapter}
                                    onChange={e => setChapter(e.target.value)}
                                    sx={{flex: 1}}
                                />
                                <TextField
                                    label="Verses"
                                    value={verseRange}
                                    onChange={e => setVerseRange(e.target.value)}
                                    placeholder="16 or 16-17"
                                    error={!!rangeError}
                                    helperText={rangeError ?? `${verseEnd - verseStart + 1} slide${verseEnd === verseStart ? '' : 's'}`}
                                    sx={{flex: 1}}
                                />
                            </Stack>
                        </>
                    )}

                    {mode === 'text' && (
                        <TextField
                            label="Text"
                            value={textContent}
                            onChange={e => setTextContent(e.target.value)}
                            multiline
                            minRows={4}
                            fullWidth
                            autoFocus
                            placeholder="Enter slide text…"
                        />
                    )}

                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                {mode === 'bible' ? (
                    <Button variant="contained" onClick={handleSubmitBible} disabled={!bibleValid || loading}>
                        {loading ? 'Fetching…' : 'Add'}
                    </Button>
                ) : (
                    <Button variant="contained" onClick={handleSubmitText} disabled={!textContent.trim()}>
                        Add
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

const EditSlideDialog: React.FC<EditSlideDialogProps> = ({slide, onClose, onSave}) => {
    const [text, setText] = useState('');
    const [reference, setReference] = useState('');
    const backgroundUrl = useBackgroundImage();

    useEffect(() => {
        if (!slide) return;
        setText(slide.text);
        setReference(slide.type === 'bible' ? slide.reference : '');
    }, [slide?.id]);

    if (!slide) return null;

    const handleSave = () => {
        if (slide.type === 'bible') {
            onSave({...slide, text, reference});
        } else {
            onSave({...slide, text});
        }
    };

    return (
        <Dialog
            open={!!slide}
            onClose={onClose}
            fullWidth
            maxWidth={false}
            PaperProps={{sx: {width: 'min(92vw, 1100px)', maxWidth: 'none'}}}
        >
            <DialogTitle>Edit slide</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{marginTop: 1}}>
                    <SlidePreview text={text} reference={reference} backgroundUrl={backgroundUrl} />

                    {slide.type === 'bible' && (
                        <TextField
                            label="Reference"
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                            fullWidth
                        />
                    )}

                    <TextField
                        label="Text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        multiline
                        minRows={4}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleSave}>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
};

function parseVerseRange(input: string): {verseStart: number; verseEnd: number; rangeError: string | null} {
    const trimmed = input.trim();
    if (!trimmed) return {verseStart: 0, verseEnd: 0, rangeError: 'Required'};

    const match = trimmed.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match) return {verseStart: 0, verseEnd: 0, rangeError: 'Format: 16 or 16-17'};

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;

    if (!Number.isFinite(start) || start <= 0) return {verseStart: 0, verseEnd: 0, rangeError: 'Invalid start'};
    if (!Number.isFinite(end) || end < start) return {verseStart: 0, verseEnd: 0, rangeError: 'End must be ≥ start'};
    if (end - start > 50) return {verseStart: 0, verseEnd: 0, rangeError: 'Range too long'};

    return {verseStart: start, verseEnd: end, rangeError: null};
}

export default PresentationEditor;
