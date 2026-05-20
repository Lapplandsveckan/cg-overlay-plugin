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

interface TextEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const [title, setTitle] = useState(entry?.title ?? '');
    const [text, setText] = useState(entry?.data.text ?? '');

    return (
        <Stack spacing={2}>
            <Typography variant="h6">Text</Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText="Shown in the rundown."
            />

            <TextField
                label="Text"
                value={text}
                onChange={e => setText(e.target['value'])}
                multiline
                minRows={3}
                helperText="The text shown on the wall."
            />

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            text,
                        },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default TextEditor;
