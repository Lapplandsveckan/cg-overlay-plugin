import React, {useState} from 'react';
import {Stack, TextField, Typography} from '@mui/material';

// @ts-ignore
import {RundownEditorActionBar} from '@web-lib';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface BarsEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const BarsEditor: React.FC<BarsEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState(entry?.title ?? '');

    return (
        <Stack spacing={2}>
            <Typography variant="h6">Bars</Typography>
            <Typography variant="body2" color="text.secondary">
                Toggle cinematic black letterbox bars on the output.
            </Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText="Shown in the rundown."
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
        </Stack>
    );
};

export default BarsEditor;
