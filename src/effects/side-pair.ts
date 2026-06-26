import { type Effect, type Logger } from '@lappis/cg-manager';

export class SidePair<T extends Effect> {
    readonly left: T;
    readonly right: T;
    private logger: Logger;

    constructor(left: T, right: T, logger: Logger) {
        this.left = left;
        this.right = right;
        this.logger = logger;
    }

    private fan(label: string, fn: (e: T) => unknown) {
        return Promise.all([fn(this.left), fn(this.right)]).catch(err => {
            this.logger.error(`Failed to ${label} effect`);
            this.logger.error(err);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(o: unknown) {
        return this.fan('update', e => (e as any).update?.(o));
    }

    dispose() {
        this.left.dispose();
        this.right.dispose();
    }
}
