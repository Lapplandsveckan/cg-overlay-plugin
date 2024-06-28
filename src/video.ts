import {VideoEffect} from './effects/misc/video';
import {WebError} from 'rest-exchange-protocol';
import {CasparPlugin} from '@lappis/cg-manager';
import LappisOverlayPlugin from './index';
import {noTry, noTryAsync} from 'no-try';

interface VideoInfo {
    id: string;
    // metadata: {
    //     destination: string;
    // };
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
        if (!this.playing) return;
        if (clearQueue) this.queue = [];

        this.playing.effect.cancel();
    }

    public queueVideo(video: VideoInfo) {
        this.queue.push(video);
        if (this.playing) return;

        this.playNext();
    }

    public playVideo(video: VideoInfo) {
        this.queue = [video];
        if (this.playing) return this.stopVideo();

        this.playNext();
    }

    private async playNext() {
        const video = this.queue.shift();
        if (!video) {
            if (this.playing) {
                this.playing.effect.deactivate();
                this.plugin.getOverlayManager().stopVideoSession();
            }

            this.playing = null;
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
            const [error] = await noTryAsync(() => this.plugin.getOverlayManager().startVideoSession());
            if (error) {
                this.plugin.getLogger().error(`Failed to start video session: ${error}`);
                return;
            }
        }

        this.plugin.getLogger().info(`Playing video: ${video.id}`);

        await effect.play();
        await effect.waitForFinish();

        this.plugin.getLogger().info(`Finished playing video: ${video.id}`);

        if (this.queue.length) setTimeout(() => effect.deactivate(), 250);
        this.playNext();
    }
}