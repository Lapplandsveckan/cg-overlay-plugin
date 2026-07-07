import { Effect, type EffectGroup } from '@lappis/cg-manager';
import type { HealthMonitor } from '../healthcheck';

// Base class for overlay effects that participate in the paint-ack healthcheck.
// Subclasses call armHealth() right before firing CG PLAY and disarmHealth()
// inside deactivate(). dispose() is handled automatically.
export abstract class HealthCheckedEffect extends Effect {
    protected hcId?: string;
    private health: HealthMonitor;
    private healthType: string;

    constructor(group: EffectGroup, health: HealthMonitor, healthType: string) {
        super(group);
        this.health = health;
        this.healthType = healthType;
    }

    // Register a fresh watchdog, cancelling any stale id from a prior activation.
    protected armHealth() {
        if (this.hcId) this.health.cancel(this.hcId);
        this.hcId = this.health.register(this.healthType);
    }

    // Cancel the watchdog so it never fires after intentional teardown.
    protected disarmHealth() {
        if (this.hcId) this.health.cancel(this.hcId);
        this.hcId = undefined;
    }

    public dispose() {
        this.disarmHealth();
        super.dispose();
    }
}
