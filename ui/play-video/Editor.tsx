import React, {useEffect, useState} from 'react';
import {Accordion, AccordionDetails, AccordionSummary, Box, Button, Checkbox, FormControlLabel, FormGroup, Stack, TextField, Typography} from '@mui/material';

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

interface VideoPickerProps {
    clip: any | null;
    onChange: (clip: any | null) => void;
}

const VideoPicker: React.FC<VideoPickerProps> = ({clip, onChange}) => (
    <Stack direction="row" spacing={1} alignItems="stretch">
        <Box sx={{flexGrow: 1, minWidth: 0}}>
            <MediaSelect clip={clip} onClipSelect={onChange} />
        </Box>
        {clip && (
            <Button variant="outlined" onClick={() => onChange(null)} sx={{flexShrink: 0}}>
                Clear
            </Button>
        )}
    </Stack>
);

export const PlayVideoEditor: React.FC<PlayVideoEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const socket = useSocket();

    const [media, setMedia] = useState<any | null>(null);
    const [title, setTitle] = useState(entry.title);

    const [skipIntro, setSkipIntro] = useState(entry.data.options?.skipIntro ?? false);
    const [loop, setLoop] = useState(entry.data.options?.loop ?? false);
    const [playNow, setPlayNow] = useState(entry.data.options?.playNow ?? false);

    useEffect(() => {
        if (!entry.data?.clip) return;
        socket.caspar.getMedia().then(media => setMedia(media.get(entry.data.clip) || null));
    }, [entry.data?.clip]);

    const additionalOptionsActive = playNow || skipIntro || loop;

    return (
        <Stack spacing={2.5}>
            <Typography variant="h6">Play video</Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => setTitle(e.target['value'])}
                fullWidth
            />

            <VideoPicker clip={media} onChange={setMedia} />

            <Accordion
                defaultExpanded={additionalOptionsActive}
                disableGutters
                square
                sx={{
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 1,
                    '&:before': {display: 'none'},
                }}
            >
                <AccordionSummary
                    expandIcon={<Box component="span" sx={{fontSize: 14}}>▾</Box>}
                    sx={{minHeight: 40, '& .MuiAccordionSummary-content': {margin: '8px 0'}}}
                >
                    <Typography variant="body2">
                        Additional options{additionalOptionsActive && ' •'}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <FormGroup row sx={{gap: 2}}>
                        <FormControlLabel
                            label="Play now"
                            title="Stop the current video and clear the queue before playing this clip."
                            control={
                                <Checkbox
                                    size="small"
                                    checked={playNow}
                                    onChange={e => setPlayNow(e.target['checked'])}
                                />
                            }
                        />
                        <FormControlLabel
                            label="Skip intro"
                            title="Skip the lead-in animation of the clip."
                            control={
                                <Checkbox
                                    size="small"
                                    checked={skipIntro}
                                    onChange={e => setSkipIntro(e.target['checked'])}
                                />
                            }
                        />
                        <FormControlLabel
                            label="Loop"
                            title="Loop the clip until manually stopped."
                            control={
                                <Checkbox
                                    size="small"
                                    checked={loop}
                                    onChange={e => setLoop(e.target['checked'])}
                                />
                            }
                        />
                    </FormGroup>
                </AccordionDetails>
            </Accordion>

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
                                playNow,
                            }
                        },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default PlayVideoEditor;
