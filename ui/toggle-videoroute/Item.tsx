import React, {useEffect, useState} from 'react';

// @ts-ignore
import {useSocket} from '@web-lib';
import { Typography } from '@mui/material';

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
    const [name, setName] = useState('');

    useEffect(() =>
        conn.rawRequest(`/api/routes/${entry.data.route}`, 'GET', {}).then(result => setName(result.data.name)),
    [entry.data.route]);

    return (
        <Typography>
            Toggle Video Route {name}
        </Typography>
    );
}

export default ToggleVideoRouteRundownItem;
