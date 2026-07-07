import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Autocomplete,
    Box,
    FormControlLabel,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import { useTranslation } from '../../i18n';
import {
    BOOKS,
    TRANSLATIONS,
    composeReference,
    normalize,
    parseReference,
    type Book,
} from '../bible-api';
import { parseVerseRange } from './verse-parser';

interface BibleSlideSectionProps {
    translation: string;
    onTranslationChange: (translation: string) => void;
    reference: string;
    onReferenceChange: (reference: string) => void;
    book: string;
    onBookChange: (book: string) => void;
    chapter: string;
    onChapterChange: (chapter: string) => void;
    verseRange: string;
    onVerseRangeChange: (verseRange: string) => void;
    merge: boolean;
    onMergeChange: (merge: boolean) => void;
    inlineNumbers: boolean;
    onInlineNumbersChange: (inlineNumbers: boolean) => void;
}

const BibleSlideSection: React.FC<BibleSlideSectionProps> = ({
    translation,
    onTranslationChange,
    reference,
    onReferenceChange,
    book,
    onBookChange,
    chapter,
    onChapterChange,
    verseRange,
    onVerseRangeChange,
    merge,
    onMergeChange,
    inlineNumbers,
    onInlineNumbersChange,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');

    const { verseStart, verseEnd, wholeChapter, rangeError } =
        parseVerseRange(verseRange);
    const referenceMismatch = !parseReference(reference);

    const handleBibleControl = (
        next: Partial<{ book: string; chapter: string; verseRange: string }>,
    ) => {
        const merged = { book, chapter, verseRange, ...next };
        if (next.book !== undefined) onBookChange(next.book);
        if (next.chapter !== undefined) onChapterChange(next.chapter);
        if (next.verseRange !== undefined) onVerseRangeChange(next.verseRange);
        onReferenceChange(composeReference(merged));
    };

    const handleReferenceChange = (value: string) => {
        onReferenceChange(value);
        const parsed = parseReference(value);
        if (parsed) {
            onBookChange(parsed.book);
            onChapterChange(parsed.chapter);
            onVerseRangeChange(parsed.verseRange);
        }
    };

    const filterBooks = (options: Book[], inputValue: string): Book[] => {
        const q = normalize(inputValue);
        if (!q) return options;
        return options.filter(
            b => normalize(b.name).includes(q) || normalize(b.abbr).includes(q),
        );
    };

    return (
        <>
            <TextField
                select
                label={t('presentationEditor.translationLabel')}
                value={translation}
                onChange={e => onTranslationChange(e.target.value)}
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
                onChange={e => handleReferenceChange(e.target.value)}
                placeholder={t('presentationEditor.referencePlaceholder')}
                error={referenceMismatch}
                helperText={
                    referenceMismatch
                        ? t('presentationEditor.referenceUnknownBook')
                        : undefined
                }
                fullWidth
            />

            <Autocomplete
                options={BOOKS}
                value={BOOKS.find(b => b.name === book) ?? null}
                onChange={(_, b) => b && handleBibleControl({ book: b.name })}
                getOptionLabel={b => b.name}
                isOptionEqualToValue={(a, b) => a.abbr === b.abbr}
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
                        label={t('presentationEditor.bookLabel')}
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
                        handleBibleControl({ chapter: e.target.value })
                    }
                    sx={{ flex: 1 }}
                />
                <TextField
                    label={t('presentationEditor.versesLabel')}
                    value={verseRange}
                    onChange={e =>
                        handleBibleControl({ verseRange: e.target.value })
                    }
                    placeholder={t('presentationEditor.versesPlaceholder')}
                    error={!!rangeError}
                    helperText={
                        rangeError
                            ? t(rangeError)
                            : wholeChapter
                              ? t('presentationEditor.wholeChapter')
                              : t('presentationEditor.verseCount', {
                                    count: verseEnd - verseStart + 1,
                                })
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
                    <Typography variant="body2" color="text.secondary">
                        {t('presentationEditor.additionalOptions')}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ paddingTop: 0 }}>
                    <Stack>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={merge}
                                    onChange={e =>
                                        onMergeChange(e.target.checked)
                                    }
                                    size="small"
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    {t('presentationEditor.mergeVerses')}
                                </Typography>
                            }
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={inlineNumbers}
                                    onChange={e =>
                                        onInlineNumbersChange(e.target.checked)
                                    }
                                    size="small"
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    {t('presentationEditor.inlineNumbers')}
                                </Typography>
                            }
                        />
                    </Stack>
                </AccordionDetails>
            </Accordion>
        </>
    );
};

export { BibleSlideSection };
