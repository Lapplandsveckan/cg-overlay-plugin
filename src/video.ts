import {VideoEffect} from './effects/misc/video';
import LappisOverlayPlugin from './index';
import {noTry, noTryAsync} from 'no-try';

interface VideoInfo {
    id: string;

    metadata: {
        queueId: string;
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

    public queueVideo(video: string) {
        this.queue.push({id: video, metadata: {queueId: Math.random().toString(36).substring(7)}});
        if (this.playing) return this.plugin.sendVideoInformation();

        this.playNext();
    }

    public playVideo(video: string) {
        this.queue = [{id: video, metadata: {queueId: Math.random().toString(36).substring(7)}}];
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

        const [err, effect] = noTry(() => this.plugin.getOverlayManager().playVideo(video.id));
        if (err) {
            this.plugin.getLogger().error(`Failed to play video: ${err}`);
            return;
        }

        const shouldStartSession = !this.playing;
        this.playing = {video, effect};
        if (shouldStartSession) {
            const [error] = await noTryAsync(() => this.plugin.getOverlayManager().startVideoSession(true));
            if (error) {
                this.plugin.getLogger().error(`Failed to start video session: ${error}`);
                return;
            }
        }

        this.plugin.sendVideoInformation();

        try {
            await effect.play();
            await effect.waitForFinish();
        } catch (err) {
            this.plugin.getLogger().error(`Failed to play video: ${err}`);
        }

        if (this.queue.length) setTimeout(() => effect.deactivate(), 250);
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
        if (this.playing && this.playing.video.metadata.queueId === id) this.stopVideo();

        this.plugin.sendVideoInformation();
    }
}
