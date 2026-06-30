import { useCallback, useEffect, useState } from 'react';

import { type useSocket } from '@web-lib';

const ROOT = '/api/plugin/lappis';

export interface RundownSummary {
    id: string;
    name: string;
}

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

export function useActiveRundown(conn: ReturnType<typeof useSocket>) {
    const [rundowns, setRundowns] = useState<RundownSummary[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        conn.rawRequest(`${ROOT}/rundowns`, 'GET', {})
            .then((res: any) => {
                if (Array.isArray(res?.data)) setRundowns(res.data);
            })
            .catch(() => {});

        conn.rawRequest(`${ROOT}/active-rundown`, 'GET', {})
            .then((res: any) => {
                setActiveId(
                    res?.data?.id && typeof res.data.id === 'string'
                        ? res.data.id
                        : null,
                );
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onUpdate = useCallback(
        (req: BroadcastReq) =>
            setActiveId(
                req?.data?.id && typeof req.data.id === 'string'
                    ? req.data.id
                    : null,
            ),
        [],
    );
    useBroadcast(conn, 'plugin/lappis/active-rundown', 'UPDATE', onUpdate);

    const setActive = useCallback(
        (id: string | null) => {
            setActiveId(id);
            conn.rawRequest(`${ROOT}/active-rundown`, 'UPDATE', { id }).catch(
                () => {},
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    return { rundowns, activeId, setActive };
}
