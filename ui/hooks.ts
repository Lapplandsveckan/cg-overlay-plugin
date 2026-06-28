import { useEffect } from 'react';

import { type useSocket } from '@web-lib';

// Fan-out registry so we only ever hand conn.routes one listener per path+method,
// regardless of how many React components subscribe. This avoids the cg-manager
// client registry overwriting earlier registrations when multiple components
// register on the same path.
export type BroadcastReq = { data?: any };
type BroadcastEntry = {
    listener: object;
    subs: Set<(req: BroadcastReq) => void>;
};
const broadcastSubs = new Map<string, BroadcastEntry>();

export function useBroadcast(
    conn: ReturnType<typeof useSocket>,
    path: string,
    method: string,
    handler: (req: BroadcastReq) => void,
) {
    useEffect(() => {
        const key = `${path}|${method}`;
        let entry = broadcastSubs.get(key);
        if (!entry) {
            const subs = new Set<(req: BroadcastReq) => void>();
            const listener = {
                path,
                method,
                handler: (req: BroadcastReq) => subs.forEach(fn => fn(req)),
            };
            entry = { listener, subs };
            broadcastSubs.set(key, entry);
            conn.routes.register(listener);
        }
        entry.subs.add(handler);
        return () => {
            entry!.subs.delete(handler);
            if (entry!.subs.size === 0) {
                conn.routes.unregister(entry!.listener);
                broadcastSubs.delete(key);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handler]); // path/method/conn are stable across renders
}
