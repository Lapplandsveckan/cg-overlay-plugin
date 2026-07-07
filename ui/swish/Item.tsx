import React from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '../i18n';
import { LiveChip, useOverlayState } from '../overlay-state';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface SwishRundownItemProps {
    entry: RundownEntry;
}

export const SwishRundownItem: React.FC<SwishRundownItemProps> = ({
    entry,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const state = useOverlayState();

    const rowNum = (entry.data?.number ?? '').trim();
    const liveNum = (state?.swish.number ?? '').trim();
    const isLive = !!state?.swish.on && (rowNum === '' || rowNum === liveNum);

    return (
        <Stack spacing={0.5} direction="column">
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">
                    Swish {entry.data.number}
                </Typography>
                {isLive && <LiveChip variant="live" />}
            </Stack>
            {entry.data.labels && (
                <Typography variant="body2">{entry.data.labels}</Typography>
            )}
            {entry.data.highlightIntro && (
                <Typography variant="body2">
                    {t('swish.highlightIntro')}
                </Typography>
            )}
            {entry.data.fromBelow && (
                <Typography variant="body2">{t('swish.fromBelow')}</Typography>
            )}
        </Stack>
    );
};

export default SwishRundownItem;
