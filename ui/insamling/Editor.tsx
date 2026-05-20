import React, {useState} from 'react';
import {InputAdornment, Stack, TextField, Typography} from '@mui/material';

// @ts-ignore
import {RundownEditorActionBar} from '@web-lib';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface InsamlingEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const InsamlingEditor: React.FC<InsamlingEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState(entry?.title ?? '');
    const [goal, setGoal] = useState<string>(String(entry?.data.goal ?? '0'));
    const [now, setNow] = useState<string>(String(entry?.data.now ?? '0'));

    const kr = <InputAdornment position="end">kr</InputAdornment>;

    return (
        <Stack spacing={2}>
            <Typography variant="h6">Insamling</Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText="Shown in the rundown."
            />

            <Stack direction="row" spacing={2}>
                <TextField
                    label="Current"
                    type="number"
                    value={now}
                    onChange={e => setNow(e.target['value'])}
                    InputProps={{endAdornment: kr}}
                    helperText="Amount collected so far."
                    sx={{flex: 1}}
                />
                <TextField
                    label="Goal"
                    type="number"
                    value={goal}
                    onChange={e => setGoal(e.target['value'])}
                    InputProps={{endAdornment: kr}}
                    helperText="Target amount for the campaign."
                    sx={{flex: 1}}
                />
            </Stack>

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            goal,
                            now,
                        },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default InsamlingEditor;
