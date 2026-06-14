import React, { useEffect, useMemo, useState } from 'react';
import { noTryAsync } from 'no-try';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
// @ts-expect-error -- no type declarations for @web-lib
import { useSocket } from '@web-lib';
// @ts-expect-error -- no type declarations for @web-lib
import SlidePreview from './SlidePreview';
import {
    type BibleSlide,
    type Slide,
    type TextSlide,
    useBackgroundImage,
    fetchBibleSlides,
} from './api';
import { BOOKS, TRANSLATIONS } from './bible-api';

function makeSlideId(): string {
    return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseVerseRange(input: string): {
    verseStart: number;
    verseEnd: number;
    rangeError: string | null;
} {
    const trimmed = input.trim();
    if (!trimmed) return { verseStart: 0, verseEnd: 0, rangeError: 'Required' };

    const match = trimmed.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!match)
        return {
            verseStart: 0,
            verseEnd: 0,
            rangeError: 'Format: 16 or 16-17',
        };

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;

    if (!Number.isFinite(start) || start <= 0)
        return { verseStart: 0, verseEnd: 0, rangeError: 'Invalid start' };
    if (!Number.isFinite(end) || end < start)
        return {
            verseStart: 0,
            verseEnd: 0,
            rangeError: 'End must be ≥ start',
        };
    if (end - start > 50)
        return { verseStart: 0, verseEnd: 0, rangeError: 'Range too long' };

    return { verseStart: start, verseEnd: end, rangeError: null };
}

interface AddSlidesDialogProps {
    open: boolean;
    onClose: () => void;
    onAdd: (slides: Slide[]) => void;
}

export const AddSlidesDialog: React.FC<AddSlidesDialogProps> = ({
    open,
    onClose,
    onAdd,
}) => {
    const conn = useSocket();
    const [mode, setMode] = useState<'bible' | 'text'>('bible');

    const [translation, setTranslation] = useState(TRANSLATIONS[0].id);
    const [book, setBook] = useState('Johannesevangeliet');
    const [chapter, setChapter] = useState('3');
    const [verseRange, setVerseRange] = useState('16');
    const [merge, setMerge] = useState(true);
    const [inlineNumbers, setInlineNumbers] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        setLoading(false);
        if (err) {
            console.error(err);
            setError((err as any)?.message ?? 'Failed to fetch verses');
            return;
        }
        const slides: BibleSlide[] = results.map(v => ({
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
                <Stack spacing={2} sx={{ marginTop: 1 }}>
                    <Stack direction="row" spacing={1}>
                        <Button
                            size="small"
                            variant={
                                mode === 'bible' ? 'contained' : 'outlined'
                            }
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
                                    <MenuItem key={t.id} value={t.id}>
                                        {t.label}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select
                                label="Book"
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
                                    label="Chapter"
                                    type="number"
                                    value={chapter}
                                    onChange={e => setChapter(e.target.value)}
                                    sx={{ flex: 1 }}
                                />
                                <TextField
                                    label="Verses"
                                    value={verseRange}
                                    onChange={e =>
                                        setVerseRange(e.target.value)
                                    }
                                    placeholder="16 or 16-17"
                                    error={!!rangeError}
                                    helperText={
                                        rangeError ??
                                        `${verseEnd - verseStart + 1} verse${verseEnd === verseStart ? '' : 's'}`
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
                                        Additional options
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
                                                    Merge verses into flowing
                                                    slides
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
                                                    Inline verse numbers in text
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
                <Button onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                {mode === 'bible' ? (
                    <Button
                        variant="contained"
                        onClick={handleSubmitBible}
                        disabled={!bibleValid || loading}
                    >
                        {loading ? 'Fetching…' : 'Add'}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        onClick={handleSubmitText}
                        disabled={!textContent.trim()}
                    >
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

export const EditSlideDialog: React.FC<EditSlideDialogProps> = ({
    slide,
    onClose,
    onSave,
}) => {
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
                sx: { width: 'min(92vw, 1100px)', maxWidth: 'none' },
            }}
        >
            <DialogTitle>Edit slide</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ marginTop: 1 }}>
                    <SlidePreview
                        text={text}
                        reference={reference}
                        backgroundUrl={backgroundUrl}
                    />

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
