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

interface InsamlingEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const InsamlingEditor: React.FC<InsamlingEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState(entry?.title ?? '');
    const [goal, setGoal] = useState(entry?.data.goal ?? '0');
    const [now, setNow] = useState(entry?.data.now ?? '0');

    return (
        <>
            <Typography variant="h6">Insamling</Typography>
            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
            />

            <TextField
                label="Goal"
                value={goal}
                onChange={e => setGoal(e.target['value'])}
            />

            <TextField
                label="Now"
                value={now}
                onChange={e => setNow(e.target['value'])}
            />

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
        </>
    );
};

export default InsamlingEditor;