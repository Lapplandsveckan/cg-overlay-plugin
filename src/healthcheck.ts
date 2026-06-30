import type { Logger } from '@lappis/cg-manager';
import { type PluginRef, reportHealth, getLogger } from './diagnostics';

// How long to wait for the template to receive its play event after
// activation before logging a health warning.
const PLAY_DEADLINE_MS = 2000;
// How long to wait for the first paint (requestAnimationFrame) after play.
const PAINTED_DEADLINE_MS = 4000;

interface Pending {
    type: string;
    // True once the template posted a play ack — used to suppress the
    // "never painted" alarm when play itself never arrived (play alarm
    // is sufficient; a double-alarm would be misleading noise).
    playReceived: boolean;
    playTimer: ReturnType<typeof setTimeout> | null;
    paintedTimer: ReturnType<typeof setTimeout> | null;
}

export class HealthMonitor {
    private plugin: PluginRef;
    private logger: Logger;
    private pending = new Map<string, Pending>();
    private counter = 0;

    // Called when a watchdog fires (template failed to play or paint).
    public onUnhealthy?: (type: string) => void;
    // Called when both play + painted are confirmed successfully.
    public onHealthy?: (type: string) => void;

    constructor(plugin: PluginRef) {
        this.plugin = plugin;
        this.logger = getLogger(plugin, 'healthcheck');
    }

    // Generate an hcId and start watchdog timers. Returns the id so it can be
    // threaded into the effect options and posted back from the template.
    register(type: string): string {
        const hcId = `hc-${++this.counter}-${type}`;
        const entry: Pending = {
            type,
            playReceived: false,
            playTimer: null,
            paintedTimer: null,
        };

        entry.playTimer = setTimeout(() => {
            entry.playTimer = null;
            if (!this.pending.has(hcId)) return;
            reportHealth(
                this.plugin,
                'healthcheck',
                `Overlay "${type}" never received play event (${hcId}) — template may not have loaded`,
            );
            this.onUnhealthy?.(entry.type);
            // Painted timer will clean up the entry when it fires.
        }, PLAY_DEADLINE_MS);

        entry.paintedTimer = setTimeout(() => {
            entry.paintedTimer = null;
            if (!this.pending.has(hcId)) return;
            // Only warn about painted if play was actually received — otherwise
            // the play-never-received warning already fired and "never painted"
            // would be a redundant, confusing second alarm.
            if (entry.playReceived) {
                reportHealth(
                    this.plugin,
                    'healthcheck',
                    `Overlay "${type}" never painted after play (${hcId}) — browser may be stalled`,
                );
                this.onUnhealthy?.(entry.type);
            }
            this.pending.delete(hcId);
        }, PAINTED_DEADLINE_MS);

        this.pending.set(hcId, entry);
        return hcId;
    }

    ack(hcId: string, phase: 'play' | 'painted') {
        const entry = this.pending.get(hcId);
        if (!entry) return;

        if (phase === 'play') {
            if (entry.playTimer !== null) {
                clearTimeout(entry.playTimer);
                entry.playTimer = null;
                entry.playReceived = true;
                this.logger.debug(
                    `Overlay "${entry.type}" received play (${hcId})`,
                );
            }
        }

        if (phase === 'painted') {
            if (entry.paintedTimer !== null) {
                clearTimeout(entry.paintedTimer);
                entry.paintedTimer = null;
                this.logger.debug(`Overlay "${entry.type}" painted (${hcId})`);
                this.onHealthy?.(entry.type);
            }
            // Both phases confirmed — clean up.
            if (entry.playTimer === null) this.pending.delete(hcId);
        }
    }

    // Cancel watchdog for a superseded activation (e.g. loadThenActivate discarded,
    // or a new activation replaces a pending one before it painted).
    cancel(hcId: string) {
        const entry = this.pending.get(hcId);
        if (!entry) return;
        if (entry.playTimer !== null) clearTimeout(entry.playTimer);
        if (entry.paintedTimer !== null) clearTimeout(entry.paintedTimer);
        this.pending.delete(hcId);
    }

    dispose() {
        for (const hcId of [...this.pending.keys()]) this.cancel(hcId);
    }
}
