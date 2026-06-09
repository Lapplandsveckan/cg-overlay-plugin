// Stub for the external Bible API.
// Replace `fetchVerses` with a real fetch against the production endpoint.

export interface Translation {
    id: string;
    label: string;
}

export const TRANSLATIONS: Translation[] = [
    {id: 'sfb', label: 'Svenska Folkbibeln'},
    {id: 'b2000', label: 'Bibel 2000'},
    {id: 'svk1917', label: 'Svenska 1917'},
];

export interface VerseLookup {
    translation: string;
    book: string;
    chapter: number;
    verseStart: number;
    verseEnd: number;
}

export interface VerseResult {
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

const MOCK_VERSES: Record<string, string> = {
    'sfb|Joh|3|16': 'Ty så älskade Gud världen att han utgav sin enfödde Son, för att var och en som tror på honom inte ska gå förlorad utan ha evigt liv.',
    'sfb|Joh|3|17': 'Gud har inte sänt sin Son till världen för att döma världen, utan för att världen ska bli frälst genom honom.',
    'sfb|Rom|8|28': 'Vi vet att allt samverkar till det bästa för dem som älskar Gud, för dem som är kallade efter hans beslut.',
    'sfb|Rom|8|29': 'För dem som han har förutsett har han också förutbestämt till att formas efter hans Sons bild.',
    'sfb|Ps|23|1': 'Herren är min herde, mig ska intet fattas.',
    'sfb|Ps|23|2': 'Han låter mig vila på gröna ängar, han för mig till vatten där jag finner ro.',
    'sfb|Ps|23|3': 'Han vederkvicker min själ, han leder mig på rätta stigar för sitt namns skull.',
    'sfb|Fil|4|13': 'Allt förmår jag genom honom som ger mig kraft.',
    'b2000|Joh|3|16': 'Så älskade Gud världen att han gav den sin ende son, för att de som tror på honom inte ska gå under utan ha evigt liv.',
    'svk1917|Joh|3|16': 'Ty så älskade Gud världen, att han utgav sin enfödde Son, på det att var och en som tror på honom skall icke förgås, utan hava evigt liv.',
};

export async function fetchVerses(lookup: VerseLookup): Promise<VerseResult[]> {
    // TODO: replace with real external API call
    const results: VerseResult[] = [];
    for (let v = lookup.verseStart; v <= lookup.verseEnd; v++) {
        const key = `${lookup.translation}|${lookup.book}|${lookup.chapter}|${v}`;
        const text = MOCK_VERSES[key] ?? `[${lookup.book} ${lookup.chapter}:${v}] (mock — verse not in stub data)`;
        results.push({book: lookup.book, chapter: lookup.chapter, verse: v, text});
    }
    return results;
}

export function formatReference(book: string, chapter: number, verse: number): string {
    return `${book} ${chapter}:${verse}`;
}
