import * as fs from 'fs/promises';
import * as path from 'path';
import { noTry, noTryAsync } from 'no-try';
import type LappisOverlayPlugin from './index';

const STORE_PATH = path.join(
    process.cwd(),
    'plugin-data',
    'lappis',
    'captionkit.json',
);

// The undocumented realtime caption feed, found via browser devtools on the
// public caption link.
const REALTIME_URL = 'https://api.captionkit.com/v2/realtime';

export interface CaptionKitSettings {
    // The account's realtime-channel UUID, found via the browser devtools
    // network tab while viewing the public caption link. Entered manually for
    // now — there's no documented API to resolve it otherwise.
    channel: string;
    language: string;
    fontSize: number;
    lines: number;
}

const DEFAULTS: CaptionKitSettings = {
    channel: '',
    language: 'sv',
    fontSize: 12,
    lines: 2,
};

export interface CaptionStreamConfig {
    channel: string;
    language: string;
    fontSize: number;
    lines: number;
    realtimeBase: string;
}

export class CaptionKitStore {
    private plugin: LappisOverlayPlugin;
    private settings: CaptionKitSettings = { ...DEFAULTS };
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
                        `Failed to read captionkit settings: ${(readErr as any).message}`,
                    );
            return;
        }
        const [, parsed] = noTry(() => JSON.parse(raw!));
        if (parsed && typeof parsed === 'object')
            this.settings = { ...DEFAULTS, ...parsed };
    }

    public get(): CaptionKitSettings {
        return { ...this.settings };
    }

    public async set(
        patch: Partial<CaptionKitSettings>,
    ): Promise<CaptionKitSettings> {
        this.settings = { ...this.settings, ...patch };
        await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
        await fs.writeFile(
            STORE_PATH,
            JSON.stringify(this.settings, null, 2),
            'utf8',
        );
        return this.get();
    }

    // Config pushed to the local caption template so it can open its own
    // EventSource to CaptionKit's realtime feed and render the text itself.
    public getStreamConfig(): CaptionStreamConfig {
        const { channel, language, fontSize, lines } = this.settings;
        return {
            channel,
            language,
            fontSize,
            lines,
            realtimeBase: REALTIME_URL,
        };
    }
}
