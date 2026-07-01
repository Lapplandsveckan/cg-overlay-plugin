// Client-side subscriber for CaptionKit's undocumented realtime feed
// (api.captionkit.com/v2/realtime). CORS is open on that endpoint, so this
// connects directly from the browser rather than proxying through the
// backend. EventSource reconnects natively on drop.

export interface CaptionStreamConfig {
    channel: string;
    language: string;
    realtimeBase: string;
}

interface StreamEntry {
    id: string;
    text: string;
    updatedAt: number;
}

// Reconnect delay after a dropped/errored connection. Native EventSource
// auto-reconnects on its own, but reuses the original URL — we reconnect
// manually instead so the fresh URL carries the latest last_ack cursors.
const RECONNECT_DELAY_MS = 1000;

// Lines older than this are dropped even if no new message has arrived, so
// stale captions don't linger on-screen once the speaker moves on.
const MAX_LINE_AGE_MS = 8000;
const PRUNE_INTERVAL_MS = 500;

export function connectCaptionStream(
    config: CaptionStreamConfig,
    maxLines: number,
    onLines: (lines: string[]) => void,
) {
    if (!config.channel) return () => {};

    const captionsChannel = `${config.channel}:default:captions:${config.language}`;
    const profilesChannel = `${config.channel}:profiles`;

    let entries: StreamEntry[] = [];
    // Seed with "now" so the very first connection has a cursor to stream
    // from — without a last_ack the feed connects but sends nothing. Real
    // message ids replace this as they arrive, for accurate resume on
    // reconnect.
    const now = String(Date.now());
    const lastAck: Record<string, string> = {
        [captionsChannel]: now,
        [profilesChannel]: now,
    };
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const emit = () => onLines(entries.filter(e => e.text).map(e => e.text));

    const pruneTimer = setInterval(() => {
        const cutoff = Date.now() - MAX_LINE_AGE_MS;
        const before = entries.length;
        entries = entries.filter(e => e.updatedAt >= cutoff);
        if (entries.length !== before) emit();
    }, PRUNE_INTERVAL_MS);

    const buildUrl = () => {
        const params = new URLSearchParams();
        params.append('channel', captionsChannel);
        params.append('channel', profilesChannel);
        for (const channel of [captionsChannel, profilesChannel]) {
            if (lastAck[channel])
                params.append(`last_ack_${channel}`, lastAck[channel]);
        }
        return `${config.realtimeBase}?${params.toString()}`;
    };

    const connect = () => {
        if (closed) return;

        es = new EventSource(buildUrl());

        es.onmessage = event => {
            let msg: {
                id?: string;
                event?: string;
                channel?: string;
                data?: { text?: string };
            };
            try {
                msg = JSON.parse(event.data);
            } catch {
                return;
            }

            if (msg.channel && msg.id) lastAck[msg.channel] = msg.id;

            // {"type":"connected"|"ping",...} are connection/keepalive
            // frames, not captions — only messages carrying an "event" field
            // are transcripts.
            if (
                msg.event !== 'transcription.final' &&
                msg.event !== 'transcription.partial'
            )
                return;
            if (msg.channel !== captionsChannel) return;
            if (!msg.id) return;

            // `requestId` identifies the whole transcription session, not a
            // single line — every message in a session shares it. Each
            // caption chunk is instead uniquely identified by `id`, so key
            // entries on that; a "partial" and its later "final" share the
            // same `id` and update the same line, while a new `id` starts a
            // new line.
            const { text } = msg.data ?? {};

            let entry = entries.find(e => e.id === msg.id);
            if (!entry) {
                entry = { id: msg.id, text: '', updatedAt: 0 };
                entries.push(entry);
                if (entries.length > maxLines) entries.shift();
            }
            entry.text = text ?? '';
            entry.updatedAt = Date.now();

            emit();
        };

        es.onerror = () => {
            es?.close();
            if (!closed)
                reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        };
    };

    connect();

    return () => {
        closed = true;
        clearInterval(pruneTimer);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        es?.close();
    };
}
