import * as fs from 'fs/promises';
import * as path from 'path';
import { noTry, noTryAsync } from 'no-try';
import type { PluginRef } from './diagnostics';

const STORE_PATH = path.join(
    process.cwd(),
    'plugin-data',
    'lappis',
    'atem-state.json',
);

interface AtemState {
    aux: Record<number, number>;
}

export class AtemStateStore {
    private plugin: PluginRef;
    private state: AtemState = { aux: {} };
    private writeChain: Promise<void> = Promise.resolve();
    public ready: Promise<void>;

    public constructor(plugin: PluginRef) {
        this.plugin = plugin;
        this.ready = this.load();
    }

    private async load() {
        const [readErr, raw] = await noTryAsync(() =>
            fs.readFile(STORE_PATH, 'utf8'),
        );
        if (readErr) {
            if ((readErr as NodeJS.ErrnoException)?.code !== 'ENOENT')
                this.plugin
                    .getLogger()
                    .warn(`Failed to read atem-state: ${readErr.message}`);
            return;
        }
        const [parseErr, parsed] = noTry(() => JSON.parse(raw!));
        if (parseErr) {
            this.plugin
                .getLogger()
                .warn(`Failed to parse atem-state JSON: ${parseErr.message}`);
            return;
        }
        if (parsed?.aux) this.state.aux = { ...parsed.aux };
    }

    public get(): AtemState {
        return this.state;
    }

    public setAux(apiBus: number, source: number) {
        this.state.aux[apiBus] = source;
        this.persist();
    }

    // Chain writes so concurrent setAux calls never race on the same file.
    private persist() {
        this.writeChain = this.writeChain.then(async () => {
            const json = JSON.stringify(this.state, null, 2);
            await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
            await fs.writeFile(STORE_PATH, json, 'utf8');
        });
    }
}
