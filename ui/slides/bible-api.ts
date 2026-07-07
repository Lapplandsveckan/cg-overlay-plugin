export interface Translation {
    id: string;
    label: string;
}

export const TRANSLATIONS: Translation[] = [
    { id: 'sfb15', label: 'Svenska Folkbibeln 2015' },
    { id: 'sfb98', label: 'Svenska Folkbibeln 1998' },
    { id: 'b2000', label: 'Bibel 2000' },
    { id: 'niv', label: 'NIV' },
];

export interface Book {
    name: string;
    abbr: string;
}

export const BOOKS: Book[] = [
    { name: 'Första Moseboken', abbr: '1Mos' },
    { name: 'Andra Moseboken', abbr: '2Mos' },
    { name: 'Tredje Moseboken', abbr: '3Mos' },
    { name: 'Fjärde Moseboken', abbr: '4Mos' },
    { name: 'Femte Moseboken', abbr: '5Mos' },
    { name: 'Josua', abbr: 'Jos' },
    { name: 'Domarboken', abbr: 'Dom' },
    { name: 'Rut', abbr: 'Rut' },
    { name: 'Första Samuelsboken', abbr: '1Sam' },
    { name: 'Andra Samuelsboken', abbr: '2Sam' },
    { name: 'Första Kungaboken', abbr: '1Kung' },
    { name: 'Andra Kungaboken', abbr: '2Kung' },
    { name: 'Första Krönikeboken', abbr: '1Krön' },
    { name: 'Andra Krönikeboken', abbr: '2Krön' },
    { name: 'Esra', abbr: 'Esra' },
    { name: 'Nehemja', abbr: 'Neh' },
    { name: 'Ester', abbr: 'Est' },
    { name: 'Job', abbr: 'Job' },
    { name: 'Psaltaren', abbr: 'Ps' },
    { name: 'Ordspråksboken', abbr: 'Ord' },
    { name: 'Predikaren', abbr: 'Pred' },
    { name: 'Höga Visan', abbr: 'HögaV' },
    { name: 'Jesaja', abbr: 'Jes' },
    { name: 'Jeremia', abbr: 'Jer' },
    { name: 'Klagovisorna', abbr: 'Klag' },
    { name: 'Hesekiel', abbr: 'Hes' },
    { name: 'Daniel', abbr: 'Dan' },
    { name: 'Hosea', abbr: 'Hos' },
    { name: 'Joel', abbr: 'Joel' },
    { name: 'Amos', abbr: 'Amos' },
    { name: 'Obadja', abbr: 'Obad' },
    { name: 'Jona', abbr: 'Jona' },
    { name: 'Mika', abbr: 'Mika' },
    { name: 'Nahum', abbr: 'Nah' },
    { name: 'Habackuk', abbr: 'Hab' },
    { name: 'Sefanja', abbr: 'Sef' },
    { name: 'Haggai', abbr: 'Hag' },
    { name: 'Sakarja', abbr: 'Sak' },
    { name: 'Malaki', abbr: 'Mal' },
    { name: 'Matteusevangeliet', abbr: 'Matt' },
    { name: 'Markusevangeliet', abbr: 'Mark' },
    { name: 'Lukasevangeliet', abbr: 'Luk' },
    { name: 'Johannesevangeliet', abbr: 'Joh' },
    { name: 'Apostlagärningarna', abbr: 'Apg' },
    { name: 'Romarbrevet', abbr: 'Rom' },
    { name: 'Första Korinthierbrevet', abbr: '1Kor' },
    { name: 'Andra Korinthierbrevet', abbr: '2Kor' },
    { name: 'Galaterbrevet', abbr: 'Gal' },
    { name: 'Efesierbrevet', abbr: 'Ef' },
    { name: 'Filipperbrevet', abbr: 'Fil' },
    { name: 'Kolosserbrevet', abbr: 'Kol' },
    { name: 'Första Thessalonikerbrevet', abbr: '1Thess' },
    { name: 'Andra Thessalonikerbrevet', abbr: '2Thess' },
    { name: 'Första Timotheosbrevet', abbr: '1Tim' },
    { name: 'Andra Timotheosbrevet', abbr: '2Tim' },
    { name: 'Titusbrevet', abbr: 'Tit' },
    { name: 'Filemonbrevet', abbr: 'Filem' },
    { name: 'Hebreerbrevet', abbr: 'Hebr' },
    { name: 'Jakobsbrevet', abbr: 'Jak' },
    { name: 'Första Petrusbrevet', abbr: '1Pet' },
    { name: 'Andra Petrusbrevet', abbr: '2Pet' },
    { name: 'Första Johannesbrevet', abbr: '1Joh' },
    { name: 'Andra Johannesbrevet', abbr: '2Joh' },
    { name: 'Tredje Johannesbrevet', abbr: '3Joh' },
    { name: 'Judasbrevet', abbr: 'Jud' },
    { name: 'Uppenbarelseboken', abbr: 'Upp' },
];

export function normalize(s: string): string {
    return s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .toLowerCase();
}

export function matchBook(query: string): Book | null {
    const q = normalize(query);
    if (!q) return null;
    return (
        BOOKS.find(
            b => normalize(b.name).startsWith(q) || normalize(b.abbr) === q,
        ) ??
        BOOKS.find(
            b =>
                normalize(b.name).includes(q) ||
                normalize(b.abbr).startsWith(q),
        ) ??
        null
    );
}

export interface ParsedReference {
    book: string;
    chapter: string;
    verseRange: string;
}

export function parseReference(input: string): ParsedReference | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const colonIndex = trimmed.indexOf(':');
    const bookAndChapterRaw =
        colonIndex === -1 ? trimmed : trimmed.slice(0, colonIndex).trim();
    const versesRaw =
        colonIndex === -1 ? '*' : trimmed.slice(colonIndex + 1).trim();
    if (!bookAndChapterRaw || !versesRaw) return null;

    const parts = bookAndChapterRaw.split(' ').filter(Boolean);
    const chapterRaw = parts.pop();
    const chapter = Number(chapterRaw);
    if (!parts.length || !Number.isFinite(chapter) || chapter <= 0) return null;

    const book = matchBook(parts.join(' '));
    if (!book) return null;

    return { book: book.name, chapter: String(chapter), verseRange: versesRaw };
}

export function composeReference({
    book,
    chapter,
    verseRange,
}: ParsedReference): string {
    const match = BOOKS.find(b => b.name === book);
    const label = match?.abbr ?? book;
    if (verseRange.trim() === '*') return `${label} ${chapter}`;
    return `${label} ${chapter}:${verseRange}`;
}
