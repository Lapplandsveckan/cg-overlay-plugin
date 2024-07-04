import React, {useEffect, useState} from 'react';
import {MenuItem, Select, TextField, Typography} from '@mui/material';

// @ts-ignore
import {RundownEditorActionBar, useSocket} from '@web-lib';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface ToggleVideoRouteEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

function useRoutes() {
    const conn = useSocket();
    const [routes, setRoutes] = useState<any[]>([]);

    useEffect(() =>
        conn.rawRequest('/api/routes', 'GET', {}).then(rundowns => setRoutes(rundowns.data ?? [])),
[]);

    return {
        routes,
    };
}

export const ToggleVideoRouteEditor: React.FC<ToggleVideoRouteEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState(entry?.title ?? '');
    const [route, setRoute] = useState(entry?.data?.route ?? '');
    const { routes } = useRoutes();

    return (
        <>
            <Typography variant="h6">Toggle Video Route</Typography>
            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
            />

            <Select
                variant="outlined"
                label="Type"
                color="primary"
                value={route}
                onChange={(event) => setRoute(event.target['value'])}
            >
                {routes.map(route => (
                    <MenuItem value={route.id} key={route.id}>{route.name ?? route.id}</MenuItem>
                ))}
            </Select>

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {},
                        title,
                    });
                }}
            />
        </>
    );
};

export default ToggleVideoRouteEditor;
