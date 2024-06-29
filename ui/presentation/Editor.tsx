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

interface PresentationEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const PresentationEditor: React.FC<PresentationEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState(entry?.title ?? '');
    const [atem, setAtem] = useState(entry?.data.atem ?? false);

    return (
        <>
            <Typography variant="h6">Presentation</Typography>
            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
            />

            <FormControlLabel
                label="ATEM"

                control={<Checkbox />}

                checked={atem}
                onChange={e => setAtem(e.target['checked'])}
            />

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            atem,
                        },
                        title,
                    });
                }}
            />
        </>
    );
};

export default PresentationEditor;
