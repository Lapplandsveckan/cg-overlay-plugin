import {Box, Chip, IconButton, LinearProgress, Stack, Tooltip, Typography} from '@mui/material';
import React, {useEffect, useMemo, useState} from 'react';

// @ts-ignore
import {useSocket} from '@web-lib';
import {useTranslation} from './i18n';

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function useThumbnail(clip: any): { url: string | null; name: string; duration: number } {
    return useMemo(() => {
        if (!clip) return {url: null, name: '', duration: 0};
        const background = clip._attachments?.['thumb.png'];
        let url: string | null = null;
        if (background) {
            const data = btoa(String.fromCharCode(...background.data.data));
            url = `data:${background.content_type};base64,${data}`;
        }
        return {
            url,
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
    onRemove: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({title, clip, onRemove, elapsed, isCurrent}) => {
    const {t} = useTranslation('cg-overlay-plugin');
    const media = useThumbnail(clip);
    const showProgress = isCurrent && media.duration > 0 && typeof elapsed === 'number';
    const progressPct = showProgress ? Math.min(100, (elapsed! / media.duration) * 100) : 0;
    const timeLeft = showProgress ? Math.max(0, media.duration - elapsed!) : media.duration;

    return (
        <Stack
            direction="row"
            spacing={2}
            sx={{
                padding: 1.5,
                borderRadius: 2,
                backgroundColor: isCurrent ? '#2f3a4a' : '#272930',
                border: isCurrent ? '1px solid #4a90e2' : '1px solid transparent',
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
                    backgroundImage: media.url ? `url(${media.url})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    flexShrink: 0,
                }}
            />
            <Stack direction="column" spacing={0.5} sx={{flexGrow: 1, minWidth: 0}}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1} alignItems="center" sx={{minWidth: 0}}>
                        {isCurrent && <Chip label={t('video.nowPlaying')} size="small" color="primary" />}
                        <Typography variant="subtitle1" noWrap title={title} sx={{minWidth: 0}}>
                            {title}
                        </Typography>
                    </Stack>
                    <Tooltip title={t('video.removeFromQueue')}>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                            <Box component="span" sx={{fontSize: 18, lineHeight: 1}}>×</Box>
                        </IconButton>
                    </Tooltip>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                    {showProgress
                        ? t('video.timeProgress', {elapsed: formatTime(elapsed!), duration: formatTime(media.duration), timeLeft: formatTime(timeLeft)})
                        : formatTime(media.duration)}
                </Typography>
                {showProgress && (
                    <LinearProgress
                        variant="determinate"
                        value={progressPct}
                        sx={{marginTop: 0.5, height: 4, borderRadius: 2}}
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

const VideoQueue = () => {
    const {t} = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [queue, setQueue] = useState<any[]>([]);
    const [current, setCurrent] = useState<any>(null);
    const [playTime, setPlayTime] = useState<number>(0);

    const queueDuration = queue.reduce(
        (acc, item) => acc + (Number(item?.clip?.mediainfo?.format?.duration) || 0),
        0,
    );
    const currentDuration = Number(current?.clip?.mediainfo?.format?.duration) || 0;
    const elapsed = playTime / 1000;
    const currentTimeLeft = Math.max(0, currentDuration - elapsed);
    const totalRemaining = queueDuration + currentTimeLeft;

    useEffect(() => {
        const interval = setInterval(() => {
            setPlayTime(playTime => playTime + 100);
        }, 100);

        const setData = (data: VideoResponse) => {
            setQueue(data.queue.map(item => ({
                id: item.id,
                title: item.data.id,

                clip: item.data,
            })));

            if (!data.current) return setCurrent(null);

            setCurrent({
                id: data.current.id,
                title: data.current.data.id,

                clip: data.current.data,
            });

            setPlayTime(data.current.metadata?.playDuration || 0);
        };

        const listener = {
            path: 'plugin/lappis/videos',
            method: 'UPDATE',

            handler: req => setData(req.data),
        };

        conn.rawRequest(`/api/plugin/lappis/videos`, 'GET', {}).then(data => setData(data.data));
        conn.routes.register(listener);

        return () => {
            conn.routes.unregister(listener);
            clearInterval(interval);
        };
    }, []);

    const isEmpty = !current && queue.length === 0;

    return (
        <Stack direction="column" spacing={2} sx={{maxWidth: 720, margin: '0 auto', padding: 2}}>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between">
                <Typography variant="h5" fontWeight={600}>{t('video.queue')}</Typography>
                {totalRemaining > 0 && (
                    <Typography variant="body2" color="text.secondary">
                        {t('video.remaining', {time: formatTime(totalRemaining)})}
                    </Typography>
                )}
            </Stack>

            {isEmpty && (
                <Box sx={{padding: 4, textAlign: 'center', color: 'text.secondary', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 2}}>
                    <Typography variant="body2">{t('video.empty')}</Typography>
                </Box>
            )}

            {current && (
                <VideoItem
                    title={current.title}
                    clip={current.clip}
                    isCurrent
                    elapsed={elapsed}
                    onRemove={() => conn.rawRequest(`/api/plugin/lappis/videos/${current.id}`, 'DELETE', null)}
                />
            )}

            {queue.length > 0 && (
                <>
                    <Typography variant="overline" color="text.secondary">
                        {t('video.upNext', {count: queue.length})}
                    </Typography>
                    <Stack direction="column" spacing={1.5}>
                        {queue.map(item => (
                            <VideoItem
                                key={item.id}
                                title={item.title}
                                clip={item.clip}
                                onRemove={() => conn.rawRequest(`/api/plugin/lappis/videos/${item.id}`, 'DELETE', null)}
                            />
                        ))}
                    </Stack>
                </>
            )}
        </Stack>
    );
};

export default VideoQueue;
