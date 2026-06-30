import { type Effect } from '@lappis/cg-manager';
import { type PluginRef, reportError } from '../diagnostics';

export class SidePair<T extends Effect> {
    readonly left: T;
    readonly right: T;
    private plugin: PluginRef;

    constructor(left: T, right: T, plugin: PluginRef) {
        this.left = left;
        this.right = right;
        this.plugin = plugin;
    }

    private fan(label: string, fn: (e: T) => unknown) {
        return Promise.all([fn(this.left), fn(this.right)]).catch(err => {
            reportError(
                this.plugin,
                'side-pair',
                `Failed to ${label} effect`,
                err,
            );
        });
    }

    activate() {
        return this.fan('activate', e => e.activate());
    }

    deactivate() {
        return this.fan('deactivate', e => e.deactivate());
    }

    // For calling methods that aren't on the Effect base (e.g. minimize())
    each<R>(fn: (e: T) => R, label = 'run') {
        return this.fan(label, fn);
    }

    update(o: unknown) {
        return this.fan('update', e => (e as any).update?.(o));
    }

    dispose() {
        this.left.dispose();
        this.right.dispose();
    }
}
