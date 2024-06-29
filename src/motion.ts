import * as dmxlib from 'dmxnet';
import { config } from './config';
import {MotionEffect} from './effects/misc/motion';
import LappisOverlayPlugin from './index';
import {CHANNELS, getGroup, GROUPS} from './overlay';

export interface ArtNetConfig {
    universe: number;
    channel: number; // [1-512]. Uses 3 channels for RGB values

    net: number; // Destination net, default 0
    subnet: number; // Destination subnet, default 0
}

export default class MotionManager {
    private motion: MotionEffect;
    private color: string;
    private plugin: LappisOverlayPlugin;

    public constructor(plugin: LappisOverlayPlugin) {
        this.plugin = plugin;
        this.setupDMX(config.artnet);
    }

    public setMotion(clip?: string) {
        this.motion?.deactivate();
        if (!clip) return;

        this.motion = this.plugin['api'].createEffect('motion', getGroup(CHANNELS.WALL, GROUPS.MOTION), {
            clip,
            disposeOnStop: true,
            color: this.color,
        }) as MotionEffect;

        this.motion.activate();
    }

    public setColor(color?: string) {
        this.motion?.setColor(color);
        this.color = color;
    }

    private acceptIncoming = true;
    private connection: ArtNetConfig = null;

    private artnetColor: string;
    private setupDMX(config: ArtNetConfig) { // IDEA: Add support for closing the connection, eg when the user changes the config or it already exists
        if (this.connection) return;
        const { universe, net, subnet, channel } = this.connection = config;

        const dmxnet = new dmxlib.dmxnet();
        const receiver = dmxnet.newReceiver({
            universe,
            net,
            subnet,
        });

        receiver.on('data', (data: number[]) => {
            const channelIndex = channel - 1;
            const channels = data.slice(channelIndex, channelIndex + 3); // Get the three channel values

            this.artnetColor = this.channelsToColorString(channels);
        });

        setInterval(() => this.acceptIncoming && this.setColor(this.artnetColor), 50);
    }

    public enableDMX() {
        this.acceptIncoming = true;
    }

    public disableDMX() {
        this.acceptIncoming = false;
    }

    // Converts an array of numbers to a color string
    private channelsToColorString(channels: number[]) {
        let colorString = '#';
        for (const channel of channels) colorString += channel.toString(16).padStart(2, '0');

        return colorString;
    }
}
