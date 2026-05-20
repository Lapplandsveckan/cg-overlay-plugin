import React from 'react';
import {Box, LinearProgress, Stack, Typography} from '@mui/material';

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

export const InsamlingRundownItem: React.FC<InsamlingRundownItemProps> = ({entry}) => {
    const now = Number(entry.data?.now) || 0;
    const goal = Number(entry.data?.goal) || 0;
    const pct = goal > 0 ? Math.min(100, (now / goal) * 100) : 0;

    return (
        <Stack spacing={0.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                <Typography variant="body1">Insamling</Typography>
                <Typography variant="caption" color="text.secondary">
                    {formatKr(now)} / {formatKr(goal)}
                </Typography>
            </Stack>
            {goal > 0 && (
                <Box>
                    <LinearProgress variant="determinate" value={pct} sx={{height: 4, borderRadius: 2}} />
                </Box>
            )}
        </Stack>
    );
};

export default InsamlingRundownItem;
