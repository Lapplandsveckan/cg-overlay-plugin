import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';

import ContentCutIcon from '@mui/icons-material/ContentCut';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useSocket, MediaCard } from '@web-lib';
import { useTranslation } from '../i18n';
import { buildThumbnailUrl } from '../thumbnail';
import { formatTime } from '../format';
import {
    fullDurationOf,
    hasFade,
    isTrimmed,
    playbackProgress,
    type VideoOptions,
} from '../video-utils';
import { LiveChip, useVideoPlayback } from '../overlay-state';

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
            duration: fullDurationOf(clip),
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
    const opts: VideoOptions = entry.data?.options ?? {};
    const playNow = opts.playNow;
    const clipId: string | undefined = entry.data?.clip;

    const fullDuration = fullDurationOf(clip);
    const trimmed = isTrimmed(opts, fullDuration);
    const faded = hasFade(opts);

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
        setPlayTime(current.elapsedSec * 1000);
        const interval = setInterval(
            () => setPlayTime(prev => prev + 100),
            100,
        );
        return () => clearInterval(interval);
    }, [isLive, current]);

    const progress = playbackProgress(
        playTime / 1000,
        current?.durationSec ?? 0,
        { loop: current?.loop, active: isLive },
    );
    const showProgress = progress.active && !current?.loop;

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
                {trimmed && (
                    <Chip
                        icon={<ContentCutIcon sx={{ fontSize: 14 }} />}
                        label={t('playVideo.trimmedChip', {
                            in: formatTime(opts.inPoint ?? 0),
                            out: formatTime(opts.outPoint ?? fullDuration),
                        })}
                        size="small"
                        variant="outlined"
                    />
                )}
                {faded && (
                    <Chip
                        icon={<GraphicEqIcon sx={{ fontSize: 14 }} />}
                        label={t('playVideo.fadeChip')}
                        size="small"
                        variant="outlined"
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
                                  elapsed: formatTime(progress.elapsed),
                                  duration: formatTime(
                                      current?.durationSec ?? 0,
                                  ),
                                  timeLeft: formatTime(progress.timeLeft),
                              })}
                    </Typography>
                    {showProgress && (
                        <LinearProgress
                            variant="determinate"
                            value={progress.percent}
                            sx={{ height: 4, borderRadius: 2 }}
                        />
                    )}
                </Stack>
            )}
        </Stack>
    );
};

export default PlayVideoRundownItem;
