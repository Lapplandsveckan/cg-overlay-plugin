import { noTry, noTryAsync } from 'no-try';
import { type VideoEffect } from './effects/misc/video';
import type LappisOverlayPlugin from './index';

interface VideoInfo {
    id: string;

    metadata: {
        queueId: string;
        loop?: boolean;
        skipIntro?: boolean;
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

    public queueVideo(
        video: string,
        options?: Omit<VideoInfo['metadata'], 'queueId'>,
    ) {
        options = options || {};

        this.queue.push({
            id: video,
            metadata: {
                ...options,
                queueId: Math.random().toString(36).substring(7),
            },
        });
        if (this.playing) return this.plugin.sendVideoInformation();

        this.playNext();
    }

    public playVideo(
        video: string,
        options?: Omit<VideoInfo['metadata'], 'queueId'>,
    ) {
        options = options || {};

        this.queue = [
            {
                id: video,
                metadata: {
                    ...options,
                    queueId: Math.random().toString(36).substring(7),
                },
            },
        ];
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
                .startVideoSession(true, video.metadata.skipIntro),
        );
        if (error) {
            this.plugin
                .getLogger()
                .error(`Failed to start video session: ${error}`);
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
