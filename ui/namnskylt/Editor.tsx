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

interface NamnskyltEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const NamnskyltEditor: React.FC<NamnskyltEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [name, setName] = useState(entry?.data.name ?? '');

    return (
        <Stack spacing={2}>
            <Typography variant="h6">Namnskylt</Typography>

            <TextField
                label="Namn"
                value={name}
                onChange={e => setName(e.target['value'])}
                required
                error={name === ''}
                helperText={name === '' ? 'Required' : 'Name shown on the lower-third overlay.'}
            />

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            name,
                        },
                        title: name,
                    });
                }}
            />
        </Stack>
    );
};

export default NamnskyltEditor;
