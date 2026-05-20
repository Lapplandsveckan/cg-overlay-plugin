import React, {useEffect, useState} from 'react';

// @ts-ignore
import {useSocket} from '@web-lib';
import {Skeleton, Stack, Typography} from '@mui/material';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface ToggleVideoRouteRundownItemProps {
    entry: RundownEntry;
}

export const ToggleVideoRouteRundownItem: React.FC<ToggleVideoRouteRundownItemProps> = ({entry}) => {
    const conn = useSocket();
    const [name, setName] = useState<string | null>(null);
    const routeId = entry.data?.route;

    useEffect(() => {
        if (!routeId) return;
        setName(null);
        conn.rawRequest(`/api/routes/${routeId}`, 'GET', {}).then(result => setName(result.data?.name ?? routeId));
    }, [routeId]);

    return (
        <Stack direction="row" spacing={1} alignItems="baseline">
            <Typography variant="body1">Toggle route</Typography>
            {!routeId ? (
                <Typography variant="body2" color="warning.main">No route set</Typography>
            ) : name === null ? (
                <Skeleton variant="text" width={80} />
            ) : (
                <Typography variant="body2" color="text.secondary">{name}</Typography>
            )}
        </Stack>
    );
};

export default ToggleVideoRouteRundownItem;
