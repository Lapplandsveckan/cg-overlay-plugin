import { Atem } from 'atem-connection';
import { config } from './config';
import { type PluginRef, getLogger, reportError } from './diagnostics';

export class AtemManager {
    private connection: Atem = null;
    private plugin: PluginRef;
    public connected = false;
    private savedAuxSources: Record<number, number> = {};

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
        this.setStageCaspar();
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
        this.returnStage();
    }

    public ensureVideoProgram() {
        if (!this.connected) return;
        if (this.state.programInput !== config.atem.videoInput)
            this.setVideoProgram();
        else this.setStageCaspar();
    }

    private get state() {
        return this.connection.state.video.mixEffects[0];
    }

    private get stageConfigured() {
        return (
            this.connected &&
            config.atem.stageAuxBuses.length > 0 &&
            config.atem.stageCasparSource >= 0
        );
    }

    private setStageCaspar() {
        if (!this.stageConfigured) return;
        const { stageCasparSource, stageAuxBuses } = config.atem;
        for (const bus of stageAuxBuses) {
            const apiBus = bus - 1;
            const current = this.connection.state.video.auxilliaries[apiBus];
            if (current === stageCasparSource) continue;
            this.savedAuxSources[bus] = current;
            this.connection.setAuxSource(stageCasparSource, apiBus).catch(err =>
                reportError(this.plugin, 'atem', `setAuxSource(${bus}) failed`, err),
            );
        }
    }

    private returnStage() {
        if (!this.stageConfigured) return;
        for (const bus of config.atem.stageAuxBuses) {
            const saved = this.savedAuxSources[bus];
            if (saved == null) continue;
            this.connection.setAuxSource(saved, bus - 1).catch(err =>
                reportError(this.plugin, 'atem', `setAuxSource(${bus}) failed`, err),
            );
            delete this.savedAuxSources[bus];
        }
    }
}
