import React, {useMemo, useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

// @ts-ignore
import {RundownEditorActionBar} from '@web-lib';
import {fetchVerses, formatReference, TRANSLATIONS} from './bible-api';
import SlidePreview from './SlidePreview';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface Slide {
    id: string;
    text: string;
    reference: string;
    translation: string;
    book: string;
    chapter: number;
    verse: number;
}

interface BibelordEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

function makeSlideId(): string {
    return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const COMMON_BOOKS = ['1 Mos', 'Ps', 'Ords', 'Jes', 'Matt', 'Mark', 'Luk', 'Joh', 'Apg', 'Rom', '1 Kor', '2 Kor', 'Gal', 'Ef', 'Fil', 'Kol', 'Hebr', 'Jak', '1 Joh', 'Upp'];

export const BibelordEditor: React.FC<BibelordEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState<string>(entry?.title ?? '');
    const [slides, setSlides] = useState<Slide[]>(() =>
        Array.isArray(entry?.data?.slides) ? entry.data.slides : []
    );

    const [addOpen, setAddOpen] = useState(false);
    const [editingSlide, setEditingSlide] = useState<Slide | null>(null);

    const handleAddSlides = (newSlides: Slide[]) => {
        setSlides(prev => [...prev, ...newSlides]);
    };

    const handleUpdateSlide = (updated: Slide) => {
        setSlides(prev => prev.map(s => s.id === updated.id ? updated : s));
    };

    const handleDeleteSlide = (id: string) => {
        setSlides(prev => prev.filter(s => s.id !== id));
    };

    return (
        <Stack spacing={2}>
            <Typography variant="h6">Bibel ord</Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText="Shown in the rundown."
            />

            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                    {slides.length} slide{slides.length === 1 ? '' : 's'}
                </Typography>
                <Button variant="outlined" size="small" onClick={() => setAddOpen(true)}>
                    Add slides
                </Button>
            </Stack>

            {slides.length === 0 ? (
                <Box
                    sx={{
                        padding: 3,
                        textAlign: 'center',
                        border: '1px dashed rgba(255,255,255,0.15)',
                        borderRadius: 1,
                        color: 'text.secondary',
                    }}
                >
                    <Typography variant="body2">No slides yet. Click "Add slides" to fetch verses.</Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        display: 'grid',
                        // Always aim for 3-4 columns, regardless of pane width.
                        // Tiles share the available width (1fr) so they grow as the pane grows.
                        gridTemplateColumns: {
                            xs: 'repeat(3, 1fr)',
                            md: 'repeat(4, 1fr)',
                        },
                        gap: 1.5,
                        maxHeight: 600,
                        overflowY: 'auto',
                        paddingRight: 0.5,
                    }}
                >
                    {slides.map((slide, idx) => (
                        <SlideCard
                            key={slide.id}
                            slide={slide}
                            index={idx + 1}
                            onEdit={() => setEditingSlide(slide)}
                            onDelete={() => handleDeleteSlide(slide.id)}
                        />
                    ))}
                </Box>
            )}

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {slides},
                        title,
                    });
                }}
            />

            <AddSlidesDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onAdd={(s) => {
                    handleAddSlides(s);
                    setAddOpen(false);
                }}
            />

            <EditSlideDialog
                slide={editingSlide}
                onClose={() => setEditingSlide(null)}
                onSave={(s) => {
                    handleUpdateSlide(s);
                    setEditingSlide(null);
                }}
            />
        </Stack>
    );
};

interface SlideCardProps {
    slide: Slide;
    index: number;
    onEdit: () => void;
    onDelete: () => void;
}

const SlideCard: React.FC<SlideCardProps> = ({slide, index, onEdit, onDelete}) => (
    <Stack spacing={0.75}>
        <Box sx={{position: 'relative', '&:hover .slide-overlay': {opacity: 1}}}>
            <SlidePreview text={slide.text} reference={slide.reference} />
            <Stack
                className="slide-overlay"
                direction="row"
                spacing={0.5}
                sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
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
                        <Box component="span" sx={{fontSize: 12}}>✎</Box>
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
                        <Box component="span" sx={{fontSize: 14, lineHeight: 1, fontWeight: 300}}>×</Box>
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{paddingLeft: 0.25}}>
            {index}. {slide.reference}
        </Typography>
    </Stack>
);

interface AddSlidesDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (slides: Slide[]) => void;
}

const AddSlidesDialog: React.FC<AddSlidesDialogProps> = ({open, onClose, onAdd}) => {
    const [translation, setTranslation] = useState(TRANSLATIONS[0].id);
    const [book, setBook] = useState('Joh');
    const [chapter, setChapter] = useState('3');
    const [verseRange, setVerseRange] = useState('16');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {verseStart, verseEnd, rangeError} = useMemo(() => parseVerseRange(verseRange), [verseRange]);

    const parsedChapter = Number(chapter);
    const valid = book.trim() && Number.isFinite(parsedChapter) && parsedChapter > 0 && !rangeError;

    const handleSubmit = async () => {
        if (!valid) return;
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
            const slides: Slide[] = verses.map(v => ({
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

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Add slides</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{marginTop: 1}}>
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
                        inputProps={{list: 'bibelord-book-list'}}
                    />
                    <datalist id="bibelord-book-list">
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

                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!valid || loading}>
                    {loading ? 'Fetching…' : 'Add'}
                </Button>
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

    React.useEffect(() => {
        if (!slide) return;
        setText(slide.text);
        setReference(slide.reference);
    }, [slide?.id]);

    if (!slide) return null;

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
                    <SlidePreview text={text} reference={reference} />

                    <TextField
                        label="Reference"
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                        fullWidth
                    />

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
                <Button variant="contained" onClick={() => onSave({...slide, text, reference})}>
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

export default BibelordEditor;
