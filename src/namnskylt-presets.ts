import * as fs from 'fs/promises';
import * as path from 'path';
import { noTryAsync } from 'no-try';
import type LappisOverlayPlugin from './index';

const PRESETS_PATH = path.join(
    process.cwd(),
    'plugin-data',
    'lappis',
    'namnskylt-presets.json',
);

export class NamnskyltPresetStore {
    private plugin: LappisOverlayPlugin;
    private presets: string[] = [];
    public ready: Promise<void>;

    public constructor(plugin: LappisOverlayPlugin) {
        this.plugin = plugin;
        this.ready = this.load();
    }

    private async load() {
        const [err, result] = await noTryAsync(async () => {
            const raw = await fs.readFile(PRESETS_PATH, 'utf8');
            return sanitize(JSON.parse(raw));
        });
        if (err) {
            if ((err as any)?.code !== 'ENOENT') {
                this.plugin
                    .getLogger()
                    .warn(
                        `Failed to read namnskylt presets: ${(err as any).message}`,
                    );
            }
            this.presets = [];
            return;
        }
        this.presets = result;
    }

    public get(): string[] {
        return [...this.presets];
    }

    public async replace(next: unknown): Promise<string[]> {
        this.presets = sanitize(next);

        await fs.mkdir(path.dirname(PRESETS_PATH), { recursive: true });
        await fs.writeFile(
            PRESETS_PATH,
            JSON.stringify(this.presets, null, 2),
            'utf8',
        );

        return this.get();
    }
}

function sanitize(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    const seen = new Set<string>();
    for (const value of input) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (trimmed) seen.add(trimmed);
    }
    return Array.from(seen);
}
