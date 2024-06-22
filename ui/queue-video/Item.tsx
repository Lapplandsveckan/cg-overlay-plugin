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

interface QueueVideoRundownItemProps {
    entry: RundownEntry;
}

export const QueueVideoRundownItem: React.FC<QueueVideoRundownItemProps> = ({entry}) => {
    const socket = useSocket();
    const [clip, setClip] = useState<any | null>();
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

    useEffect(() => {
        if (!entry.data) return;
        socket.caspar.getMedia().then(media => setClip(media.get(entry.data.clip) || null));
    }, [entry.data.clip]);

    return (
        <Stack
            spacing={2}
            direction="row"
        >
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
        </Stack>
    );
}

export default QueueVideoRundownItem;