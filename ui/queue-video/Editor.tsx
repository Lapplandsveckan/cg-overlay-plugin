import React, {useEffect, useState} from 'react';
import {Box, Button, Checkbox, FormControlLabel, FormHelperText, Stack, TextField, Typography} from '@mui/material';

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

interface VideoPickerProps {
    label: string;
    description: string;
    clip: any | null;
    onChange: (clip: any | null) => void;
}

const VideoPicker: React.FC<VideoPickerProps> = ({label, description, clip, onChange}) => (
    <Box>
        <Typography variant="subtitle2" fontWeight={600}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{description}</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{marginTop: 1}}>
            <Box sx={{flexGrow: 1}}>
                <MediaSelect clip={clip} onClipSelect={onChange} />
            </Box>
            <Button
                variant="outlined"
                size="small"
                disabled={!clip}
                onClick={() => onChange(null)}
            >
                Clear
            </Button>
        </Stack>
    </Box>
);

export const QueueVideoEditor: React.FC<QueueVideoEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const socket = useSocket();

    const [media, setMedia] = useState<any | null>(null);
    const [secondaryMedia, setSecondaryMedia] = useState<any | null>(null);
    const [title, setTitle] = useState(entry.title);

    const [skipIntro, setSkipIntro] = useState(entry.data.options?.skipIntro ?? false);
    const [loop, setLoop] = useState(entry.data.options?.loop ?? false);

    useEffect(() => {
        if (!entry.data?.clip) return;
        socket.caspar.getMedia().then(media => setMedia(media.get(entry.data.clip) || null));
    }, [entry.data?.clip]);

    useEffect(() => {
        if (!entry.data?.options?.secondaryVideo) return;
        socket.caspar.getMedia().then(media => setSecondaryMedia(media.get(entry.data.options.secondaryVideo) || null));
    }, [entry.data?.options?.secondaryVideo]);

    return (
        <Stack spacing={2}>
            <Typography variant="h6">Queue video</Typography>
            <Typography variant="body2" color="text.secondary">
                Adds the clip to the video queue when this entry plays.
            </Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText="Shown in the rundown."
            />

            <VideoPicker
                label="Primary video"
                description="Played on the main output."
                clip={media}
                onChange={setMedia}
            />

            <VideoPicker
                label="Secondary video"
                description="Played simultaneously on the wall, if set."
                clip={secondaryMedia}
                onChange={setSecondaryMedia}
            />

            <Box>
                <Stack>
                    <FormControlLabel
                        label="Skip intro"
                        control={
                            <Checkbox
                                checked={skipIntro}
                                onChange={e => setSkipIntro(e.target['checked'])}
                            />
                        }
                    />
                    <FormHelperText sx={{marginLeft: 4, marginTop: -0.5}}>
                        Skip the lead-in animation of the clip.
                    </FormHelperText>
                </Stack>
                <Stack sx={{marginTop: 1}}>
                    <FormControlLabel
                        label="Loop"
                        control={
                            <Checkbox
                                checked={loop}
                                onChange={e => setLoop(e.target['checked'])}
                            />
                        }
                    />
                    <FormHelperText sx={{marginLeft: 4, marginTop: -0.5}}>
                        Loop the clip until manually stopped.
                    </FormHelperText>
                </Stack>
            </Box>

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
        </Stack>
    );
};

export default QueueVideoEditor;
