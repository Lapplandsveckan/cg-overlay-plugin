import { type LappisOverlayPlugin } from './index';

function attachmentToBase64(attach: any): string | undefined {
    const data = attach?.data;
    if (!data) return undefined;
    if (Buffer.isBuffer(data)) return data.toString('base64');
    if (Array.isArray(data.data))
        return Buffer.from(data.data).toString('base64');
    if (typeof data === 'string') return data;
    return undefined;
}

function rundownItemAt(
    plugin: LappisOverlayPlugin,
    type: string,
    index1: number,
) {
    const id = plugin.activeRundown.get();
    const rd = id
        ? plugin.getApi().getRundown(id)
        : plugin.getApi().getRundowns()[0];
    if (!rd) return null;
    const items = rd.items.filter(i => i.type === type);
    return items[index1 - 1] ?? null;
}

export function registerCompanion(plugin: LappisOverlayPlugin): () => void {
    const rgb = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;

    const indexOpt = {
        type: 'number' as const,
        id: 'index',
        label: 'Index (1 = first)',
        default: 1,
        min: 1,
    };

    plugin.getApi().registerAction({
        id: 'lappis-clear-video-queue',
        name: 'Stop & clear video queue',
        handler: async () => plugin.video.stopVideo(true),
    });

    plugin.getApi().registerAction({
        id: 'lappis-rundown-video',
        name: 'Play/queue video from rundown',
        options: [indexOpt],
        handler: async opts => {
            const item = rundownItemAt(
                plugin,
                'play-video',
                opts.index as number,
            );
            if (!item) return;
            const video = plugin.getApi().getFileDatabase().get(item.data.clip);
            if (!video) return;
            dispatchVideo(plugin, video.id, item.data.options);
        },
    });

    const fmt = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const videoQueueFb = plugin.getApi().registerFeedback({
        id: 'lappis-video-queue-state',
        name: 'Video queue time left',
        description:
            'Red with total time remaining when a video is playing or queued.',
        type: 'advanced',
        evaluate: () => {
            const { active, remaining } = plugin.video.getQueueStatus();
            return {
                text: active ? fmt(remaining) : '—',
                ...(active ? { bgcolor: rgb(180, 0, 0) } : {}),
            };
        },
    });

    const videoFb = plugin.getApi().registerFeedback({
        id: 'lappis-rundown-video',
        name: 'Video from rundown',
        type: 'advanced',
        options: [indexOpt],
        evaluate: opts => {
            const item = rundownItemAt(
                plugin,
                'play-video',
                opts.index as number,
            );
            const doc =
                item && plugin.getApi().getFileDatabase().get(item.data.clip);
            const png64 = attachmentToBase64(
                (doc as any)?._attachments?.['thumb.png'],
            );
            const info = plugin.video.getInformation();
            const isPlaying =
                item && (info.current?.data as any)?.id === item.data.clip;
            const isQueued =
                !isPlaying &&
                item &&
                info.queue.some(q => (q.data as any)?.id === item.data.clip);
            return {
                text: item?.title ?? '—',
                ...(png64 ? { png64 } : {}),
                ...(isPlaying
                    ? { bgcolor: rgb(180, 0, 0) }
                    : isQueued
                      ? { bgcolor: rgb(160, 130, 0) }
                      : {}),
            };
        },
    });

    plugin.getApi().registerAction({
        id: 'lappis-rundown-namnskylt',
        name: 'Show namnskylt from rundown',
        options: [indexOpt],
        handler: async opts => {
            const item = rundownItemAt(
                plugin,
                'namnskylt',
                opts.index as number,
            );
            if (!item?.data?.name) return;
            plugin.overlay.showNamnskylt(item.data.name);
        },
    });

    const namnskyltFb = plugin.getApi().registerFeedback({
        id: 'lappis-rundown-namnskylt',
        name: 'Namnskylt from rundown',
        type: 'advanced',
        options: [indexOpt],
        evaluate: opts => {
            const item = rundownItemAt(
                plugin,
                'namnskylt',
                opts.index as number,
            );
            const overlayState = plugin.overlay.getOverlayState();
            const isLive =
                overlayState.namnskylt.on &&
                overlayState.namnskylt.name === item?.data?.name;
            return {
                text: item?.title ?? '—',
                ...(isLive ? { bgcolor: rgb(0, 160, 0) } : {}),
            };
        },
    });

    plugin.getApi().registerFeedback({
        id: 'lappis-swish-state',
        name: 'Swish live',
        type: 'boolean',
        defaultStyle: { bgcolor: rgb(0, 160, 0) },
        evaluate: () => plugin.overlay.getOverlayState().swish.on,
    });

    plugin.getApi().registerFeedback({
        id: 'lappis-bars-state',
        name: 'Bars live',
        type: 'boolean',
        defaultStyle: { bgcolor: rgb(0, 160, 0) },
        evaluate: () => plugin.overlay.getOverlayState().bars,
    });

    plugin.getApi().registerFeedback({
        id: 'lappis-insamling-state',
        name: 'Insamling live',
        type: 'boolean',
        defaultStyle: { bgcolor: rgb(0, 160, 0) },
        evaluate: () => plugin.overlay.getOverlayState().insamling,
    });

    const projectorsFb = plugin.getApi().registerFeedback({
        id: 'lappis-projectors-program',
        name: 'Projectors -> program enabled',
        type: 'boolean',
        defaultStyle: { bgcolor: rgb(0, 160, 0) },
        evaluate: () => plugin.settings.get().projectorsToProgram,
    });

    plugin.getApi().registerAction({
        id: 'lappis-projectors-program',
        name: 'Toggle projectors -> program on video',
        handler: async () => {
            await plugin.settings.ready;
            const next = !plugin.settings.get().projectorsToProgram;
            await plugin.settings.set({ projectorsToProgram: next });
            plugin
                .getApi()
                .broadcast('settings', 'UPDATE', plugin.settings.get());
            projectorsFb.invalidate();
        },
    });

    const activeRundownFb = plugin.getApi().registerFeedback({
        id: 'lappis-active-rundown',
        name: 'Active rundown',
        description:
            'Shows the name of the rundown currently selected as the Companion source.',
        type: 'advanced',
        evaluate: () => {
            const id = plugin.activeRundown.get();
            const rd = id
                ? plugin.getApi().getRundown(id)
                : plugin.getApi().getRundowns()[0];
            return { text: rd?.name ?? '—' };
        },
    });

    const pollInterval = setInterval(() => {
        videoQueueFb.invalidate();
        videoFb.invalidate();
        namnskyltFb.invalidate();
        activeRundownFb.invalidate();
        projectorsFb.invalidate();
        plugin.getApi().invalidateFeedback('lappis-swish-state');
        plugin.getApi().invalidateFeedback('lappis-bars-state');
        plugin.getApi().invalidateFeedback('lappis-insamling-state');
    }, 2500);

    return () => clearInterval(pollInterval);
}

function dispatchVideo(plugin: LappisOverlayPlugin, id: string, options?: any) {
    if (options?.playNow) plugin.video.playVideo(id, options);
    else plugin.video.queueVideo(id, options);
}
