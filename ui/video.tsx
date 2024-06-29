import {Button, Card, Stack, Typography} from '@mui/material';
import React, {useEffect, useMemo, useState} from 'react';

// @ts-ignore
import {MediaCard, useSocket} from '@web-lib';

interface VideoItemProps {
    title: string;
    clip: any;

    playTime?: number;
    onRemove: () => void;
}

const VideoItem: React.FC<VideoItemProps> = ({title, clip, onRemove, playTime}) => {
    const media = useMemo(() => {
        if (!clip) return null;

        const background = clip._attachments['thumb.png'];
        const data = btoa(String.fromCharCode(...background.data.data));
        const url = background ? `data:${background.content_type};base64,${data}` : 'https://via.placeholder.com/1920x1080';

        return {
            name: clip.id as string,
            duration: clip.mediainfo.format.duration as number,
            backgroundUrl: url as string,
        };
    }, [clip]);

    return (
        <Stack
            padding={2}
            direction="column"
            sx={{
                backgroundColor: '#272930',
                borderRadius: 4,
                width: '500px',
            }}
        >
            <Stack
                direction="row"
                justifyContent={'space-between'}
            >
                <Typography variant="h6">
                    {title}
                </Typography>
                <Button
                    onClick={e => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    Remove
                </Button>
            </Stack>
            <Stack
                spacing={2}
                direction="column"
            >
                {
                    Math.round(media.duration)
                }
                {
                    typeof playTime === 'number' && (-Math.round(media.duration - playTime / 1000))
                }
                <MediaCard
                    {...media}
                    columns={1}
                />
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
    const conn = useSocket();
    const [queue, setQueue] = useState<any[]>([]);
    const [current, setCurrent] = useState<any>(null);
    const [playTime, setPlayTime] = useState<number>(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setPlayTime(playTime => playTime + 100);
        }, 100);

        const setData = (data: VideoResponse) => {
            console.log(data);

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
            conn.routes.unregister(listener)
            clearInterval(interval);
        };
    }, []);

    return (
        <>
            <Stack
                direction="column"
                spacing={2}
            >
                <h1>Video Queue</h1>

                <Stack
                    direction="column"
                    spacing={2}
                >
                    {
                        current && (
                            <VideoItem
                                title={current.title}
                                clip={current.clip}
                                onRemove={() => conn.rawRequest(`/api/plugin/lappis/videos/${current.id}`, 'DELETE', null)}
                                playTime={playTime}
                            />
                        )
                    }

                    {
                        queue.map(item => (
                            <VideoItem
                                key={item.id}
                                title={item.title}
                                clip={item.clip}
                                onRemove={() => conn.rawRequest(`/api/plugin/lappis/videos/${item.id}`, 'DELETE', null)}
                            />
                        ))
                    }
                </Stack>
            </Stack>
        </>
    );
};

export default VideoQueue;