import * as fs from 'fs/promises';
import * as path from 'path';
import { noTry, noTryAsync } from 'no-try';
import type LappisOverlayPlugin from './index';

const STORE_PATH = path.join(
    process.cwd(),
    'plugin-data',
    'lappis',
    'settings.json',
);

export interface PluginSettings {
    // When enabled, playing a video also routes the projector aux outputs
    // (config.atem.projectorAuxes) to their respective ME program buses.
    projectorsToProgram: boolean;
}

const DEFAULTS: PluginSettings = {
    projectorsToProgram: false,
};

export class SettingsStore {
    private plugin: LappisOverlayPlugin;
    private settings: PluginSettings = { ...DEFAULTS };
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
                        `Failed to read plugin settings: ${(readErr as any).message}`,
                    );
            return;
        }
        const [, parsed] = noTry(() => JSON.parse(raw!));
        if (parsed && typeof parsed === 'object')
            this.settings = { ...DEFAULTS, ...parsed };
    }

    public get(): PluginSettings {
        return { ...this.settings };
    }

    public async set(patch: Partial<PluginSettings>): Promise<PluginSettings> {
        this.settings = { ...this.settings, ...patch };
        await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
        await fs.writeFile(
            STORE_PATH,
            JSON.stringify(this.settings, null, 2),
            'utf8',
        );
        return this.get();
    }
}
