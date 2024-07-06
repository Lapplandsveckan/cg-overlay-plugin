import React, {useEffect, useMemo, useState} from 'react';
import {Stack, Typography} from '@mui/material';

// @ts-ignore
import {useSocket, MediaCard} from '@web-lib';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface PlayVideoRundownItemProps {
    entry: RundownEntry;
}

export const PlayVideoRundownItem: React.FC<PlayVideoRundownItemProps> = ({entry}) => {
    const socket = useSocket();
    const [clip, setClip] = useState<any | null>();
    const [wallClip, setWallClip] = useState<any | null>();

    const data = useMemo(() => {
        if (!clip) return null;

        const background = clip._attachments['thumb.png'];
        const data = btoa(String.fromCharCode(...background.data.data));
        const url = background ? `data:${background.content_type};base64,${data}` : 'https://via.placeholder.com/1920x1080';

        return {
            name: clip.id,
            duration: clip.mediainfo.format.duration,
            backgroundUrl: url,
        };
    }, [clip]);

    const wallData = useMemo(() => {
        if (!wallClip) return null;

        const background = wallClip._attachments['thumb.png'];
        const data = btoa(String.fromCharCode(...background.data.data));
        const url = background ? `data:${background.content_type};base64,${data}` : 'https://via.placeholder.com/1920x1080';

        return {
            name: wallClip.id,
            duration: wallClip.mediainfo.format.duration,
            backgroundUrl: url,
        };
    }, [clip]);

    useEffect(() => {
        if (!entry.data) return;
        socket.caspar.getMedia().then(media => setClip(media.get(entry.data.clip) || null));
    }, [entry.data.clip]);

    useEffect(() => {
        if (!entry.data.options) return;
        socket.caspar.getMedia().then(media => setWallClip(media.get(entry.data.options?.secondaryVideo) || null));
    }, [entry.data.options?.secondaryVideo]);

    return (
        <Stack
            spacing={2}
            direction="column"
        >
            <Typography variant="body1">
                Play Video
            </Typography>
            {
                data ? (
                    <MediaCard
                        {...data}
                        columns={1}
                    />
                ) : (
                    <Typography variant="body1">
                        No Media Selected
                    </Typography>
                )
            }
            {
                wallData &&
                (
                    <MediaCard
                        {...wallData}
                        columns={1}
                    />
                )
            }
        </Stack>
    );
}

export default PlayVideoRundownItem;
