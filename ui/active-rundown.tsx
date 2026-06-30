import React, { useCallback, useEffect, useState } from 'react';
import {
    FormControl,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import { useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import { type BroadcastReq, useBroadcast } from './hooks';

const ROOT = '/api/plugin/lappis';

interface RundownSummary {
    id: string;
    name: string;
}

export default function ActiveRundownSelector() {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
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

    const handleChange = (id: string) => {
        const next = id || null;
        setActiveId(next);
        conn.rawRequest(`${ROOT}/active-rundown`, 'UPDATE', { id: next }).catch(
            () => {},
        );
    };

    return (
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('activeRundown.label')}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                    value={activeId ?? ''}
                    onChange={e => handleChange(e.target.value)}
                    displayEmpty
                >
                    <MenuItem value="">
                        <em>{t('activeRundown.none')}</em>
                    </MenuItem>
                    {rundowns.map(rd => (
                        <MenuItem key={rd.id} value={rd.id}>
                            {rd.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Stack>
    );
}
