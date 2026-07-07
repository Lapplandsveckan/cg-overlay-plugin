/**
 * Bible verse parsing and validation utilities.
 */

export interface VerseParseResult {
    verseStart: number;
    verseEnd: number;
    wholeChapter: boolean;
    rangeError: string | null;
}

/**
 * Parse a verse range string into start/end numbers.
 * Supports formats like "16", "1-5", "1-005", or "*" for whole chapter.
 */
export function parseVerseRange(input: string): VerseParseResult {
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

/**
 * Check if a Bible reference is valid.
 */
export function validateVerseRange(
    book: string,
    chapter: string,
    parseResult: VerseParseResult,
    referenceMismatch: boolean,
): boolean {
    const parsedChapter = Number(chapter);
    return (
        book.trim() &&
        Number.isFinite(parsedChapter) &&
        parsedChapter > 0 &&
        !parseResult.rangeError &&
        !referenceMismatch
    );
}
