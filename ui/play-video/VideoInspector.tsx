import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    IconButton,
    Slider,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

import ContentCutIcon from '@mui/icons-material/ContentCut';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useTranslation } from '../i18n';
import { buildThumbnailUrl } from '../thumbnail';
import {
    DEFAULT_FPS,
    formatFrameTimecode,
    fullDurationOf,
    parseFrameTimecode,
    stepFrames,
} from '../video-utils';

const MAX_FADE_SECONDS = 15;

export interface VideoInspectorValue {
    inPoint: number;
    outPoint: number;
    volume: number;
    fadeIn: number;
    fadeOut: number;
}

interface VideoInspectorProps {
    clip: any;
    value: VideoInspectorValue;
    onChange: (value: VideoInspectorValue) => void;
    fps?: number;
}

interface RowProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}

const Row: React.FC<RowProps> = ({ icon, label, children }) => (
    <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ display: 'flex', fontSize: 16, color: 'text.secondary' }}>
            {icon}
        </Box>
        <Typography
            variant="body2"
            color="text.secondary"
            sx={{ width: 72, flexShrink: 0 }}
        >
            {label}
        </Typography>
        <Box sx={{ flexGrow: 1 }}>{children}</Box>
    </Stack>
);

// Free-types while focused; reformats/commits on blur or Enter. ArrowUp/Down
// nudge by one frame via `onNudge` without needing to focus out first.
function useTimecodeField(
    seconds: number,
    fps: number,
    commit: (parsed: number) => void,
    onNudge?: (direction: 1 | -1) => void,
) {
    const [text, setText] = useState(() => formatFrameTimecode(seconds, fps));
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (!focused) setText(formatFrameTimecode(seconds, fps));
    }, [seconds, fps, focused]);

    const commitText = () => {
        const parsed = parseFrameTimecode(text, fps);
        if (parsed !== null) commit(parsed);
        else setText(formatFrameTimecode(seconds, fps));
    };

    return {
        value: text,
        onFocus: () => setFocused(true),
        onBlur: () => {
            setFocused(false);
            commitText();
        },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            setText(e.target.value),
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            else if (
                onNudge &&
                (e.key === 'ArrowUp' || e.key === 'ArrowDown')
            ) {
                e.preventDefault();
                onNudge(e.key === 'ArrowUp' ? 1 : -1);
            }
        },
    };
}

