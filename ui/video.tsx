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
import FlagIcon from '@mui/icons-material/Flag';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import { useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import { buildThumbnailUrl } from './thumbnail';
import { useActiveRundown, useBroadcast } from './hooks';

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

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function useThumbnail(clip: any): {
    url: string | null;
    name: string;
    duration: number;
} {
    return useMemo(() => {
        if (!clip) return { url: null, name: '', duration: 0 };
        return {
            url: buildThumbnailUrl(clip),
            name: clip.id as string,
            duration: Number(clip.mediainfo?.format?.duration) || 0,
        };
    }, [clip]);
}

interface VideoItemProps {
    title: string;
    clip: any;

    elapsed?: number;
    isCurrent?: boolean;
    loop?: boolean;
    onRemove: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({
    title,
    clip,
    onRemove,
    elapsed,
    isCurrent,
    loop,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const media = useThumbnail(clip);
    const displayElapsed =
        loop && media.duration > 0 && typeof elapsed === 'number'
            ? elapsed % media.duration
            : elapsed;
    const showProgress =
        isCurrent && media.duration > 0 && typeof displayElapsed === 'number';
    const progressPct = showProgress
        ? Math.min(100, (displayElapsed! / media.duration) * 100)
        : 0;
    const timeLeft = showProgress
        ? Math.max(0, media.duration - displayElapsed!)
        : media.duration;

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
                    backgroundImage: media.url
                        ? `url(${media.url})`
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
                    <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ minWidth: 0 }}
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
                        <Typography
                            variant="subtitle1"
                            noWrap
                            title={title}
                            sx={{ minWidth: 0 }}
                        >
                            {title}
                        </Typography>
                    </Stack>
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
                <Typography variant="caption" color="text.secondary">
                    {showProgress
                        ? t('video.timeProgress', {
                              elapsed: formatTime(displayElapsed!),
                              duration: formatTime(media.duration),
                              timeLeft: formatTime(timeLeft),
                          })
                        : formatTime(media.duration)}
                </Typography>
                {showProgress && (
                    <LinearProgress
                        variant="determinate"
                        value={progressPct}
                        sx={{ marginTop: 0.5, height: 4, borderRadius: 2 }}
                    />
                )}
            </Stack>
        </Stack>
    );
};

interface VideoItemData {
    id: string;
    data: any;
}

interface VideoResponse {
    current: VideoItemData & { metadata?: any };
    queue: VideoItemData[];
}

interface VideoQueueProps {
    showSetCurrentRundown?: boolean;
}

const VideoQueue: React.FC<VideoQueueProps> = ({
    showSetCurrentRundown = true,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [queue, setQueue] = useState<any[]>([]);
    const [current, setCurrent] = useState<any>(null);
    const [playTime, setPlayTime] = useState<number>(0);
    const receivedBroadcast = useRef(false);

    const queueDuration = queue.reduce(
        (acc, item) =>
            acc + (Number(item?.clip?.mediainfo?.format?.duration) || 0),
        0,
    );
    const currentDuration =
        Number(current?.clip?.mediainfo?.format?.duration) || 0;
    const elapsed = playTime / 1000;
    const currentTimeLeft = current?.loop
        ? 0
        : Math.max(0, currentDuration - elapsed);
    const totalRemaining = queueDuration + currentTimeLeft;

    const setData = useCallback((data: VideoResponse) => {
        setQueue(
            data.queue.map(item => ({
                id: item.id,
                title: item.data.id,

                clip: item.data,
            })),
        );

        if (!data.current) return setCurrent(null);

        setCurrent({
            id: data.current.id,
            title: data.current.data.id,

            clip: data.current.data,
            loop: data.current.metadata?.loop ?? false,
        });

        setPlayTime(data.current.metadata?.playDuration || 0);
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
            .then(res => {
                // Only apply the GET result if no broadcast has arrived yet.
                if (!receivedBroadcast.current) setData(res.data);
            })
            .catch(console.error);
    }, [conn, setData]);

    const onUpdate = useCallback(
        (req: { data?: any }) => {
            receivedBroadcast.current = true;
            setData(req.data);
        },
        [setData],
    );
    useBroadcast(conn, 'plugin/lappis/videos', 'UPDATE', onUpdate);

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
                    {queue.length > 0 && (
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
                    title={current.title}
                    clip={current.clip}
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
                                title={item.title}
                                clip={item.clip}
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
