import React from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '../i18n';
import { LiveChip, useOverlayState } from '../overlay-state';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface InsamlingRundownItemProps {
    entry: RundownEntry;
}

function formatKr(value: number) {
    if (!Number.isFinite(value)) return '0 kr';
    return `${Math.round(value).toLocaleString('sv-SE')} kr`;
}

export const InsamlingRundownItem: React.FC<InsamlingRundownItemProps> = ({
    entry,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const state = useOverlayState();
    const now = Number(entry.data?.now) || 0;
    const goal = Number(entry.data?.goal) || 0;
    const pct = goal > 0 ? Math.min(100, (now / goal) * 100) : 0;

    return (
        <Stack spacing={0.5}>
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
            >
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body1">
                        {t('insamling.label')}
                    </Typography>
                    {state?.insamling && <LiveChip variant="live" />}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                    {formatKr(now)} / {formatKr(goal)}
                </Typography>
            </Stack>
            {goal > 0 && (
                <Box>
                    <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ height: 4, borderRadius: 2 }}
                    />
                </Box>
            )}
        </Stack>
    );
};

export default InsamlingRundownItem;
