import { Atem } from 'atem-connection';
import { config } from './config';
import { type PluginRef, getLogger, reportError } from './diagnostics';

const AUX_PATH = /^video\.auxilliaries\.(\d+)$/;

export class AtemManager {
    private connection: Atem = null;
    private plugin: PluginRef;
    public connected = false;
    // Live cache of the last source seen on each aux bus that wasn't us
    // pushing caspar — kept up to date from ATEM's own change events so a
    // restore always uses fresh data, not a one-off snapshot.
    private lastKnownAuxSources: Record<number, number> = {};
    private logger: ReturnType<typeof getLogger>;

    constructor(plugin: PluginRef) {
        this.plugin = plugin;
        this.logger = getLogger(plugin, 'atem');
    }

    public connect(ip: string) {
        this.connection = new Atem();
        this.connection.on('info', msg => this.logger.info(String(msg)));
        this.connection.on('error', err => {
            reportError(this.plugin, 'atem', `ATEM connection error`, err);
        });

        this.connection.on('connected', () => {
            this.connected = true;
            // The initial state dump doesn't trigger 'stateChanged', so seed
            // the cache from current state once the connection settles.
            for (const bus of config.atem.stageAuxBuses) {
                const apiBus = bus - 1;
                this.trackAuxSource(
                    apiBus,
                    this.connection.state.video.auxilliaries[apiBus],
                );
            }
            this.logger.info(`ATEM connected (${ip})`);
        });
        this.connection.on('disconnected', () => {
            this.connected = false;
            reportError(
                this.plugin,
                'atem',
                `ATEM disconnected — switcher control unavailable`,
            );
        });
        this.connection.on('stateChanged', (state, paths) => {
            for (const path of paths) {
                const match = AUX_PATH.exec(path);
                if (!match) continue;

                const apiBus = Number(match[1]);
                if (!config.atem.stageAuxBuses.includes(apiBus + 1)) continue;

                this.trackAuxSource(apiBus, state.video.auxilliaries[apiBus]);
            }
        });

        this.connection.connect(ip);
    }

    public disconnect() {
        this.connection.disconnect();
        this.connection.removeAllListeners();
        this.connection = null;
        this.connected = false;
    }

    private trackAuxSource(apiBus: number, source: number | undefined) {
        if (source == null || source === config.atem.stageCasparSource) return;
        this.lastKnownAuxSources[apiBus] = source;
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
        if (programInput === config.atem.videoInput) {
            this.connection.changePreviewInput(programInput);
            this.connection.changeProgramInput(previewInput);
        }
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
            if (
                this.connection.state.video.auxilliaries[apiBus] ===
                stageCasparSource
            )
                continue;
            this.connection
                .setAuxSource(stageCasparSource, apiBus)
                .catch(err =>
                    reportError(
                        this.plugin,
                        'atem',
                        `setAuxSource(${bus}) failed`,
                        err,
                    ),
                );
        }
    }

    private returnStage() {
        if (!this.stageConfigured) return;
        for (const bus of config.atem.stageAuxBuses) {
            const apiBus = bus - 1;
            const saved = this.lastKnownAuxSources[apiBus];
            if (saved == null) continue;
            this.logger.info(
                `Restoring aux ${bus} to last known source ${saved}`,
            );
            this.connection
                .setAuxSource(saved, apiBus)
                .catch(err =>
                    reportError(
                        this.plugin,
                        'atem',
                        `setAuxSource(${bus}) failed`,
                        err,
                    ),
                );
        }
    }
}
