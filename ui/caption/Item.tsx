import React from 'react';
import { Stack, Typography } from '@mui/material';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import { useTranslation } from '../i18n';
import { LiveChip, useOverlayState } from '../overlay-state';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface CaptionRundownItemProps {
    entry: RundownEntry;
}

export const CaptionRundownItem: React.FC<CaptionRundownItemProps> = () => {
    const { t } = useTranslation('cg-overlay-plugin');
    const state = useOverlayState();

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <ClosedCaptionIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
                {t('caption.lowerThird')}
            </Typography>
            {state?.caption && <LiveChip variant="live" />}
        </Stack>
    );
};

export default CaptionRundownItem;
