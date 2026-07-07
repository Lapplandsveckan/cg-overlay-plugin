import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Slider, Stack, Typography } from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { formatTime } from '../format';

const TrimmedVideo: React.FC<{
    videoUrl: string;
    imageUrl?: string | null;
    inPoint: number;
    outPoint?: number;
    volume: number;
}> = ({ videoUrl, imageUrl, inPoint, outPoint, volume }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(inPoint);
    const [duration, setDuration] = useState(0);

    const effectiveOut = outPoint && outPoint > 0 ? outPoint : duration;

    useEffect(() => {
        setPlaying(false);
        setCurrentTime(inPoint);
        setDuration(0);
    }, [videoUrl]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = volume;
    }, [volume]);

    // Trim adjusted elsewhere (e.g. the trim inspector) while this clip is
    // already loaded — re-clamp the playhead so it doesn't sit outside the
    // new range until the next manual seek/play.
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !effectiveOut) return;
        if (video.currentTime < inPoint || video.currentTime > effectiveOut)
            seek(Math.min(Math.max(video.currentTime, inPoint), effectiveOut));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inPoint, effectiveOut]);

    function seek(time: number) {
        const clamped = Math.min(
            Math.max(time, inPoint),
            effectiveOut || inPoint,
        );
        if (videoRef.current) videoRef.current.currentTime = clamped;
        setCurrentTime(clamped);
    }

    function togglePlay() {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            if (
                video.currentTime < inPoint ||
                video.currentTime >= effectiveOut - 0.05
            )
                seek(inPoint);
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }

    const wasPlayingRef = useRef(false);
    function beginSeek() {
        wasPlayingRef.current = playing;
        videoRef.current?.pause();
    }
    function endSeek() {
        if (wasPlayingRef.current) videoRef.current?.play().catch(() => {});
    }

    return (
        <>
            <Box
                component="video"
                ref={videoRef}
                src={videoUrl}
                poster={imageUrl ?? undefined}
                onLoadedMetadata={e => {
                    const video = e.currentTarget;
                    setDuration(video.duration);
                    video.currentTime = inPoint;
                    setCurrentTime(inPoint);
                }}
                onTimeUpdate={e => {
                    const time = e.currentTarget.currentTime;
                    setCurrentTime(time);
                    if (effectiveOut && time >= effectiveOut - 0.05)
                        e.currentTarget.pause();
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                }}
            />
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    px: 1,
                    py: 0.5,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                }}
            >
                <IconButton
                    size="small"
                    onClick={togglePlay}
                    sx={{ color: '#fff' }}
                >
                    {playing ? (
                        <PauseIcon fontSize="small" />
                    ) : (
                        <PlayArrowIcon fontSize="small" />
                    )}
                </IconButton>
                <Typography
                    variant="caption"
                    sx={{ color: '#fff', minWidth: 36 }}
                >
                    {formatTime(currentTime - inPoint)}
                </Typography>
                <Slider
                    size="small"
                    value={Math.min(
                        Math.max(currentTime, inPoint),
                        effectiveOut || inPoint,
                    )}
                    min={inPoint}
                    max={effectiveOut || inPoint}
                    step={0.1}
                    onPointerDown={beginSeek}
                    onChange={(_, v) => seek(v as number)}
                    onChangeCommitted={endSeek}
                    sx={{ color: '#fff' }}
                />
                <Typography
                    variant="caption"
                    sx={{ color: '#fff', minWidth: 36 }}
                >
                    {formatTime((effectiveOut || inPoint) - inPoint)}
                </Typography>
            </Stack>
        </>
    );
};

export default TrimmedVideo;
