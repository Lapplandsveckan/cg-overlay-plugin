import React, { useEffect, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LoopIcon from '@mui/icons-material/Loop';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import SkipNextIcon from '@mui/icons-material/SkipNext';
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

interface ModeOption {
    value: string;
    label: string;
    icon: React.ReactNode;
}

interface ModeRowProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: ModeOption[];
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

const ModeRow: React.FC<ModeRowProps> = ({
    label,
    value,
    onChange,
    options,
}) => (
    <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography
            variant="body2"
            color="text.secondary"
            sx={{ width: 72, flexShrink: 0 }}
        >
            {label}
        </Typography>
        <ToggleButtonGroup
            exclusive
            size="small"
            value={value}
            onChange={(_, v) => v !== null && onChange(v)}
        >
            {options.map(opt => (
                <ToggleButton key={opt.value} value={opt.value}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ display: 'flex', fontSize: 16 }}>
                            {opt.icon}
                        </Box>
                        <Typography variant="caption">{opt.label}</Typography>
                    </Stack>
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    </Stack>
);

type IntroMode = 'regular' | 'fast' | 'skip';
type PlaybackMode = 'once' | 'loop';
type WhenMode = 'queue' | 'now';

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
    const [title, setTitle] = useState(entry.title);

    const opts = entry.data?.options;
    const [intro, setIntro] = useState<IntroMode>(
        opts?.skipIntro ? 'skip' : opts?.fast ? 'fast' : 'regular',
    );
    const [playback, setPlayback] = useState<PlaybackMode>(
        opts?.loop ? 'loop' : 'once',
    );
    const [when, setWhen] = useState<WhenMode>(opts?.playNow ? 'now' : 'queue');

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

    const additionalOptionsActive =
        intro !== 'regular' || playback !== 'once' || when !== 'queue';

    const introOptions: ModeOption[] = [
        {
            value: 'regular',
            label: t('playVideo.introRegular'),
            icon: <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'fast',
            label: t('playVideo.introFast'),
            icon: <FastForwardIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'skip',
            label: t('playVideo.introSkip'),
            icon: <SkipNextIcon sx={{ fontSize: 16 }} />,
        },
    ];

    const playbackOptions: ModeOption[] = [
        {
            value: 'once',
            label: t('playVideo.playbackOnce'),
            icon: <LooksOneIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'loop',
            label: t('playVideo.playbackLoop'),
            icon: <LoopIcon sx={{ fontSize: 16 }} />,
        },
    ];

    const whenOptions: ModeOption[] = [
        {
            value: 'queue',
            label: t('playVideo.whenQueue'),
            icon: <QueueMusicIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'now',
            label: t('playVideo.whenNow'),
            icon: <FlashOnIcon sx={{ fontSize: 16 }} />,
        },
    ];

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
                    <Stack spacing={1.5}>
                        <ModeRow
                            label={t('playVideo.introLabel')}
                            value={intro}
                            onChange={v => setIntro(v as IntroMode)}
                            options={introOptions}
                        />
                        <ModeRow
                            label={t('playVideo.playbackLabel')}
                            value={playback}
                            onChange={v => setPlayback(v as PlaybackMode)}
                            options={playbackOptions}
                        />
                        <ModeRow
                            label={t('playVideo.whenLabel')}
                            value={when}
                            onChange={v => setWhen(v as WhenMode)}
                            options={whenOptions}
                        />
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
                                skipIntro: intro === 'skip',
                                fast: intro === 'fast',
                                loop: playback === 'loop',
                                playNow: when === 'now',
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
