import React, { useEffect, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSocket, MediaSelect, RundownEditorActionBar } from '@web-lib';
import { useTranslation } from '../i18n';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface PlayVideoEditorProps {
    creating?: boolean;
    instant?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

interface VideoPickerProps {
    clip: any | null;
    onChange: (clip: any | null) => void;
    clearLabel: string;
}

const VideoPicker: React.FC<VideoPickerProps> = ({
    clip,
    onChange,
    clearLabel,
}) => (
    <Stack direction="row" spacing={1} alignItems="stretch">
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <MediaSelect clip={clip} onClipSelect={onChange} />
        </Box>
        {clip && (
            <Button
                variant="outlined"
                onClick={() => onChange(null)}
                sx={{ flexShrink: 0 }}
            >
                {clearLabel}
            </Button>
        )}
    </Stack>
);

export const PlayVideoEditor: React.FC<PlayVideoEditorProps> = ({
    entry,
    updateEntry,
    deleteEntry,
    creating,
    instant,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const socket = useSocket();

    const [media, setMedia] = useState<any | null>(null);
    const [secondaryMedia, setSecondaryMedia] = useState<any | null>(null);
    const [title, setTitle] = useState(entry.title);

    const [skipIntro, setSkipIntro] = useState(
        entry.data?.options?.skipIntro ?? false,
    );
    const [loop, setLoop] = useState(entry.data?.options?.loop ?? false);
    const [playNow, setPlayNow] = useState(
        entry.data?.options?.playNow ?? false,
    );

    useEffect(() => {
        if (!entry.data?.clip) return;
        const clip = entry.data.clip as string;

        socket.caspar.getMedia().then((map: Map<string, any>) => {
            if (map.has(clip)) setMedia(map.get(clip));
        });

        const onMedia = (key: string, value: any) => {
            if (key === clip && value) setMedia(value);
        };
        socket.caspar.on('media', onMedia);
        return () => {
            socket.caspar.off('media', onMedia);
        };
    }, [entry.data?.clip]);

    useEffect(() => {
        if (!entry.data?.options?.secondaryVideo) return;
        socket.caspar
            .getMedia()
            .then(media =>
                setSecondaryMedia(
                    media.get(entry.data.options.secondaryVideo) || null,
                ),
            );
    }, [entry.data?.options?.secondaryVideo]);

    const additionalOptionsActive =
        playNow || skipIntro || loop || !!secondaryMedia;

    return (
        <Stack spacing={2.5}>
            <Typography variant="h6">
                {t(instant ? 'playVideo.headingInstant' : 'playVideo.heading')}
            </Typography>

            {!instant && (
                <TextField
                    label={t('playVideo.titleLabel')}
                    value={title}
                    onChange={e => setTitle(e.target['value'])}
                    fullWidth
                />
            )}

            <VideoPicker
                clip={media}
                onChange={setMedia}
                clearLabel={t('playVideo.clearButton')}
            />

            <Accordion
                defaultExpanded={additionalOptionsActive}
                disableGutters
                square
                sx={{
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 1,
                    '&:before': { display: 'none' },
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ fontSize: 14 }} />}
                    sx={{
                        minHeight: 40,
                        '& .MuiAccordionSummary-content': { margin: '8px 0' },
                    }}
                >
                    <Typography variant="body2">
                        {t('playVideo.additionalOptions')}
                        {additionalOptionsActive && ' •'}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={2}>
                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', marginBottom: 0.5 }}
                            >
                                {t('playVideo.secondaryVideoLabel')}
                            </Typography>
                            <VideoPicker
                                clip={secondaryMedia}
                                onChange={setSecondaryMedia}
                                clearLabel={t('playVideo.clearButton')}
                            />
                        </Box>

                        <FormGroup row sx={{ gap: 2 }}>
                            <FormControlLabel
                                label={t('playVideo.playNowLabel')}
                                title={t('playVideo.playNowTitle')}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={playNow}
                                        onChange={e =>
                                            setPlayNow(e.target['checked'])
                                        }
                                    />
                                }
                            />
                            <FormControlLabel
                                label={t('playVideo.skipIntroLabel')}
                                title={t('playVideo.skipIntroTitle')}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={skipIntro}
                                        onChange={e =>
                                            setSkipIntro(e.target['checked'])
                                        }
                                    />
                                }
                            />
                            <FormControlLabel
                                label={t('playVideo.loopLabel')}
                                title={t('playVideo.loopTitle')}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={loop}
                                        onChange={e =>
                                            setLoop(e.target['checked'])
                                        }
                                    />
                                }
                            />
                        </FormGroup>
                    </Stack>
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

                                secondaryVideo: secondaryMedia?.id,
                            },
                        },
                        ...(instant ? {} : { title }),
                    });
                }}
            />
        </Stack>
    );
};

export default PlayVideoEditor;
