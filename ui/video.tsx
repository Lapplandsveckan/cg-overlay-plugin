import {
    Box,
    Button,
    Chip,
    IconButton,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import FlagIcon from '@mui/icons-material/Flag';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { useBroadcast, useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import { buildThumbnailUrl } from './thumbnail';
import { formatTime } from './format';
import { videosTopic } from './broadcast-topics';
import {
    fullDurationOf,
    isTrimmed,
    normalizeVideoPayload,
    playbackProgress,
    type NormalizedCurrent,
    type NormalizedItem,
} from './video-utils';
import { useActiveRundown } from './hooks';

function useRundownIdFromUrl(): string | null {
    return useMemo(() => {
        if (typeof window === 'undefined') return null;
        const { search, pathname } = window.location;
        const fromQuery = new URLSearchParams(search).get('id');
        if (fromQuery) return fromQuery;
        return pathname.split('/').filter(Boolean).pop() || null;
    }, []);
}

function SetCurrentRundownButton() {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const { rundowns, activeId, setActive } = useActiveRundown(conn);
    const urlId = useRundownIdFromUrl();

    // Only render if the URL id matches a known rundown
    if (!urlId || !rundowns.some(r => r.id === urlId)) return null;

    if (urlId === activeId) {
        return (
            <Button
                size="small"
                variant="outlined"
                disabled
                startIcon={<CheckCircleIcon />}
                sx={{ borderRadius: 4, fontSize: '0.75rem', py: 0.25, px: 1 }}
            >
                {t('video.currentRundown')}
            </Button>
        );
    }

    return (
        <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<FlagIcon />}
            onClick={() => setActive(urlId)}
            sx={{
                borderRadius: 4,
                fontSize: '0.75rem',
                py: 0.25,
                px: 1,
                opacity: 0.6,
                '&:hover': { opacity: 1 },
            }}
        >
            {t('video.setCurrentRundown')}
        </Button>
    );
}

function useThumbnailUrl(clip: any): string | null {
    return useMemo(() => buildThumbnailUrl(clip), [clip]);
}

interface VideoItemProps extends NormalizedItem {
    elapsed?: number;
    isCurrent?: boolean;
    loop?: boolean;
    onRemove: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({
    title,
    clip,
    options,
    durationSec,
    onRemove,
    elapsed,
    isCurrent,
    loop,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const thumbnailUrl = useThumbnailUrl(clip);
    const fullDuration = fullDurationOf(clip);
    const trimmed = isTrimmed(options, fullDuration);
    const progress = playbackProgress(elapsed ?? 0, durationSec, {
        loop,
        active: isCurrent,
    });
    const showProgress = progress.active && !loop;
    const hasChips = isCurrent || loop || trimmed;

    return (
        <Stack
            direction="row"
            spacing={2}
            sx={{
                padding: 1.5,
                borderRadius: 2,
                backgroundColor: isCurrent ? '#2f3a4a' : '#272930',
                border: isCurrent
                    ? '1px solid #4a90e2'
                    : '1px solid transparent',
                alignItems: 'stretch',
            }}
        >
            <Box
                sx={{
                    width: 120,
                    minWidth: 120,
                    height: 68,
                    borderRadius: 1,
                    backgroundColor: '#1a1c22',
                    backgroundImage: thumbnailUrl
                        ? `url(${thumbnailUrl})`
                        : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                }}
            />
            <Stack
                direction="column"
                spacing={0.5}
                sx={{ flexGrow: 1, minWidth: 0 }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Typography
                        variant="subtitle1"
                        noWrap
                        title={title}
                        sx={{ minWidth: 0, flexGrow: 1 }}
                    >
                        {title}
                    </Typography>
                    <Tooltip title={t('video.removeFromQueue')}>
                        <IconButton
                            size="small"
                            onClick={e => {
                                e.stopPropagation();
                                onRemove();
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
                {hasChips && (
                    <Stack
                        direction="row"
                        spacing={1}
                        useFlexGap
                        flexWrap="wrap"
                    >
                        {isCurrent && (
                            <Chip
                                label={t('video.nowPlaying')}
                                size="small"
                                color="primary"
                            />
                        )}
                        {loop && (
                            <Chip
                                label={t('video.looping')}
                                size="small"
                                variant="outlined"
                            />
                        )}
                        {trimmed && (
                            <Chip
                                icon={<ContentCutIcon sx={{ fontSize: 14 }} />}
                                label={t('playVideo.trimmedChip', {
                                    in: formatTime(options?.inPoint ?? 0),
                                    out: formatTime(
                                        options?.outPoint ?? fullDuration,
                                    ),
                                })}
                                size="small"
                                variant="outlined"
                            />
                        )}
                    </Stack>
                )}
                <Typography variant="caption" color="text.secondary">
                    {showProgress
                        ? t('video.timeProgress', {
                              elapsed: formatTime(progress.elapsed),
                              duration: formatTime(durationSec),
                              timeLeft: formatTime(progress.timeLeft),
                          })
                        : formatTime(durationSec)}
                </Typography>
                {showProgress && (
                    <LinearProgress
                        variant="determinate"
                        value={progress.percent}
                        sx={{ marginTop: 0.5, height: 4, borderRadius: 2 }}
                    />
                )}
            </Stack>
        </Stack>
    );
};

interface VideoQueueProps {
    showSetCurrentRundown?: boolean;
}

const VideoQueue: React.FC<VideoQueueProps> = ({
    showSetCurrentRundown = true,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [queue, setQueue] = useState<NormalizedItem[]>([]);
    const [current, setCurrent] = useState<NormalizedCurrent | null>(null);
    const [playTime, setPlayTime] = useState<number>(0);
    const receivedBroadcast = useRef(false);

    const queueDurationSec = queue.reduce(
        (acc, item) => acc + item.durationSec,
        0,
    );
    const elapsed = playTime / 1000;
    const currentTimeLeft =
        current && !current.loop
            ? Math.max(0, current.durationSec - elapsed)
            : 0;
    const totalRemaining = queueDurationSec + currentTimeLeft;

    const setData = useCallback((data: any) => {
        const normalized = normalizeVideoPayload(data);
        setQueue(normalized.queue);
        setCurrent(normalized.current);
        setPlayTime((normalized.current?.elapsedSec ?? 0) * 1000);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlayTime(playTime => playTime + 100);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!conn) return;
        conn.rawRequest(`/api/plugin/lappis/videos`, 'GET', {})
            .then((res: any) => {
                // Only apply the GET result if no broadcast has arrived yet.
                if (!receivedBroadcast.current) setData(res.data);
            })
            .catch(console.error);
    }, [conn, setData]);

    useBroadcast(videosTopic, data => {
        receivedBroadcast.current = true;
        setData(data);
    });

    const isEmpty = !current && queue.length === 0;
    const clearQueue = () =>
        conn
            .rawRequest(`/api/plugin/lappis/videos`, 'DELETE', null)
            .catch(console.error);

    return (
        <Stack
            direction="column"
            spacing={2}
            sx={{ maxWidth: 720, margin: '0 auto', padding: 2 }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="h5" fontWeight={600}>
                        {t('video.queue')}
                    </Typography>
                    {showSetCurrentRundown && <SetCurrentRundownButton />}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    {current?.loop ? (
                        <Typography variant="body2" color="text.secondary">
                            {t('video.remainingLooping')}
                        </Typography>
                    ) : (
                        totalRemaining > 0 && (
                            <Typography variant="body2" color="text.secondary">
                                {t('video.remaining', {
                                    time: formatTime(totalRemaining),
                                })}
                            </Typography>
                        )
                    )}
                    {(queue.length > 0 || current) && (
                        <Tooltip title={t('video.clearQueue')}>
                            <IconButton size="small" onClick={clearQueue}>
                                <PlaylistRemoveIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            </Stack>

            {isEmpty && (
                <Box
                    sx={{
                        padding: 4,
                        textAlign: 'center',
                        color: 'text.secondary',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="body2">{t('video.empty')}</Typography>
                </Box>
            )}

            {current && (
                <VideoItem
                    {...current}
                    isCurrent
                    loop={current.loop}
                    elapsed={elapsed}
                    onRemove={() =>
                        conn.rawRequest(
                            `/api/plugin/lappis/videos/${current.id}`,
                            'DELETE',
                            null,
                        )
                    }
                />
            )}

            {queue.length > 0 && (
                <>
                    <Typography variant="overline" color="text.secondary">
                        {t('video.upNext', { count: queue.length })}
                    </Typography>
                    <Stack direction="column" spacing={1.5}>
                        {queue.map(item => (
                            <VideoItem
                                key={item.id}
                                {...item}
                                onRemove={() =>
                                    conn.rawRequest(
                                        `/api/plugin/lappis/videos/${item.id}`,
                                        'DELETE',
                                        null,
                                    )
                                }
                            />
                        ))}
                    </Stack>
                </>
            )}
        </Stack>
    );
};

export default VideoQueue;
