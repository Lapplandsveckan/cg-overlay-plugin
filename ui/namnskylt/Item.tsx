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

interface NamnskyltRundownItemProps {
    entry: RundownEntry;
}

export const NamnskyltRundownItem: React.FC<NamnskyltRundownItemProps> = ({
    entry,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const state = useOverlayState();
    const isLive =
        !!state?.namnskylt.on &&
        state.namnskylt.name === (entry.data?.name ?? null);

    return (
        <Stack spacing={1} direction="row" alignItems="center">
            <Typography variant="body1">{t('namnskylt.label')}</Typography>
            {isLive && <LiveChip variant="live" />}
        </Stack>
    );
};

export default NamnskyltRundownItem;
