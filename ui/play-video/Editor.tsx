import React, {useEffect, useState} from 'react';
import {Button, Stack, TextField, Typography} from '@mui/material';

// @ts-ignore
import {useSocket, MediaSelect, RundownEditorActionBar} from '@web-lib';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface PlayVideoEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const PlayVideoEditor: React.FC<PlayVideoEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const socket = useSocket();

    const [media, setMedia] = useState<any | null>(entry.data);
    const [title, setTitle] = useState(entry.title);

    useEffect(() => {
        if (!entry.data) return;
        socket.caspar.getMedia().then(media => setMedia(media.get(entry.data.clip) || null));
    }, [entry.data.clip]);

    return (
        <>
            <Typography variant="h6">Play Video</Typography>
            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
            />
            <Stack
                spacing={2}
                direction="row"
            >
                <MediaSelect
                    clip={media}
                    onClipSelect={clip => setMedia(clip)}
                />
            </Stack>

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            clip: media?.id,
                        },
                        title,
                    });
                }}
            />
        </>
    );
};

export default PlayVideoEditor;