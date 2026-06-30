import {
    Effect,
    type EffectGroup,
    PlayCommand,
    StopCommand,
    Transform,
    type BasicLayer,
    type Command,
    BasicChannel,
    type Logger,
} from '@lappis/cg-manager';
import { execChecked } from '../../diagnostics';

type Tuple<T, N extends number> = N extends N
    ? number extends N
        ? T[]
        : _TupleOf<T, N, []>
    : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N
    ? R
    : _TupleOf<T, N, [T, ...R]>;

export interface RouteEffectOptions {
    source: BasicChannel | BasicLayer;
    transform?: Tuple<number, 8>;
    disposeOnStop?: boolean;
    logger?: Logger;
}

export class RouteEffect extends Effect {
    protected options: RouteEffectOptions;
    private logger: Logger | null;

    public constructor(group: EffectGroup, options: RouteEffectOptions) {
        super(group);

        this.options = options;
        this.logger = options.logger ?? null;
        this.allocateLayers();

        if (options.transform)
            this.setTransform(Transform.fromArray(options.transform));
    }

    protected get layer() {
        return this.layers[0];
    }

    public activate() {
        if (!super.activate()) return;

        const cmd = PlayCommand.route(this.options.source);
        cmd.allocate(this.layer);

        const result = this.executor.execute(cmd);
        if (this.logger)
            execChecked(this.logger, 'activate route effect', result);
        return result;
    }

    public deactivate() {
        if (!super.deactivate()) return;

        const cmd = new StopCommand(this.layer);
        const result = this.executor.execute(cmd);
        if (this.logger)
            execChecked(this.logger, 'deactivate route effect', result);
        if (this.options.disposeOnStop)
            result.then(() => !this.active && this.dispose());

        return result;
    }

    public getMetadata(): Record<string, unknown> {
        return {};
    }

    public updatePositions(): Command[] {
        if (!this.active) return [];
        if (this.options.source instanceof BasicChannel) return [];
        return [PlayCommand.route(this.options.source).allocate(this.layer)];
    }
}
