import React from 'react';
import {Chip, Stack, Typography} from '@mui/material';

import {usePresentation, usePlaybackState} from './api';

interface RundownEntry {
    id: string;
    title: string;
    data: any;
    type?: string;
}

interface BibelordRundownItemProps {
    entry: RundownEntry;
}

export const BibelordRundownItem: React.FC<BibelordRundownItemProps> = ({entry}) => {
    const presentationId: string | null = entry.data?.presentationId ?? null;
    const presentation = usePresentation(presentationId);
    const playback = usePlaybackState();

    const playingHere = !!(
        playback?.playing
        && presentationId
        && playback.presentationId === presentationId
    );

    if (!presentationId) {
        return (
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">Bibel ord</Typography>
                <Chip label="No presentation" size="small" color="warning" variant="outlined" />
            </Stack>
        );
    }

    if (presentation === undefined) {
        return (
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">Bibel ord</Typography>
                <Typography variant="caption" color="text.secondary">Loading…</Typography>
            </Stack>
        );
    }

    if (presentation === null) {
        return (
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">Bibel ord</Typography>
                <Chip label="Presentation missing" size="small" color="error" variant="outlined" />
            </Stack>
        );
    }

    const slideCount = presentation.slides.length;

    return (
        <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">{presentation.title}</Typography>
                <Chip
                    label={`${slideCount} slide${slideCount === 1 ? '' : 's'}`}
                    size="small"
                    variant="outlined"
                />
                {playingHere && <Chip label="Live" size="small" color="error" />}
            </Stack>
            {slideCount > 0 && (
                <Typography variant="caption" color="text.secondary">
                    {presentation.slides[0].reference}
                    {slideCount > 1 && <> — {presentation.slides[slideCount - 1].reference}</>}
                </Typography>
            )}
        </Stack>
    );
};

export default BibelordRundownItem;
