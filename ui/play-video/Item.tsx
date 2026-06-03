import React, {useEffect, useMemo, useState} from 'react';
import {Box, Chip, Stack, Typography} from '@mui/material';

// @ts-ignore
import {useSocket, MediaCard} from '@web-lib';
import {useTranslation} from '../i18n';

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
        const background = clip._attachments?.['thumb.png'];
        let url = 'https://via.placeholder.com/1920x1080';
        if (background) {
            const data = btoa(String.fromCharCode(...background.data.data));
            url = `data:${background.content_type};base64,${data}`;
        }
        return {
            name: clip.id,
            duration: clip.mediainfo?.format?.duration,
            backgroundUrl: url,
        };
    }, [clip]);
}

export const PlayVideoRundownItem: React.FC<PlayVideoRundownItemProps> = ({entry}) => {
    const {t} = useTranslation('cg-overlay-plugin');
    const socket = useSocket();
    const [clip, setClip] = useState<any | null>(null);
    const [wallClip, setWallClip] = useState<any | null>(null);

    const data = useMediaCardData(clip);
    const wallData = useMediaCardData(wallClip);
    const playNow = entry.data?.options?.playNow;

    useEffect(() => {
        if (!entry.data?.clip) return;
        socket.caspar.getMedia().then(media => setClip(media.get(entry.data.clip) || null));
    }, [entry.data?.clip]);

    useEffect(() => {
        if (!entry.data?.options?.secondaryVideo) return;
        socket.caspar.getMedia().then(media => setWallClip(media.get(entry.data.options.secondaryVideo) || null));
    }, [entry.data?.options?.secondaryVideo]);

    return (
        <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">{t('playVideo.label')}</Typography>
                {playNow && <Chip label={t('playVideo.playNowChip')} size="small" color="warning" />}
                {wallData && <Chip label={t('playVideo.wallChip')} size="small" variant="outlined" />}
            </Stack>
            {data ? (
                <MediaCard {...data} columns={1} />
            ) : (
                <Box sx={{padding: 1, borderRadius: 1, border: '1px dashed rgba(255,255,255,0.15)'}}>
                    <Typography variant="caption" color="warning.main">{t('playVideo.noClip')}</Typography>
                </Box>
            )}
            {wallData && <MediaCard {...wallData} columns={1} />}
        </Stack>
    );
};

export default PlayVideoRundownItem;
