import { useCallback, useEffect, useState } from 'react';

import { type useSocket } from '@web-lib';

import { type BroadcastReq, broadcastHub } from './broadcast-hub';

const ROOT = '/api/plugin/lappis';

export interface RundownSummary {
    id: string;
    name: string;
}

export type { BroadcastReq };

export function useBroadcast(
    conn: ReturnType<typeof useSocket>,
    path: string,
    method: string,
    handler: (req: BroadcastReq) => void,
) {
    useEffect(
        () => broadcastHub.subscribe(conn, path, method, handler),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [conn, handler], // path/method are stable across renders
    );
}

export function useActiveRundown(conn: ReturnType<typeof useSocket>) {
    const [rundowns, setRundowns] = useState<RundownSummary[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        if (!conn) return;
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
    }, [conn]);

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
