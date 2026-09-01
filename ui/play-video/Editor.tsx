import React, { useEffect, useRef, useState } from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import ContentCutIcon from '@mui/icons-material/ContentCut';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FastForwardIcon from '@mui/icons-material/FastForward';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import GradientIcon from '@mui/icons-material/Gradient';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LoopIcon from '@mui/icons-material/Loop';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import {
    useBroadcast,
    useSocket,
    MediaSelect,
    RundownEditorActionBar,
} from '@web-lib';
import { useTranslation } from '../i18n';
import { formatTime } from '../format';
import {
    DEFAULT_FPS,
    fullDurationOf,
    isTrimmed,
    normalizeIntro,
    normalizeOutro,
    normalizeVideoPayload,
    type IntroMode,
    type OutroMode,
} from '../video-utils';
import { casparMediaTopic, videosTopic } from '../broadcast-topics';
import { ModeRow, type ModeOption } from '../mode-row';
import { type VideoInspectorValue } from './VideoInspector';
import VideoInspectorModal from './VideoInspectorModal';

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

const VideoPicker: React.FC<VideoPickerProps> = ({ clip, onChange }) => (
    <Stack direction="row" spacing={1} alignItems="stretch">
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <MediaSelect clip={clip} onClipSelect={onChange} />
        </Box>
    </Stack>
);

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
    const [intro, setIntro] = useState<IntroMode>(normalizeIntro(opts));
    const [outro, setOutro] = useState<OutroMode>(normalizeOutro(opts));
    const [playback, setPlayback] = useState<PlaybackMode>(
        opts?.loop ? 'loop' : 'once',
    );
    const [when, setWhen] = useState<WhenMode>(opts?.playNow ? 'now' : 'queue');
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [channelFps, setChannelFps] = useState(DEFAULT_FPS);
    const [trim, setTrim] = useState<VideoInspectorValue>({
        inPoint: opts?.inPoint ?? 0,
        outPoint: opts?.outPoint ?? 0,
        volume: opts?.volume ?? 1,
    });

    const clip = entry.data?.clip as string | undefined;
    useEffect(() => {
        if (!clip) return;

        socket.caspar
            .getAllMedia()
            .then(media => setMedia(media.find(m => m.id === clip) ?? null))
            .catch(console.error);
    }, [clip, socket]);

    useBroadcast(casparMediaTopic, ({ key, value }) => {
        if (clip && key === clip) setMedia(value ?? null);
    });

    useEffect(() => {
        socket
            .rawRequest(`/api/plugin/lappis/videos`, 'GET', {})
            .then(res =>
                setChannelFps(normalizeVideoPayload(res.data).channelFps),
            )
            .catch(() => {});
    }, [socket]);
    useBroadcast(videosTopic, data =>
        setChannelFps(normalizeVideoPayload(data).channelFps),
    );

    const fullDuration = fullDurationOf(media);

    // Reset trim when the clip is swapped, but not on the initial async media load.
    const lastClipId = useRef<string | null>(entry.data?.clip ?? null);
    const hydrated = useRef(!entry.data?.clip);
    const outPointReady = useRef(opts?.outPoint !== undefined);
    useEffect(() => {
        const clipId = media?.id ?? null;

        if (!hydrated.current) {
            if (clipId === lastClipId.current) hydrated.current = true;
            return;
        }

        if (clipId === lastClipId.current) return;

        lastClipId.current = clipId;
        outPointReady.current = false;
        setTrim({ inPoint: 0, outPoint: 0, volume: 1 });
    }, [media?.id]);

    useEffect(() => {
        if (outPointReady.current || !fullDuration) return;

        outPointReady.current = true;
        setTrim(prev => ({ ...prev, outPoint: fullDuration }));
    }, [fullDuration]);

    // Ignore the outPoint=0 placeholder to avoid a one-frame "trimmed" flash.
    const trimmed = outPointReady.current && isTrimmed(trim, fullDuration);
    const volumeChanged = trim.volume !== 1;
    const trimActive = trimmed || volumeChanged;
    const trimRangeValid = trim.outPoint > trim.inPoint;

    const inspectorSummary = [
        trimmed &&
            t('playVideo.trimmedChip', {
                in: formatTime(trim.inPoint),
                out: formatTime(trim.outPoint),
            }),
        volumeChanged &&
            t('playVideo.volumeChip', {
                volume: Math.round(trim.volume * 100),
            }),
    ]
        .filter(Boolean)
        .join(' · ');

    const additionalOptionsActive =
        intro !== 'regular' ||
        outro !== 'cut' ||
        playback !== 'once' ||
        when !== 'queue' ||
        trimActive;

    const introOptions: ModeOption[] = [
        {
            value: 'regular',
            label: t('transition.introRegular'),
            icon: <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'fast',
            label: t('transition.introFast'),
            icon: <FastForwardIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'fade',
            label: t('transition.introFade'),
            icon: <GradientIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'cut',
            label: t('transition.introCut'),
            icon: <ContentCutIcon sx={{ fontSize: 16 }} />,
        },
    ];

    const outroOptions: ModeOption[] = [
        {
            value: 'fade',
            label: t('transition.outroFade'),
            icon: <GradientIcon sx={{ fontSize: 16 }} />,
        },
        {
            value: 'cut',
            label: t('transition.outroCut'),
            icon: <ContentCutIcon sx={{ fontSize: 16 }} />,
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
                        {t('transition.additionalOptions')}
                        {additionalOptionsActive && ' •'}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Stack spacing={1.5}>
                        <ModeRow
                            label={t('transition.introLabel')}
                            value={intro}
                            onChange={v => setIntro(v as IntroMode)}
                            options={introOptions}
                        />
                        <ModeRow
                            label={t('transition.outroLabel')}
                            value={outro}
                            onChange={v => setOutro(v as OutroMode)}
                            options={outroOptions}
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
                        {media && (
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1.5}
                                sx={{ pt: 1 }}
                            >
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ flexGrow: 1, minWidth: 0 }}
                                    noWrap
                                >
                                    {inspectorSummary || t('playVideo.noTrim')}
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                        <ContentCutIcon sx={{ fontSize: 16 }} />
                                    }
                                    onClick={() => setInspectorOpen(true)}
                                    sx={{ flexShrink: 0 }}
                                >
                                    {t('playVideo.openInspector')}
                                </Button>
                            </Stack>
                        )}
                    </Stack>
                </AccordionDetails>
            </Accordion>

            <VideoInspectorModal
                open={inspectorOpen}
                onClose={() => setInspectorOpen(false)}
                clip={media}
                value={trim}
                onChange={setTrim}
                fps={channelFps}
            />

            <RundownEditorActionBar
                exists={!creating}
                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            clip: media?.id,
                            options: {
                                intro,
                                outro,
                                loop: playback === 'loop',
                                playNow: when === 'now',
                                ...(trimActive
                                    ? {
                                          ...(trimmed && trimRangeValid
                                              ? {
                                                    inPoint: trim.inPoint,
                                                    outPoint: trim.outPoint,
                                                }
                                              : {}),
                                          volume: trim.volume,
                                      }
                                    : {}),
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
