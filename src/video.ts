import { noTry, noTryAsync } from 'no-try';
import { type VideoEffect } from './effects/misc/video';
import type LappisOverlayPlugin from './index';
import {
    CHANNELS,
    VideoSessionStoppedError,
    type VideoIntroMode,
    type VideoOutroMode,
} from './overlay';

interface VideoInfo {
    id: string;

    metadata: {
        queueId: string;
        clipDuration?: number;
        loop?: boolean;
        intro?: VideoIntroMode;
        outro?: VideoOutroMode;
        inPoint?: number;
        outPoint?: number;
        volume?: number;

        // Deprecated, kept only so entries saved before intro/outro existed
        // still resolve to a sensible mode — see normalizeIntroOutro().
        skipIntro?: boolean;
        fast?: boolean;
    };
}

interface PlayingVideo {
    video: VideoInfo;
    effect: VideoEffect;
}

function normalizeIntroOutro(metadata: VideoInfo['metadata']): {
    intro: VideoIntroMode;
    outro: VideoOutroMode;
} {
    const intro =
        metadata.intro ??
        (metadata.skipIntro ? 'cut' : metadata.fast ? 'fast' : 'regular');
    return { intro, outro: metadata.outro ?? 'cut' };
}

export default class VideoManager {
    private plugin: LappisOverlayPlugin;
    private queue: VideoInfo[] = [];
    public playing: PlayingVideo | null = null;

    public constructor(plugin: LappisOverlayPlugin) {
        this.plugin = plugin;
    }

    public stopVideo(clearQueue = false) {
        if (clearQueue) this.queue = [];
        if (this.playing) this.playing.effect.cancel();
    }

    private makeVideoInfo(
        id: string,
        options: Omit<VideoInfo['metadata'], 'queueId' | 'clipDuration'> = {},
    ): VideoInfo {
        const fullDuration = this.plugin['api'].getFileDatabase().get(id)
            ?.mediainfo?.format?.duration;
        const clipDuration =
            fullDuration === undefined
                ? undefined
                : Math.max(
                      0,
                      Math.min(options.outPoint ?? fullDuration, fullDuration) -
                          (options.inPoint ?? 0),
                  );

        return {
            id,
            metadata: {
                ...options,
                queueId: Math.random().toString(36).substring(7),
                clipDuration,
            },
        };
    }

    public queueVideo(
        video: string,
        options?: Omit<VideoInfo['metadata'], 'queueId' | 'clipDuration'>,
    ) {
        this.queue.push(this.makeVideoInfo(video, options));
        if (this.playing) return this.plugin.sendVideoInformation();
        this.playNext();
    }

    public playVideo(
        video: string,
        options?: Omit<VideoInfo['metadata'], 'queueId' | 'clipDuration'>,
    ) {
        this.queue = [this.makeVideoInfo(video, options)];
        if (this.playing) return this.stopVideo();
        this.playNext();
    }

    private async playNext() {
        this.plugin.sendVideoInformation();

        const video = this.queue.shift();
        if (!video) {
            if (this.playing) {
                this.playing.effect.deactivate();
                const { outro } = normalizeIntroOutro(
                    this.playing.video.metadata,
                );
                const [stopErr] = await noTryAsync(() =>
                    this.plugin
                        .getOverlayManager()
                        .stopVideoSession(true, outro),
                );
                if (stopErr) {
                    this.plugin
                        .getLogger()
                        .error(`Failed to stop video session: ${stopErr}`);
                }
            }

            this.playing = null;
            this.plugin.sendVideoInformation();
            this.plugin.getOverlayManager().resumeCaption();
            return;
        }

        const { loop, inPoint, outPoint, volume } = video.metadata;
        const { intro } = normalizeIntroOutro(video.metadata);
        const [err, effect] = noTry(() =>
            this.plugin.getOverlayManager().playVideo(video.id, {
                loop,
                seekSec: inPoint,
                lengthSec:
                    outPoint !== undefined
                        ? outPoint - (inPoint ?? 0)
                        : undefined,
                volume,
            }),
        );
        if (err) {
            this.plugin.getLogger().error(`Failed to play video: ${err}`);
            return;
        }

        this.playing = { video, effect };
        this.plugin.getOverlayManager().suspendCaption();

        const [error] = await noTryAsync(() =>
            this.plugin.getOverlayManager().startVideoSession(true, intro),
        );
        if (error) {
            // VideoSessionStoppedError is a normal stop — not a real failure.
            if (!(error instanceof VideoSessionStoppedError)) {
                this.plugin
                    .getLogger()
                    .error(`Failed to start video session: ${error}`);
            }
            this.plugin.getOverlayManager().resumeCaption();
            return;
        }

        this.plugin.sendVideoInformation();

        const [playErr] = await noTryAsync(async () => {
            await effect.play();
            await effect.waitForFinish();
        });
        if (playErr) {
            this.plugin.getLogger().error(`Failed to play video: ${playErr}`);
            effect.deactivate();
        }

        if (this.queue.length && effect.active)
            setTimeout(() => effect.deactivate(), 250);

        this.playNext();
    }

    public getInformation() {
        const videos = this.queue.slice();
        if (this.playing) videos.unshift(this.playing.video);

        const media = videos.map(video => ({
            id: video.metadata.queueId,
            data: this.plugin['api'].getFileDatabase().get(video.id),
            options: video.metadata,
        }));

        const data = {
            current: null,
            queue: media,
            channelFps: this.plugin
                .getOverlayManager()
                .getChannelFps(CHANNELS.VIDEO),
        };

        if (this.playing) {
            const video = media.shift();

            data.current = {
                ...video,
                metadata: this.playing.effect.getMetadata(),
            };
        }

        return data;
    }

    public getQueueStatus() {
        const queued = this.queue.reduce(
            (sum, v) => sum + (v.metadata.clipDuration ?? 0),
            0,
        );
        const current = this.playing?.effect.getRemainingTime() ?? 0;
        return {
            active: this.playing !== null || this.queue.length > 0,
            remaining: queued + current,
        };
    }

    public clearQueue() {
        this.queue = [];
        this.plugin.sendVideoInformation();
    }

    public removeItem(id: string) {
        this.queue = this.queue.filter(video => video.metadata.queueId !== id);
        if (this.playing?.video.metadata.queueId === id) this.stopVideo();

        this.plugin.sendVideoInformation();
    }

    public stopByClip(clipId: string) {
        if (this.playing?.video.id === clipId) {
            this.stopVideo();
            return;
        }

        const index = this.queue.findIndex(video => video.id === clipId);
        if (index !== -1) this.queue.splice(index, 1);

        this.plugin.sendVideoInformation();
    }
}
