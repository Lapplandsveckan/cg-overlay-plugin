import React, { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';

import { useSocket, MediaCard } from '@web-lib';
import { useTranslation } from '../i18n';
import { buildThumbnailUrl } from '../thumbnail';
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
    const { currentClip, queued } = useVideoPlayback();

    const data = useMediaCardData(clip);
    const playNow = entry.data?.options?.playNow;
    const clipId: string | undefined = entry.data?.clip;

    const isLive = !!clipId && currentClip === clipId;
    const isQueued = !isLive && !!clipId && queued.has(clipId);

    useEffect(() => {
        if (!entry.data?.clip) return;
        socket.caspar
            .getMedia()
            .then(media => setClip(media.get(entry.data.clip) || null));
    }, [entry.data?.clip]);

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
        </Stack>
    );
};

export default PlayVideoRundownItem;
