import React, {useEffect, useState} from 'react';
import {FormControl, FormHelperText, InputLabel, MenuItem, Select, Stack, TextField, Typography} from '@mui/material';

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

    useEffect(() => {
        conn.rawRequest('/api/routes', 'GET', {}).then(rundowns => setRoutes(rundowns.data ?? []));
    }, []);

    return {routes};
}

export const ToggleVideoRouteEditor: React.FC<ToggleVideoRouteEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState(entry?.title ?? '');
    const [route, setRoute] = useState(entry?.data?.route ?? '');
    const {routes} = useRoutes();

    return (
        <Stack spacing={2}>
            <Typography variant="h6">Toggle video route</Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText="Shown in the rundown."
            />

            <FormControl>
                <InputLabel id="toggle-video-route-select">Route</InputLabel>
                <Select
                    labelId="toggle-video-route-select"
                    label="Route"
                    value={route}
                    onChange={(event) => setRoute(event.target['value'])}
                >
                    {routes.length === 0 && (
                        <MenuItem disabled value="">
                            <em>No routes available</em>
                        </MenuItem>
                    )}
                    {routes.map(r => (
                        <MenuItem value={r.id} key={r.id}>{r.name ?? r.id}</MenuItem>
                    ))}
                </Select>
                <FormHelperText>The route to toggle when this entry plays.</FormHelperText>
            </FormControl>

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            route,
                        },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default ToggleVideoRouteEditor;