export const VideoInspector: React.FC<VideoInspectorProps> = ({
    clip,
    value,
    onChange,
    fps = DEFAULT_FPS,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoError, setVideoError] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playing, setPlaying] = useState(false);

    const duration = fullDurationOf(clip);
    const src = clip?.id
        ? `/api/caspar/media/raw/${encodeURIComponent(clip.id)}`
        : undefined;
    const poster = useMemo(() => buildThumbnailUrl(clip) ?? undefined, [clip]);

    function seek(time: number) {
        if (videoRef.current) videoRef.current.currentTime = time;
        setCurrentTime(time);
    }

    function update(patch: Partial<VideoInspectorValue>) {
        onChange({ ...value, ...patch });
    }

    const trackRef = useRef<HTMLDivElement>(null);
    const stopDragRef = useRef<() => void>();

    useEffect(() => () => stopDragRef.current?.(), []);

    function timeFromClientX(clientX: number) {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect?.width) return currentTime;
        const ratio = (clientX - rect.left) / rect.width;
        return Math.max(0, Math.min(duration, ratio * duration));
    }

    function onTrackPointerDown(e: React.PointerEvent) {
        if ((e.target as HTMLElement).closest('.MuiSlider-thumb')) return;
        e.stopPropagation();
        e.preventDefault();
        seek(timeFromClientX(e.clientX));

        const onMove = (ev: PointerEvent) => seek(timeFromClientX(ev.clientX));
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            stopDragRef.current = undefined;
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        stopDragRef.current = onUp;
    }

    const clampIn = (v: number) => Math.max(0, Math.min(v, value.outPoint));
    const clampOut = (v: number) =>
        Math.min(duration, Math.max(v, value.inPoint));

    function nudgeIn(direction: 1 | -1) {
        const inPoint = clampIn(
            stepFrames(value.inPoint, direction, fps, value.outPoint),
        );
        seek(inPoint);
        update({ inPoint });
    }

    function nudgeOut(direction: 1 | -1) {
        const outPoint = clampOut(
            stepFrames(value.outPoint, direction, fps, duration),
        );
        seek(outPoint);
        update({ outPoint });
    }

    const inField = useTimecodeField(
        value.inPoint,
        fps,
        parsed => {
            const inPoint = clampIn(parsed);
            seek(inPoint);
            update({ inPoint });
        },
        nudgeIn,
    );
    const outField = useTimecodeField(
        value.outPoint,
        fps,
        parsed => {
            const outPoint = clampOut(parsed);
            seek(outPoint);
            update({ outPoint });
        },
        nudgeOut,
    );

    useEffect(() => {
        setVideoError(false);
        setCurrentTime(0);
        setPlaying(false);
    }, [clip?.id]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = value.volume;
    }, [value.volume]);

    function playheadTime() {
        return videoRef.current?.currentTime ?? currentTime;
    }

    function togglePlay() {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play().catch(() => {});
        else video.pause();
    }

    function stepFrame(direction: 1 | -1) {
        const video = videoRef.current;
        if (!video || !duration) return;
        video.pause();
        video.currentTime = stepFrames(
            video.currentTime,
            direction,
            fps,
            duration,
        );
    }

    function setInAtPlayhead() {
        update({ inPoint: clampIn(playheadTime()) });
    }

    function setOutAtPlayhead() {
        update({ outPoint: clampOut(playheadTime()) });
    }

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                ['INPUT', 'TEXTAREA'].includes(target.tagName) ||
                target.isContentEditable
            )
                return;

            if (e.key === ' ') {
                e.preventDefault();
                togglePlay();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                stepFrame(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                stepFrame(1);
            } else if (e.key === 'i' || e.key === 'I') {
                e.preventDefault();
                setInAtPlayhead();
            } else if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                setOutAtPlayhead();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [value, duration, fps]);

    if (!clip || !duration) return null;

    return (
        <Stack spacing={2}>
            <Box
                sx={{
                    borderRadius: 1,
                    overflow: 'hidden',
                    backgroundColor: '#000',
                }}
            >
                <video
                    ref={videoRef}
                    src={src}
                    poster={poster}
                    preload="metadata"
                    onError={() => setVideoError(true)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onTimeUpdate={e =>
                        setCurrentTime(e.currentTarget.currentTime)
                    }
                    onSeeked={e => setCurrentTime(e.currentTarget.currentTime)}
                    style={{
                        width: '100%',
                        maxHeight: 200,
                        display: videoError ? 'none' : 'block',
                    }}
                />
            </Box>

            <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={1}
            >
                <Tooltip title={t('playVideo.prevFrameHint')}>
                    <IconButton size="small" onClick={() => stepFrame(-1)}>
                        <NavigateBeforeIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={t('playVideo.playHint')}>
                    <IconButton size="small" onClick={togglePlay}>
                        {playing ? (
                            <PauseIcon fontSize="small" />
                        ) : (
                            <PlayArrowIcon fontSize="small" />
                        )}
                    </IconButton>
                </Tooltip>
                <Tooltip title={t('playVideo.nextFrameHint')}>
                    <IconButton size="small" onClick={() => stepFrame(1)}>
                        <NavigateNextIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 72, textAlign: 'center' }}
                >
                    {formatFrameTimecode(currentTime, fps)}
                </Typography>
                <Tooltip title={t('playVideo.setInHint')}>
                    <Button size="small" onClick={setInAtPlayhead}>
                        {t('playVideo.setIn')}
                    </Button>
                </Tooltip>
                <Tooltip title={t('playVideo.setOutHint')}>
                    <Button size="small" onClick={setOutAtPlayhead}>
                        {t('playVideo.setOut')}
                    </Button>
                </Tooltip>
            </Stack>

            <Row
                icon={<ContentCutIcon fontSize="inherit" />}
                label={t('playVideo.trimLabel')}
            >
                <Box
                    ref={trackRef}
                    onPointerDownCapture={onTrackPointerDown}
                    sx={{ position: 'relative' }}
                >
                    <Slider
                        size="small"
                        value={[value.inPoint, value.outPoint]}
                        min={0}
                        max={duration}
                        step={1 / fps}
                        disableSwap
                        onChange={(_, v, activeThumb) => {
                            const [inPoint, outPoint] = v as number[];
                            seek(activeThumb === 0 ? inPoint : outPoint);
                            update({ inPoint, outPoint });
                        }}
                        valueLabelDisplay="auto"
                        valueLabelFormat={v => formatFrameTimecode(v, fps)}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: `${Math.min(100, (currentTime / duration) * 100)}%`,
                            width: 2,
                            backgroundColor: 'warning.main',
                            pointerEvents: 'none',
                        }}
                    />
                </Box>
            </Row>

            <Stack direction="row" spacing={2} sx={{ pl: '92px' }}>
                <Stack direction="row" alignItems="center">
                    <IconButton size="small" onClick={() => nudgeIn(-1)}>
                        <KeyboardArrowLeftIcon fontSize="small" />
                    </IconButton>
                    <TextField
                        size="small"
                        label={t('playVideo.inPoint')}
                        sx={{ width: 110 }}
                        {...inField}
                    />
                    <IconButton size="small" onClick={() => nudgeIn(1)}>
                        <KeyboardArrowRightIcon fontSize="small" />
                    </IconButton>
                </Stack>
                <Stack direction="row" alignItems="center">
                    <IconButton size="small" onClick={() => nudgeOut(-1)}>
                        <KeyboardArrowLeftIcon fontSize="small" />
                    </IconButton>
                    <TextField
                        size="small"
                        label={t('playVideo.outPoint')}
                        sx={{ width: 110 }}
                        {...outField}
                    />
                    <IconButton size="small" onClick={() => nudgeOut(1)}>
                        <KeyboardArrowRightIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Stack>

            <Row
                icon={<VolumeUpIcon fontSize="inherit" />}
                label={t('playVideo.volumeLabel')}
            >
                <Slider
                    size="small"
                    value={value.volume * 100}
                    min={0}
                    max={100}
                    onChange={(_, v) => update({ volume: (v as number) / 100 })}
                    valueLabelDisplay="auto"
                    valueLabelFormat={v => `${Math.round(v)}%`}
                />
            </Row>

            <Row
                icon={<GraphicEqIcon fontSize="inherit" />}
                label={t('playVideo.fadeInLabel')}
            >
                <Slider
                    size="small"
                    value={value.fadeIn}
                    min={0}
                    max={MAX_FADE_SECONDS}
                    step={0.1}
                    onChange={(_, v) => update({ fadeIn: v as number })}
                    valueLabelDisplay="auto"
                    valueLabelFormat={v => `${v.toFixed(1)}s`}
                />
            </Row>

            <Row
                icon={<GraphicEqIcon fontSize="inherit" />}
                label={t('playVideo.fadeOutLabel')}
            >
                <Slider
                    size="small"
                    value={value.fadeOut}
                    min={0}
                    max={MAX_FADE_SECONDS}
                    step={0.1}
                    onChange={(_, v) => update({ fadeOut: v as number })}
                    valueLabelDisplay="auto"
                    valueLabelFormat={v => `${v.toFixed(1)}s`}
                />
            </Row>

            <Box>
                <Button
                    size="small"
                    startIcon={<RestartAltIcon />}
                    onClick={() =>
                        onChange({
                            inPoint: 0,
                            outPoint: duration,
                            volume: 1,
                            fadeIn: 0,
                            fadeOut: 0,
                        })
                    }
                >
                    {t('playVideo.resetTrim')}
                </Button>
            </Box>
        </Stack>
    );
};

export default VideoInspector;
