import * as fs from 'fs/promises';
import * as path from 'path';
import { noTry, noTryAsync } from 'no-try';
import type LappisOverlayPlugin from './index';

const STORE_PATH = path.join(
    process.cwd(),
    'plugin-data',
    'lappis',
    'presentations.json',
);

export interface BibleSlide {
    type: 'bible';
    id: string;
    text: string;
    reference: string;
    translation: string;
    book: string;
    chapter: number;
    verse: number;
}

export interface TextSlide {
    type: 'text';
    id: string;
    text: string;
}

export interface HeadingSlide {
    type: 'heading';
    id: string;
    text: string;
}

export interface ImageSlide {
    type: 'image';
    id: string;
    mediaId: string;
}

export type Slide = BibleSlide | TextSlide | HeadingSlide | ImageSlide;

export interface Presentation {
    id: string;
    title: string;
    slides: Slide[];
    createdAt: number;
    updatedAt: number;
}

function makeId(): string {
    return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class PresentationStore {
    private plugin: LappisOverlayPlugin;
    private presentations: Presentation[] = [];
    public ready: Promise<void>;

    public constructor(plugin: LappisOverlayPlugin) {
        this.plugin = plugin;
        this.ready = this.load();
    }

    private async load() {
        const [readErr, raw] = await noTryAsync(() =>
            fs.readFile(STORE_PATH, 'utf8'),
        );
        if (readErr) {
            if ((readErr as any)?.code !== 'ENOENT')
                this.plugin
                    .getLogger()
                    .warn(
                        `Failed to read presentations: ${(readErr as any).message}`,
                    );
            return;
        }
        const [, parsed] = noTry(() => JSON.parse(raw!));
        if (parsed) this.presentations = sanitize(parsed);
    }

    private async persist() {
        await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
        await fs.writeFile(
            STORE_PATH,
            JSON.stringify(this.presentations, null, 2),
            'utf8',
        );
    }

    public list(): Presentation[] {
        return this.presentations.map(clone);
    }

    public get(id: string): Presentation | null {
        const found = this.presentations.find(p => p.id === id);
        return found ? clone(found) : null;
    }

    public async create(
        input?: Partial<Pick<Presentation, 'title' | 'slides'>>,
    ): Promise<Presentation> {
        const now = Date.now();
        const presentation: Presentation = {
            id: makeId(),
            title:
                typeof input?.title === 'string' && input.title.trim()
                    ? input.title.trim()
                    : 'Untitled',
            slides: Array.isArray(input?.slides)
                ? input.slides
                      .map(sanitizeSlide)
                      .filter((s): s is Slide => s !== null)
                : [],
            createdAt: now,
            updatedAt: now,
        };
        this.presentations.push(presentation);
        await this.persist();
        return clone(presentation);
    }

    public async update(
        id: string,
        patch: Partial<Pick<Presentation, 'title' | 'slides'>>,
    ): Promise<Presentation | null> {
        const idx = this.presentations.findIndex(p => p.id === id);
        if (idx === -1) return null;

        const current = this.presentations[idx];
        const next: Presentation = {
            ...current,
            ...(typeof patch.title === 'string'
                ? { title: patch.title.trim() || 'Untitled' }
                : {}),
            ...(Array.isArray(patch.slides)
                ? {
                      slides: patch.slides
                          .map(sanitizeSlide)
                          .filter((s): s is Slide => s !== null),
                  }
                : {}),
            updatedAt: Date.now(),
        };
        this.presentations[idx] = next;
        await this.persist();
        return clone(next);
    }

    public async remove(id: string): Promise<boolean> {
        const before = this.presentations.length;
        this.presentations = this.presentations.filter(p => p.id !== id);
        if (this.presentations.length === before) return false;
        await this.persist();
        return true;
    }
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

function sanitize(input: unknown): Presentation[] {
    if (!Array.isArray(input)) return [];
    const out: Presentation[] = [];
    for (const item of input) {
        if (!item || typeof item !== 'object') continue;
        const i = item as any;
        if (typeof i.id !== 'string' || !i.id) continue;
        if (typeof i.title !== 'string') continue;
        const slides = Array.isArray(i.slides)
            ? i.slides.map(sanitizeSlide).filter((s): s is Slide => s !== null)
            : [];
        out.push({
            id: i.id,
            title: i.title,
            slides,
            createdAt: Number.isFinite(i.createdAt) ? i.createdAt : Date.now(),
            updatedAt: Number.isFinite(i.updatedAt) ? i.updatedAt : Date.now(),
        });
    }
    return out;
}

function sanitizeSlide(raw: any): Slide | null {
    if (!raw || typeof raw !== 'object') return null;
    if (typeof raw.id !== 'string' || !raw.id) return null;
    const type = typeof raw.type === 'string' ? raw.type : null;
    if (type === 'bible') {
        return {
            type: 'bible',
            id: raw.id,
            text: typeof raw.text === 'string' ? raw.text : '',
            reference: typeof raw.reference === 'string' ? raw.reference : '',
            translation:
                typeof raw.translation === 'string' ? raw.translation : '',
            book: typeof raw.book === 'string' ? raw.book : '',
            chapter: Number.isFinite(raw.chapter) ? raw.chapter : 0,
            verse: Number.isFinite(raw.verse) ? raw.verse : 0,
        };
    }
    if (type === 'text') {
        return {
            type: 'text',
            id: raw.id,
            text: typeof raw.text === 'string' ? raw.text : '',
        };
    }
    if (type === 'heading') {
        return {
            type: 'heading',
            id: raw.id,
            text: typeof raw.text === 'string' ? raw.text : '',
        };
    }
    if (type === 'image') {
        if (typeof raw.mediaId !== 'string' || !raw.mediaId) return null;
        return { type: 'image', id: raw.id, mediaId: raw.mediaId };
    }
    return null;
}
