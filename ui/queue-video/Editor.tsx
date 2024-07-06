import React, {useEffect, useState} from 'react';
import {Button, Checkbox, FormControlLabel, Stack, TextField, Typography} from '@mui/material';

// @ts-ignore
import {useSocket, MediaSelect, RundownEditorActionBar} from '@web-lib';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface QueueVideoEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const QueueVideoEditor: React.FC<QueueVideoEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const socket = useSocket();

    const [media, setMedia] = useState<any | null>(entry.data);
    const [secondaryMedia, setSecondaryMedia] = useState<any | null>(entry.data);
    const [title, setTitle] = useState(entry.title);

    const [skipIntro, setSkipIntro] = useState(entry.data.options?.skipIntro ?? false);
    const [loop, setLoop] = useState(entry.data.options?.loop ?? false);

    useEffect(() => {
        if (!entry.data) return;
        socket.caspar.getMedia().then(media => setMedia(media.get(entry.data.clip) || null));
    }, [entry.data.clip]);

    useEffect(() => {
        if (!entry.data.options) return;
        socket.caspar.getMedia().then(media => setSecondaryMedia(media.get(entry.data.options?.secondaryVideo) || null));
    }, [entry.data.options?.secondaryVideo]);

    return (
        <>
            <Typography variant="h6">Queue Video</Typography>
            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
            />

            <Stack
                spacing={2}
                direction="row"
            >
                <Typography variant="h6">Primary video</Typography>
                <MediaSelect
                    clip={media}
                    onClipSelect={clip => setMedia(clip)}
                />
                <Button
                    onClick={() => setMedia(null)}
                >
                    Remove
                </Button>
            </Stack>

            <Stack
                spacing={2}
                direction="row"
            >
                <Typography variant="h6">Secondary video</Typography>
                <MediaSelect
                    clip={secondaryMedia}
                    onClipSelect={clip => setSecondaryMedia(clip)}
                />
                <Button
                    onClick={() => setSecondaryMedia(null)}
                >
                    Remove
                </Button>
            </Stack>

            <Stack>
                <FormControlLabel
                    label="Skip Intro"

                    control={<Checkbox />}

                    checked={skipIntro}
                    onChange={e => setSkipIntro(e.target['checked'])}
                />
                <FormControlLabel
                    label="Loop"

                    control={<Checkbox />}

                    checked={loop}
                    onChange={e => setLoop(e.target['checked'])}
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
                            options: {
                                loop,
                                skipIntro,

                                secondaryVideo: secondaryMedia?.id,
                            }
                        },
                        title,
                    });
                }}
            />
        </>
    );
};

export default QueueVideoEditor;
