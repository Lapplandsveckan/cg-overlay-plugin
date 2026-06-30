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
        } else if (entry.conn !== conn) {
            // `conn` changed identity (e.g. a reconnect). Re-register on the
            // live connection by mutating the existing entry in place, so
            // other subscribers' cleanup closures (which hold a reference to
            // this same entry object) see the new conn/listener rather than
            // unregistering a stale one or deleting a freshly-created entry.
            entry.conn.routes.unregister(entry.listener);
            entry.conn = conn;
            entry.listener = {
                path,
                method,
                handler: (req: BroadcastReq) =>
                    entry!.subs.forEach(fn => fn(req)),
            };
            conn.routes.register(entry.listener);
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
