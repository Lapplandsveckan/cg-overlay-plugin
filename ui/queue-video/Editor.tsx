import React, {useEffect, useState} from 'react';
import {Button, Stack, TextField} from '@mui/material';

// @ts-ignore
import {useSocket, MediaSelect} from '@web-lib';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface QueueVideoEditorProps {
    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
}

export const QueueVideoEditor: React.FC<QueueVideoEditorProps> = ({entry, updateEntry}) => {
    const socket = useSocket();

    const [media, setMedia] = useState<any | null>(entry.data);
    const [title, setTitle] = useState(entry.title);

    useEffect(() => {
        if (!entry.data) return;
        socket.caspar.getMedia().then(media => setMedia(media.get(entry.data.clip) || null));
    }, [entry.data.clip]);

    return (
        <>
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
            <Button
                onClick={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            clip: media.id,
                            destination: '1:video',
                        },
                        title,
                    });
                }}
            >
                Save
            </Button>
        </>
    );
};

export default QueueVideoEditor;