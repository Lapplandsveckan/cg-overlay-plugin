import {MotionEffect} from './effects/misc/motion';
import LappisOverlayPlugin from './index';
import {CHANNELS, getGroup, GROUPS} from './overlay';

export default class MotionManager {
    private motion: MotionEffect;
    private color: string;
    private plugin: LappisOverlayPlugin;

    public constructor(plugin: LappisOverlayPlugin) {
        this.plugin = plugin;
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
}