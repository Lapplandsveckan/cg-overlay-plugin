import React, { useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
} from '@mui/material';
import { noTryAsync } from 'no-try';
import { useSocket } from '@web-lib';
import { useTranslation } from '../../i18n';
import { BibleSlideSection } from './BibleSlideSection';
import { TextSlideSection } from './TextSlideSection';
import { HeadingSlideSection } from './HeadingSlideSection';
import { VideoSlideSection } from './VideoSlideSection';
import {
    makeSlideId,
    createTextSlide,
    createHeadingSlide,
    createBibleSlide,
} from './AddSlidesDialog-utils';
import { type Slide, fetchBibleSlides } from '../api';
import { composeReference, parseReference } from '../bible-api';
import { parseVerseRange, validateVerseRange } from './verse-parser';

const DEFAULT_BIBLE = {
    book: 'Johannesevangeliet',
    chapter: '3',
    verseRange: '16',
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
    const [mode, setMode] = useState<'bible' | 'text' | 'heading' | 'media'>(
        'bible',
    );

    // Bible state
    const [translation, setTranslation] = useState('sfb');
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

    const verseParseResult = useMemo(
        () => parseVerseRange(verseRange),
        [verseRange],
    );
    const parsedChapter = Number(chapter);
    const referenceMismatch = !parseReference(reference);
    const bibleValid = validateVerseRange(
        book,
        chapter,
        verseParseResult,
        referenceMismatch,
    );

    const handleSubmitBible = async () => {
        if (!bibleValid) return;
        setLoading(true);
        setError(null);
        const [err, results] = await noTryAsync(() =>
            fetchBibleSlides(conn, {
                translation,
                book: book.trim(),
                chapter: parsedChapter,
                verseStart: verseParseResult.verseStart,
                verseEnd: verseParseResult.verseEnd,
                wholeChapter: verseParseResult.wholeChapter,
                merge,
                inlineNumbers,
            }),
        );
        if (err) {
            console.error(err);
            setError((err as any)?.message ?? 'Failed to fetch verses');
        } else {
            const slides = results!.map(v =>
                createBibleSlide(
                    translation,
                    book,
                    parsedChapter,
                    v.verse,
                    v.text,
                    v.reference,
                ),
            );
            onAdd(slides);
        }
        setLoading(false);
    };

    const handleSubmitText = () => {
        const slide = createTextSlide(textContent);
        onAdd([slide]);
        setTextContent('');
    };

    const handleSubmitHeading = () => {
        const slide = createHeadingSlide(textContent);
        onAdd([slide]);
        setTextContent('');
    };

    const handleMediaSelect = (mediaId: string, kind: 'video' | 'image') => {
        onAdd([
            {
                type: kind,
                id: makeSlideId(),
                mediaId,
            },
        ]);
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
                        <BibleSlideSection
                            translation={translation}
                            onTranslationChange={setTranslation}
                            reference={reference}
                            onReferenceChange={setReference}
                            book={book}
                            onBookChange={setBook}
                            chapter={chapter}
                            onChapterChange={setChapter}
                            verseRange={verseRange}
                            onVerseRangeChange={setVerseRange}
                            merge={merge}
                            onMergeChange={setMerge}
                            inlineNumbers={inlineNumbers}
                            onInlineNumbersChange={setInlineNumbers}
                        />
                    )}

                    {mode === 'text' && (
                        <TextSlideSection
                            value={textContent}
                            onChange={setTextContent}
                        />
                    )}

                    {mode === 'heading' && (
                        <HeadingSlideSection
                            value={textContent}
                            onChange={setTextContent}
                        />
                    )}

                    {mode === 'media' && (
                        <VideoSlideSection onMediaSelect={handleMediaSelect} />
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

export { AddSlidesDialog };
