import * as fs from 'fs/promises';
import * as path from 'path';
import { noTry, noTryAsync } from 'no-try';
import type LappisOverlayPlugin from './index';

const STORE_PATH = path.join(
    process.cwd(),
    'plugin-data',
    'lappis',
    'active-rundown.json',
);

export class ActiveRundownStore {
    private plugin: LappisOverlayPlugin;
    private id: string | null = null;
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
                        `Failed to read active-rundown: ${(readErr as any).message}`,
                    );
            return;
        }
        const [, parsed] = noTry(() => JSON.parse(raw!));
        if (parsed && typeof parsed.id === 'string') this.id = parsed.id;
    }

    public get(): string | null {
        return this.id;
    }

    public async set(id: string | null): Promise<void> {
        this.id = id;
        await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
        await fs.writeFile(STORE_PATH, JSON.stringify({ id }), 'utf8');
    }
}
