import { Atem } from 'atem-connection';
import { config } from './config';
import { type PluginRef, getLogger, reportError } from './diagnostics';
import { AtemStateStore } from './atem-state';

const AUX_PATH = /^video\.auxilliaries\.(\d+)$/;

// ME program sources follow the ATEM convention: ME1 = 10010, ME2 = 10020, ...
const meProgramSource = (me: number) => 10000 + me * 10;

export class AtemManager {
    private connection: Atem = null;
    private plugin: PluginRef;
    public connected = false;
    // Live cache of the last source seen on each aux bus that wasn't us
    // pushing caspar — kept up to date from ATEM's own change events (and
    // seeded from disk) so a restore always uses fresh data, not a one-off
    // snapshot.
    private lastKnownAuxSources: Record<number, number> = {};
    private store: AtemStateStore;
    private logger: ReturnType<typeof getLogger>;
    private enabled = !process.env.CASPAR_MOCK;

    constructor(plugin: PluginRef) {
        this.plugin = plugin;
        this.logger = getLogger(plugin, 'atem');
        this.store = new AtemStateStore(plugin);
        this.store.ready.then(() => {
            const saved = this.store.get();
            for (const [apiBus, source] of Object.entries(saved.aux)) {
                if (!(Number(apiBus) in this.lastKnownAuxSources))
                    this.lastKnownAuxSources[Number(apiBus)] = source;
            }
        });
    }

    public connect(ip: string) {
        if (!this.enabled) {
            this.logger.info(
                'ATEM disabled (CASPAR_MOCK) — switcher control skipped',
            );
            return;
        }

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
            this.recover();
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
        if (!this.connection) return;
        this.connection.disconnect();
        this.connection.removeAllListeners();
        this.connection = null;
        this.connected = false;
    }

    private trackAuxSource(apiBus: number, source: number | undefined) {
        if (source == null || source === config.atem.stageCasparSource) return;
        this.lastKnownAuxSources[apiBus] = source;
        this.store.setAux(apiBus, source);
    }

    // Detect a switcher left stuck on the Caspar sources (e.g. after a crash
    // that skipped a graceful disable) and restore whatever is still stuck,
    // using the on-disk / in-memory last-known-good values.
    private async recover() {
        await this.store.ready;
        if (!this.stageConfigured) return;
        for (const bus of config.atem.stageAuxBuses) {
            const apiBus = bus - 1;
            if (
                this.connection.state.video.auxilliaries[apiBus] !==
                config.atem.stageCasparSource
            )
                continue;
            const saved = this.lastKnownAuxSources[apiBus];
            if (saved == null) {
                reportError(
                    this.plugin,
                    'atem',
                    `Aux ${bus} is stuck on caspar but no last-known-good source is available to restore`,
                );
                continue;
            }
            this.logger.info(
                `Recovering aux ${bus}, stuck on caspar — restoring ${saved}`,
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

    // Guards every switcher-touching operation: a silent no-op in mock mode,
    // an error report if genuinely disconnected, true once safe to proceed.
    private ready(op: string): boolean {
        if (!this.enabled) return false;
        if (!this.connected) {
            reportError(
                this.plugin,
                'atem',
                `${op} called but ATEM is not connected`,
            );
            return false;
        }
        return true;
    }

    // Best-effort graceful reset for plugin disable — restores only the
    // channels currently sitting on caspar's values, never touching a channel
    // an operator has since moved manually. Returns once all commands have
    // been sent (not necessarily acknowledged by the switcher).
    public async resetToNormal(): Promise<void> {
        if (!this.enabled || !this.connected) return;

        const pending: Promise<unknown>[] = [];
        const { programInput, previewInput } = this.state;
        if (programInput === config.atem.videoInput) {
            pending.push(this.connection.changePreviewInput(programInput));
            pending.push(this.connection.changeProgramInput(previewInput));
        }

        if (this.stageConfigured) {
            for (const bus of config.atem.stageAuxBuses) {
                const apiBus = bus - 1;
                if (
                    this.connection.state.video.auxilliaries[apiBus] !==
                    config.atem.stageCasparSource
                )
                    continue;
                const saved = this.lastKnownAuxSources[apiBus];
                if (saved == null) continue;
                pending.push(
                    this.connection
                        .setAuxSource(saved, apiBus)
                        .catch(err =>
                            reportError(
                                this.plugin,
                                'atem',
                                `setAuxSource(${bus}) failed`,
                                err,
                            ),
                        ),
                );
            }
        }

        await Promise.all(pending);
    }

    public setVideoProgram() {
        if (!this.ready('setVideoProgram')) return;
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
        if (!this.ready('returnToPreview')) return;
        const { programInput, previewInput } = this.state;
        if (programInput === config.atem.videoInput) {
            this.connection.changePreviewInput(programInput);
            this.connection.changeProgramInput(previewInput);
        }
        this.returnStage();
    }

    // Routes the projector aux outputs to their respective ME program buses.
    // Unlike the stage auxes, projectors are never restored on stop.
    public setProjectorsProgram() {
        if (!this.ready('setProjectorsProgram')) return;
        if (config.atem.projectorAuxes.length === 0) return;
        for (const { aux, me } of config.atem.projectorAuxes) {
            const apiBus = aux - 1;
            this.connection
                .setAuxSource(meProgramSource(me), apiBus)
                .catch(err =>
                    reportError(
                        this.plugin,
                        'atem',
                        `setAuxSource(projector ${aux}) failed`,
                        err,
                    ),
                );
        }
    }

    public ensureVideoProgram() {
        if (!this.ready('ensureVideoProgram')) return;
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
