import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    Slider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import ContentCutIcon from '@mui/icons-material/ContentCut';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useTranslation } from '../i18n';
import { buildThumbnailUrl } from '../thumbnail';
import {
    DEFAULT_FPS,
    formatFrameTimecode,
    fullDurationOf,
    parseFrameTimecode,
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

// Free-types while focused; reformats/commits on blur or Enter.
function useTimecodeField(
    seconds: number,
    fps: number,
    commit: (parsed: number) => void,
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

    const duration = fullDurationOf(clip);
    const src = clip?.id
        ? `/api/caspar/media/raw/${encodeURIComponent(clip.id)}`
        : undefined;
    const poster = useMemo(() => buildThumbnailUrl(clip) ?? undefined, [clip]);

    const inField = useTimecodeField(value.inPoint, fps, parsed => {
        const inPoint = Math.max(0, Math.min(parsed, value.outPoint));
        seek(inPoint);
        update({ inPoint });
    });
    const outField = useTimecodeField(value.outPoint, fps, parsed => {
        const outPoint = Math.min(duration, Math.max(parsed, value.inPoint));
        seek(outPoint);
        update({ outPoint });
    });

    useEffect(() => {
        setVideoError(false);
    }, [clip?.id]);

    if (!clip || !duration) return null;

    function seek(time: number) {
        if (videoRef.current) videoRef.current.currentTime = time;
    }

    function update(patch: Partial<VideoInspectorValue>) {
        onChange({ ...value, ...patch });
    }

    const maxFade = Math.min(
        MAX_FADE_SECONDS,
        Math.max(0.1, (value.outPoint - value.inPoint) / 2),
    );

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
                    muted
                    preload="metadata"
                    onError={() => setVideoError(true)}
                    style={{
                        width: '100%',
                        maxHeight: 200,
                        display: videoError ? 'none' : 'block',
                    }}
                />
            </Box>

            <Row
                icon={<ContentCutIcon fontSize="inherit" />}
                label={t('playVideo.trimLabel')}
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
            </Row>

            <Stack direction="row" spacing={2} sx={{ pl: '92px' }}>
                <TextField
                    size="small"
                    label={t('playVideo.inPoint')}
                    sx={{ width: 110 }}
                    {...inField}
                />
                <TextField
                    size="small"
                    label={t('playVideo.outPoint')}
                    sx={{ width: 110 }}
                    {...outField}
                />
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
                    max={maxFade}
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
                    max={maxFade}
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
