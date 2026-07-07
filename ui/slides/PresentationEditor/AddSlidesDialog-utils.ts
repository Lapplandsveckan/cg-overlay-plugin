import type { BibleSlide, HeadingSlide, TextSlide } from '../api';

/**
 * Generate a unique slide ID using timestamp and random suffix.
 */
export function makeSlideId(): string {
    return `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a text slide from content.
 */
export function createTextSlide(text: string): TextSlide {
    return {
        type: 'text',
        id: makeSlideId(),
        text: text.trim(),
    };
}

/**
 * Create a heading slide from content.
 */
export function createHeadingSlide(text: string): HeadingSlide {
    return {
        type: 'heading',
        id: makeSlideId(),
        text: text.trim(),
    };
}

/**
 * Create a Bible slide from verse data.
 */
export function createBibleSlide(
    translation: string,
    book: string,
    chapter: number,
    verse: number,
    text: string,
    reference: string,
): BibleSlide {
    return {
        type: 'bible',
        id: makeSlideId(),
        text,
        reference,
        translation,
        book: book.trim(),
        chapter,
        verse,
    };
}
