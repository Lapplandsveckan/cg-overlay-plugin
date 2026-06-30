// The cg-manager client only ever dispatches an incoming broadcast to the
// FIRST listener registered for a given path+method (its route registry is
// first-match-wins), and `useSocket()` returns one shared connection for the
// whole app. So if every component registered its own listener on the same
// path, only the first-mounted one would ever receive updates.
//
// This hub mirrors the host's own fix for the same problem (e.g.
// CasparServerApi: one route listener, fanned out to subscribers via an
// EventEmitter) — register exactly one listener per path+method and fan out
// to every subscriber client-side. Each cg-manager injection zone is bundled
// separately, so the hub instance lives on globalThis to stay shared across
// bundles instead of each getting its own, disconnected one.

export type BroadcastReq = { data?: any };
type Conn = {
    routes: { register(l: object): any; unregister(l: object): any };
};
type Handler = (req: BroadcastReq) => void;
type Entry = { conn: Conn; listener: object; subs: Set<Handler> };

class BroadcastHub {
    private entries = new Map<string, Entry>(); // key: `path|method`

    subscribe(
        conn: Conn | null | undefined,
        path: string,
        method: string,
        handler: Handler,
    ): () => void {
        if (!conn) return () => {};

        const key = `${path}|${method}`;
        let entry = this.entries.get(key);
        // Self-heal if `conn` changed identity (e.g. a reconnect) since the
        // entry was created — re-register on the live connection instead of
        // leaving a stranded listener on the dead one.
        if (entry && entry.conn !== conn) {
            entry.conn.routes.unregister(entry.listener);
            entry = undefined;
        }
        if (!entry) {
            const subs = new Set<Handler>();
            const listener = {
                path,
                method,
                handler: (req: BroadcastReq) => subs.forEach(fn => fn(req)),
            };
            entry = { conn, listener, subs };
            this.entries.set(key, entry);
            conn.routes.register(listener);
        }
        entry.subs.add(handler);

        return () => {
            entry!.subs.delete(handler);
            if (entry!.subs.size === 0) {
                entry!.conn.routes.unregister(entry!.listener);
                this.entries.delete(key);
            }
        };
    }
}

const globalHub = globalThis as unknown as {
    __lappisBroadcastHub?: BroadcastHub;
};
export const broadcastHub = (globalHub.__lappisBroadcastHub ??=
    new BroadcastHub());
