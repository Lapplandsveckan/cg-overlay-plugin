import { useCallback, useEffect, useState } from 'react';

import { Method, useBroadcast, type useSocket } from '@web-lib';

import { topic } from './broadcast-topics';

const ROOT = '/api/plugin/lappis';

export interface RundownSummary {
    id: string;
    name: string;
}

const activeRundownTopic = topic<{ id: string | null }>(
    'plugin/lappis/active-rundown',
    Method.UPDATE,
);

export function useActiveRundown(conn: ReturnType<typeof useSocket>) {
    const [rundowns, setRundowns] = useState<RundownSummary[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        if (!conn) return;
        conn.rawRequest(`${ROOT}/rundowns`, 'GET', {})
            .then((res: any) => {
                if (Array.isArray(res)) setRundowns(res);
            })
            .catch(() => {});

        conn.rawRequest(`${ROOT}/active-rundown`, 'GET', {})
            .then((res: any) => {
                setActiveId(
                    res?.id && typeof res.id === 'string' ? res.id : null,
                );
            })
            .catch(() => {});
    }, [conn]);

    useBroadcast(activeRundownTopic, data =>
        setActiveId(data?.id && typeof data.id === 'string' ? data.id : null),
    );

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
