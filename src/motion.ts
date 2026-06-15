import * as dmxlib from 'dmxnet';
import TransportStream from 'winston-transport';
import { type Logger } from '@lappis/cg-manager';
import { config } from './config';
import { type MotionEffect } from './effects/misc/motion';
import type LappisOverlayPlugin from './index';
import { CHANNELS, getGroup, GROUPS } from './overlay';

class PluginLoggerTransport extends TransportStream {
    private pluginLogger: Logger;

    public constructor(pluginLogger: Logger) {
        super({ level: 'warn' });
        this.pluginLogger = pluginLogger;
    }

    public log(info: any, callback: () => void) {
        setImmediate(() => this.emit('logged', info));

        const message = String(info.message ?? '');
        switch (info.level) {
            case 'error':
                this.pluginLogger.error(message);
                break;
            case 'warn':
                this.pluginLogger.warn(message);
                break;
            default:
                this.pluginLogger.debug(message);
                break;
        }

        callback();
    }
}

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

        this.motion = this.plugin['api'].createEffect(
            'motion',
            getGroup(CHANNELS.WALL, GROUPS.MOTION),
            {
                clip,
                disposeOnStop: true,
                color: this.color,
            },
        ) as MotionEffect;

        this.motion.activate();
    }

    public setColor(color?: string) {
        this.motion?.setColor(color);
        this.color = color;
    }

    private acceptIncoming = true;
    private connection: ArtNetConfig = null;

    private artnetColor: string;
    private setupDMX(_config: ArtNetConfig) {
        // IDEA: Add support for closing the connection, eg when the user changes the config or it already exists
        if (this.connection) return;
        const { universe, net, subnet, channel } = (this.connection = _config);

        const dmxnet = new dmxlib.dmxnet({
            log: {
                level: 'warn',
                transports: [
                    new PluginLoggerTransport(
                        this.plugin.getLogger().scope('dmxnet'),
                    ),
                ],
            },
        });
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

        // Buffer the color changes from dmx to avoid flickering
        setInterval(() => {
            if (!this.acceptIncoming || !this.artnetColor) return;
            this.setColor(this.artnetColor);
            this.artnetColor = null;
        }, 50);
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
        for (const channel of channels)
            colorString += channel.toString(16).padStart(2, '0');

        return colorString;
    }
}
