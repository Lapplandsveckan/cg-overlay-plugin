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
    private playing: PlayingVideo | null = null;

    private videoDestination = '1:video';

    public constructor(plugin: LappisOverlayPlugin) {
        this.plugin = plugin;
    }

    public stopVideo() {
        if (!this.playing) return;

        this.playing.effect.deactivate();
        this.playing = null;
    }

    public queueVideo(video: VideoInfo) {
        this.queue.push(video);
        if (this.playing) return;

        this.playNext();
    }

    public playVideo(video: VideoInfo) {
        this.queue.unshift(video);
        if (this.playing) this.stopVideo();

        this.playNext();
    }

    private async playNext() {
        const video = this.queue.shift();
        if (!video) {
            if (this.playing) {
                this.playing.effect.deactivate();
                this.plugin.stopVideoSession();
            }

            this.playing = null;
            return;
        }

        const [err, effect] = noTry(() => this.plugin.playVideo(video.id));
        if (err) {
            this.plugin.getLogger().error(`Failed to play video: ${err}`);
            return;
        }

        const shouldStartSession = !this.playing;
        this.playing = {video, effect};
        if (shouldStartSession) {
            const [error] = await noTryAsync(() => this.plugin.startVideoSession());
            if (error) {
                this.plugin.getLogger().error(`Failed to start video session: ${error}`);
                return;
            }
        }

        await effect.play();
        await effect.waitForFinish();

        if (this.queue.length) setTimeout(() => effect.deactivate(), 250);
        this.playNext();
    }
}