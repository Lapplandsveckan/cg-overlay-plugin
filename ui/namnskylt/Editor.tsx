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

interface NamnskyltEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const NamnskyltEditor: React.FC<NamnskyltEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [name, setName] = useState(entry?.data.name ?? '');

    return (
        <>
            <Typography variant="h6">Namnskylt</Typography>
            <TextField
                label="Namn"
                value={name}
                onChange={e => setName(e.target['value'])}
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
        </>
    );
};

export default NamnskyltEditor;