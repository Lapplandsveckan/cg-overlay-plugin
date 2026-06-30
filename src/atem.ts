import { Atem } from 'atem-connection';
import { config } from './config';
import { type PluginRef, getLogger, reportError } from './diagnostics';

export class AtemManager {
    private connection: Atem = null;
    private plugin: PluginRef;
    public connected = false;

    constructor(plugin: PluginRef) {
        this.plugin = plugin;
    }

    public connect(ip: string) {
        const logger = getLogger(this.plugin, 'atem');
        this.connection = new Atem();
        this.connection.on('info', msg => logger.info(String(msg)));
        this.connection.on('error', err => {
            reportError(this.plugin, 'atem', `ATEM connection error`, err);
        });

        this.connection.on('connected', () => {
            this.connected = true;
            logger.info(`ATEM connected (${ip})`);
        });
        this.connection.on('disconnected', () => {
            this.connected = false;
            reportError(
                this.plugin,
                'atem',
                `ATEM disconnected — switcher control unavailable`,
            );
        });

        this.connection.connect(ip);
    }

    public disconnect() {
        this.connection.disconnect();
        this.connection = null;
        this.connected = false;
    }

    public setVideoProgram() {
        if (!this.connected) {
            reportError(
                this.plugin,
                'atem',
                'setVideoProgram called but ATEM is not connected',
            );
            return;
        }
        if (config.atem.videoInput < 0) {
            reportError(
                this.plugin,
                'atem',
                'setVideoProgram called but no video input is configured',
            );
            return;
        }

        const { programInput } = this.state;

        this.connection.changePreviewInput(programInput);
        this.connection.changeProgramInput(config.atem.videoInput);
    }

    public returnToPreview() {
        if (!this.connected) {
            reportError(
                this.plugin,
                'atem',
                'returnToPreview called but ATEM is not connected',
            );
            return;
        }
        const { programInput, previewInput } = this.state;
        if (programInput !== config.atem.videoInput) return;

        this.connection.changePreviewInput(programInput);
        this.connection.changeProgramInput(previewInput);
    }

    public ensureVideoProgram() {
        if (!this.connected) return;
        if (this.state.programInput !== config.atem.videoInput)
            this.setVideoProgram();
    }

    private get state() {
        return this.connection.state.video.mixEffects[0];
    }
}
