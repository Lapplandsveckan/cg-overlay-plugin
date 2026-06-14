import React, { useState } from 'react';
import {
    Checkbox,
    FormControlLabel,
    FormHelperText,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

// @ts-expect-error -- no type declarations for @web-lib
import { RundownEditorActionBar } from '@web-lib';

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

export const PresentationEditor: React.FC<PresentationEditorProps> = ({
    entry,
    updateEntry,
    deleteEntry,
    creating,
}) => {
    const [title, setTitle] = useState(entry?.title ?? '');
    const [atem, setAtem] = useState(entry?.data.atem ?? false);

    return (
        <Stack spacing={2}>
            <Typography variant="h6">Presentation</Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText="Shown in the rundown."
            />

            <Stack>
                <FormControlLabel
                    label="Switch ATEM source"
                    control={
                        <Checkbox
                            checked={atem}
                            onChange={e => setAtem(e.target['checked'])}
                        />
                    }
                />
                <FormHelperText sx={{ marginLeft: 4 }}>
                    Cut the ATEM to the presentation source when this entry
                    plays.
                </FormHelperText>
            </Stack>

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
        </Stack>
    );
};

export default PresentationEditor;
