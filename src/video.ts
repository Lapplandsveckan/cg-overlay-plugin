import { noTry, noTryAsync } from 'no-try';
import { type VideoEffect } from './effects/misc/video';
import type LappisOverlayPlugin from './index';
import { VideoSessionStoppedError } from './overlay';

interface VideoInfo {
    id: string;

    metadata: {
        queueId: string;
        clipDuration?: number;
        loop?: boolean;
        skipIntro?: boolean;
        fast?: boolean;
    };
}

interface PlayingVideo {
    video: VideoInfo;
    effect: VideoEffect;
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
        const clipDuration = this.plugin['api'].getFileDatabase().get(id)
            ?.mediainfo?.format?.duration;
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
                this.plugin.getOverlayManager().stopVideoSession(true);
            }

            this.playing = null;
            this.plugin.sendVideoInformation();
            return;
        }

        const [err, effect] = noTry(() =>
            this.plugin
                .getOverlayManager()
                .playVideo(video.id, video.metadata.loop),
        );
        if (err) {
            this.plugin.getLogger().error(`Failed to play video: ${err}`);
            return;
        }

        this.playing = { video, effect };

        const [error] = await noTryAsync(() =>
            this.plugin
                .getOverlayManager()
                .startVideoSession(
                    true,
                    video.metadata.skipIntro,
                    video.metadata.fast,
                ),
        );
        if (error) {
            // VideoSessionStoppedError is a normal stop — not a real failure.
            if (!(error instanceof VideoSessionStoppedError)) {
                this.plugin
                    .getLogger()
                    .error(`Failed to start video session: ${error}`);
            }
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
        }));

        const data = {
            current: null,
            queue: media,
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
}
