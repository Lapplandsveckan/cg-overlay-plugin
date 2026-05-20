import React, {useState} from 'react';
import {Checkbox, FormControlLabel, FormHelperText, Stack, TextField, Typography} from '@mui/material';

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
        <Stack spacing={2}>
            <Typography variant="h6">Swish</Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText="Shown in the rundown."
            />

            <TextField
                label="Swish number"
                value={number}
                placeholder="123 607 27 97"
                InputLabelProps={{shrink: true}}
                onChange={e => setNumber(e.target['value'])}
                helperText="The Swish number displayed on screen."
            />

            <TextField
                label="Labels"
                value={labels}
                onChange={e => setLabels(e.target['value'])}
                helperText="Comma-separated labels shown alongside the number."
            />

            <Stack>
                <FormControlLabel
                    label="Skip first reveal"
                    control={
                        <Checkbox
                            checked={skipFirst}
                            onChange={e => setSkipFirst(e.target['checked'])}
                        />
                    }
                />
                <FormHelperText sx={{marginLeft: 4}}>
                    Skip the intro animation when the overlay appears.
                </FormHelperText>
            </Stack>

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
        </Stack>
    );
};

export default SwishEditor;
