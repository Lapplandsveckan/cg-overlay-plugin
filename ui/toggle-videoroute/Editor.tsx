import React, {useState} from 'react';
import {TextField, Typography} from '@mui/material';

// @ts-ignore
import {RundownEditorActionBar} from '@web-lib';

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

export const ToggleVideoRouteEditor: React.FC<ToggleVideoRouteEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState(entry?.title ?? '');

    return (
        <>
            <Typography variant="h6">Toggle Video Route</Typography>
            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
            />

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
