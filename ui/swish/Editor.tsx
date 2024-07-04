import React, {useState} from 'react';
import {Checkbox, FormControlLabel, TextField, Typography} from '@mui/material';

// @ts-ignore
import {RundownEditorActionBar} from '@web-lib';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface SwishEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const SwishEditor: React.FC<SwishEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState(entry?.title ?? '');
    const [number, setNumber] = useState(entry?.data.number ?? '');
    const [labels, setLabels] = useState(entry?.data.labels ?? '');
    const [skipFirst, setSkipFirst] = useState(entry?.data.skipFirst ?? false);

    return (
        <>
            <Typography variant="h6">Swish</Typography>
            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
            />

            <TextField
                label="Number"
                value={number}
                onChange={e => setNumber(e.target['value'])}
            />

            <TextField
                label="Labels"
                value={labels}
                onChange={e => setLabels(e.target['value'])}
            />

            <FormControlLabel
                label="Skip First"

                control={<Checkbox />}

                checked={skipFirst}
                onChange={e => setSkipFirst(e.target['checked'])}
            />

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            number,
                            labels,
                            skipFirst,
                        },
                        title,
                    });
                }}
            />
        </>
    );
};

export default SwishEditor;
