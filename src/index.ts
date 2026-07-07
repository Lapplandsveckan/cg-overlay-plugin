import path from 'path';
import { CasparPlugin, UI_INJECTION_ZONE } from '@lappis/cg-manager';
import { Templates } from './templates';
import VideoManager from './video';
import OverlayManager from './overlay';
import { AtemManager } from './atem';
import { config } from './config';
import { NamnskyltPresetStore } from './namnskylt-presets';
import { PresentationStore } from './presentations';
import { PresentationImportManager } from './presentation-import';
import { HealthMonitor } from './healthcheck';
import { ActiveRundownStore } from './active-rundown';
import { CaptionKitStore } from './captionkit';
import { SettingsStore } from './settings';
import { registerEffects, registerEffectGroups } from './effects';
import { registerRundownActions } from './rundown-actions';
import { registerCompanion } from './companion';
import { registerRoutes } from './routes';

export default class LappisOverlayPlugin extends CasparPlugin {
    public templates: Templates;
    public video: VideoManager;
    public overlay: OverlayManager;
    public atem: AtemManager;
    public namnskyltPresets: NamnskyltPresetStore;
    public presentations: PresentationStore;
    public presentationImports: PresentationImportManager;
    public activeRundown: ActiveRundownStore;
    public captionkit: CaptionKitStore;
    public settings: SettingsStore;
    public health: HealthMonitor;

    private reconnectHandler: () => void;
    private companionDispose: (() => void) | null = null;

    public getLogger() {
        return this.logger;
    }

    public getApi() {
        return this.api;
    }

    public getLoggerRef() {
        return this.logger;
    }

    // Narrow broadcast wrapper so diagnostics.ts / effects can surface errors
    // to the UI without importing the full PluginAPI type.
    public broadcast(target: string, method: string, data: unknown) {
        this.api.broadcast(target, method as any, data);
    }

    public getOverlayManager() {
        return this.overlay;
    }

    public static get pluginName() {
        return 'lappis';
    }

    public static get minChannels() {
        return 3;
    }

    public getInjectionZone(zone: UI_INJECTION_ZONE, key: string) {
        return `${zone}.${key}` as UI_INJECTION_ZONE;
    }

    public sendVideoInformation() {
        const data = this.video.getInformation();
        this.api.broadcast('videos', 'UPDATE', data);
        this.api.invalidateFeedback('lappis-rundown-video');
        this.api.invalidateFeedback('lappis-video-queue-state');
    }

    protected onEnable() {
        this.health = new HealthMonitor(this);

        // Only send CG ADD commands once both the local template HTTP server is
        // up AND CasparCG is connected. awaitConnection() resolves immediately
        // if already connected, so this is a no-op on reconnect paths.
        this.templates = new Templates(
            async () => {
                await this.api.awaitConnection();
                if (this.overlay) this.overlay.initialize();
            },
            (hcId, phase) => this.health?.ack(hcId, phase),
        );
        this.video = new VideoManager(this);
        this.overlay = new OverlayManager(this);
        this.health.onUnhealthy = type => this.overlay.handleUnhealthy(type);
        this.health.onHealthy = type => this.overlay.handleHealthy(type);
        this.atem = new AtemManager(this);
        this.namnskyltPresets = new NamnskyltPresetStore(this);
        this.presentations = new PresentationStore(this);
        this.presentationImports = new PresentationImportManager(this);
        this.activeRundown = new ActiveRundownStore(this);
        this.captionkit = new CaptionKitStore(this);
        this.settings = new SettingsStore(this);

        if (config.atem.ip) {
            this.atem.connect(config.atem.ip);
        }

        registerEffectGroups(this);
        registerEffects(this);
        registerRoutes(this);

        this.api.registerUI(
            UI_INJECTION_ZONE.PLUGIN_PAGE,
            path.join(__dirname, 'ui', 'overlay'),
        );
        this.api.registerUI(
            `${UI_INJECTION_ZONE.NAVBAR_PAGE}.slides` as UI_INJECTION_ZONE,
            path.join(__dirname, 'ui', 'presentations'),
        );
        this.api.registerUI(
            UI_INJECTION_ZONE.RUNDOWN_SIDE,
            path.join(__dirname, 'ui', 'video'),
        );
        const PANEL = UI_INJECTION_ZONE.RUNDOWN_BOTTOM_PANEL;
        this.api.registerUI(
            `${PANEL}.cg-overlay-plugin:panel.mediaTab` as UI_INJECTION_ZONE,
            path.join(__dirname, 'ui', 'media'),
        );
        this.api.registerUI(
            `${PANEL}.cg-overlay-plugin:panel.namnskyltarTab` as UI_INJECTION_ZONE,
            path.join(__dirname, 'ui', 'namnskyltar'),
        );
        this.api.registerUI(
            `${PANEL}.cg-overlay-plugin:panel.slidesTab` as UI_INJECTION_ZONE,
            path.join(__dirname, 'ui', 'slides'),
        );

        registerRundownActions(this);
        this.companionDispose = registerCompanion(this);

        this.reconnectHandler = () => {
            this.logger.info(
                'Server reconnected — restoring effect groups and persistent effects',
            );
            registerEffectGroups(this);
            this.overlay.initialize();
        };
        this.api.onReconnect(this.reconnectHandler);
    }

    protected async onDisable() {
        if (this.reconnectHandler) {
            this.api.offReconnect(this.reconnectHandler);
            this.reconnectHandler = null;
        }

        if (this.companionDispose !== null) {
            this.companionDispose();
            this.companionDispose = null;
        }

        this.health?.dispose();
        this.health = null;

        this.overlay.dispose();
        this.overlay = null;

        this.templates.dispose();
        this.templates = null;

        if (this.atem) {
            await this.atem.resetToNormal().catch(() => {});
            await this.atem.disconnect();
            this.atem = null;
        }
    }
}

export type { LappisOverlayPlugin };
