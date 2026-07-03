import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';

import { useSocket, MediaCard } from '@web-lib';
import { useTranslation } from '../i18n';
import { buildThumbnailUrl } from '../thumbnail';
import { LiveChip, useVideoPlayback } from '../overlay-state';

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface PlayVideoRundownItemProps {
    entry: RundownEntry;
}

function useMediaCardData(clip: any) {
    return useMemo(() => {
        if (!clip) return null;
        return {
            name: clip.id,
            duration: clip.mediainfo?.format?.duration,
            backgroundUrl:
                buildThumbnailUrl(clip) ??
                'https://via.placeholder.com/1920x1080',
        };
    }, [clip]);
}

export const PlayVideoRundownItem: React.FC<PlayVideoRundownItemProps> = ({
    entry,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const socket = useSocket();
    const [clip, setClip] = useState<any | null>(null);
    const { currentClip, queued, current } = useVideoPlayback();
    const [playTime, setPlayTime] = useState(0);

    const data = useMediaCardData(clip);
    const playNow = entry.data?.options?.playNow;
    const clipId: string | undefined = entry.data?.clip;

    const isLive = !!clipId && currentClip === clipId;
    const isQueued = !isLive && !!clipId && queued.has(clipId);

    useEffect(() => {
        if (!entry.data?.clip) return;
        const clip = entry.data.clip as string;

        socket.caspar
            .getMedia()
            .then(media => setClip(media.get(clip) || null));

        const onMedia = (key: string, value: any) => {
            if (key === clip && value) setClip(value);
        };
        socket.caspar.on('media', onMedia);
        return () => {
            socket.caspar.off('media', onMedia);
        };
    }, [entry.data?.clip]);

    useEffect(() => {
        if (!isLive || !current) return;
        setPlayTime(current.playDuration);
        const interval = setInterval(
            () => setPlayTime(prev => prev + 100),
            100,
        );
        return () => clearInterval(interval);
    }, [isLive, current]);

    const clipDuration = (current?.clipDuration ?? 0) / 1000;
    const elapsed = playTime / 1000;
    const showProgress = isLive && !current?.loop && clipDuration > 0;
    const progressPct = showProgress
        ? Math.min(100, (elapsed / clipDuration) * 100)
        : 0;
    const timeLeft = showProgress ? Math.max(0, clipDuration - elapsed) : 0;

    return (
        <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">{t('playVideo.label')}</Typography>
                {playNow && (
                    <Chip
                        label={t('playVideo.playNowChip')}
                        size="small"
                        color="warning"
                    />
                )}
                {isLive && <LiveChip variant="live" />}
                {isQueued && <LiveChip variant="queued" />}
            </Stack>
            {data ? (
                <MediaCard {...data} columns={1} />
            ) : (
                <Box
                    sx={{
                        padding: 1,
                        borderRadius: 1,
                        border: '1px dashed rgba(255,255,255,0.15)',
                    }}
                >
                    <Typography variant="caption" color="warning.main">
                        {t('playVideo.noClip')}
                    </Typography>
                </Box>
            )}
            {isLive && (
                <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                        {current?.loop
                            ? t('video.remainingLooping')
                            : t('video.timeProgress', {
                                  elapsed: formatTime(elapsed),
                                  duration: formatTime(clipDuration),
                                  timeLeft: formatTime(timeLeft),
                              })}
                    </Typography>
                    {showProgress && (
                        <LinearProgress
                            variant="determinate"
                            value={progressPct}
                            sx={{ height: 4, borderRadius: 2 }}
                        />
                    )}
                </Stack>
            )}
        </Stack>
    );
};

export default PlayVideoRundownItem;
