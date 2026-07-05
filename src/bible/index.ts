import path from 'path';
import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

const DATA_DIR = path.join(__dirname, 'bible', 'data');

const TRANSLATION_MAP: Record<string, string> = {
    sfb: 'SFB15',
    b2000: 'B2000',
};

export interface VerseSlide {
    text: string;
    reference: string;
    verse: number;
}

// ---------- caching ----------

let booksCache: { name: string; abbr: string }[] | null = null;
const translationCache = new Map<string, any>();

const parser = new XMLParser({ ignoreAttributes: false });

function toArray<T>(x: T | T[]): T[] {
    if (x == null) return [];
    return Array.isArray(x) ? x : [x];
}

function loadBooks(): { name: string; abbr: string }[] {
    if (booksCache) return booksCache;
    const xml = fs.readFileSync(path.join(DATA_DIR, 'books.xml'), 'utf-8');
    const parsed = parser.parse(xml);
    booksCache = toArray(parsed.bible.testament)
        .flatMap((t: any) => toArray(t.book))
        .map((b: any) => ({
            name: String(b['#text']),
            abbr: String(b['@_abbr']),
        }));
    return booksCache;
}

function loadTranslation(file: string): any {
    if (translationCache.has(file)) return translationCache.get(file);
    const xml = fs.readFileSync(
        path.join(DATA_DIR, 'translations', `${file}.xml`),
        'utf-8',
    );
    const parsed = parser.parse(xml);
    translationCache.set(file, parsed);
    return parsed;
}

// ---------- core logic (ported from ../bible/index.js) ----------

function parseNotation(notation: string): [number, number, number[] | 'all'] {
    const range = (start: number, end = start) =>
        Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const [bookAndChapterRaw, versesRaw] = notation
        .split(':')
        .map(s => s.trim());
    const parts = bookAndChapterRaw.split(' ');
    const chapter = parseInt(parts.pop()!, 10);
    const bookName = parts.join(' ');

    const normalizedBook = bookName.replaceAll(' ', '');
    const books = loadBooks();
    const bookIndex = books.findIndex(
        b => b.name.includes(bookName) || b.abbr.includes(normalizedBook),
    );
    if (bookIndex < 0) throw new Error(`Book not found: "${bookName}"`);

    if (versesRaw.trim() === '*') return [bookIndex + 1, chapter, 'all'];

    const verseSections = versesRaw.split(',').map(v => v.trim());
    const verseNumbers = verseSections.flatMap(section => {
        const [start, end] = section.split('-').map(Number);
        return range(start, end);
    });

    return [bookIndex + 1, chapter, verseNumbers];
}

function lookupVerses(
    translationFile: string,
    bookNum: number,
    chapterNum: number,
    verseNums: number[] | 'all',
): { text: string; verse: number }[] {
    const bible = loadTranslation(translationFile);
    const books = toArray(bible.bible.testament).flatMap((t: any) =>
        toArray(t.book),
    );
    const book = books.find(
        (b: any) => String(b['@_number']) === String(bookNum),
    );
    if (!book)
        throw new Error(
            `Book number ${bookNum} not found in ${translationFile}`,
        );

    const chapters = toArray(book.chapter);
    const chapter = chapters.find(
        (c: any) => String(c['@_number']) === String(chapterNum),
    );
    if (!chapter) throw new Error(`Chapter ${chapterNum} not found`);

    const verses = toArray(chapter.verse).filter(
        (v: any) =>
            verseNums === 'all' ||
            verseNums.includes(parseInt(String(v['@_number']))),
    );

    return verses.map((v: any) => ({
        text: String(v['#text']),
        verse: parseInt(String(v['@_number'])),
    }));
}

function normalizeNotation(
    bookNum: number,
    chapterNum: number,
    verseNumbers: number[],
): string {
    const books = loadBooks();
    const bookName = books[bookNum - 1].name;

    const collapseRanges = (nums: number[]): string => {
        if (!nums.length) return '';
        nums = [...nums].sort((a, b) => a - b);
        const ranges: string[] = [];
        let start = nums[0],
            end = nums[0];
        for (let i = 1; i < nums.length; i++)
            if (nums[i] === end + 1) end = nums[i];
            else {
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                start = end = nums[i];
            }
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        return ranges.join(',');
    };

    return `${bookName} ${chapterNum}:${collapseRanges(verseNumbers)}`;
}

function smartSplitText(
    text: string,
    maxLength: number,
    threshold = 0.75,
): string[] {
    const chunkCount = Math.ceil(text.length / maxLength);
    const targetLength = Math.ceil(text.length / chunkCount);

    let sentences: string[] = text.match(/[^.!?]+[.!?]*["”“’'»«]*/g) ?? [text];
    sentences = sentences.map(s => s.trim());

    const chunks: string[] = [];
    let buffer = '';

    const addChunk = (chunk: string) => {
        if (chunk.trim()) chunks.push(chunk.trim());
    };

    for (const sentence of sentences) {
        buffer = `${buffer} ${sentence}`.trim();
        while (buffer.length > threshold * targetLength) {
            if (buffer.length <= targetLength) {
                addChunk(buffer);
                buffer = '';
                break;
            }
            let cut = buffer.lastIndexOf(' ', targetLength);
            if (cut < 0) cut = targetLength;
            addChunk(buffer.slice(0, cut));
            buffer = buffer.slice(cut).trim();
        }
    }
    // Fold a short trailing remainder into the previous chunk rather than
    // leaving a one-word orphan slide.
    if (
        buffer.trim() &&
        chunks.length > 0 &&
        buffer.length < threshold * targetLength
    )
        chunks[chunks.length - 1] += ` ${buffer.trim()}`;
    else addChunk(buffer);
    return chunks;
}

// ---------- public adapter ----------

export interface VerseLookup {
    translation: string;
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd: number;
    wholeChapter?: boolean;
    merge: boolean;
    inlineNumbers: boolean;
}

export function getVerseSlides(lookup: VerseLookup): VerseSlide[] {
    const translationFile = TRANSLATION_MAP[lookup.translation];
    if (!translationFile)
        throw new Error(`Unknown translation: "${lookup.translation}"`);

    const rangeStr = lookup.wholeChapter
        ? '*'
        : lookup.verseStart === lookup.verseEnd
          ? String(lookup.verseStart)
          : `${lookup.verseStart}-${lookup.verseEnd}`;
    const notation = `${lookup.book} ${lookup.chapter}:${rangeStr}`;

    const [bookNum, chapterNum, verseNumbers] = parseNotation(notation);
    const verses = lookupVerses(
        translationFile,
        bookNum,
        chapterNum,
        verseNumbers,
    );
    if (!verses.length) throw new Error(`No verses found for ${notation}`);

    if (lookup.merge) {
        const mergedText = verses
            .map(v => (lookup.inlineNumbers ? `⟨${v.verse}⟩${v.text}` : v.text))
            .join(' ');
        const ref = normalizeNotation(
            bookNum,
            chapterNum,
            verses.map(v => v.verse),
        );
        return smartSplitText(mergedText, 100).map(chunk => ({
            text: chunk,
            reference: ref,
            verse: verses[0].verse,
        }));
    }

    return verses.flatMap(v => {
        const text = lookup.inlineNumbers ? `⟨${v.verse}⟩${v.text}` : v.text;
        const ref = normalizeNotation(bookNum, chapterNum, [v.verse]);
        return smartSplitText(text, 100).map(chunk => ({
            text: chunk,
            reference: ref,
            verse: v.verse,
        }));
    });
}
