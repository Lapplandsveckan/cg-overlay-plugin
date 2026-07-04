import React from 'react';
import {
    Box,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';

export interface ModeOption {
    value: string;
    label: string;
    icon: React.ReactNode;
}

interface ModeRowProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: ModeOption[];
}

export const ModeRow: React.FC<ModeRowProps> = ({
    label,
    value,
    onChange,
    options,
}) => (
    <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography
            variant="body2"
            color="text.secondary"
            sx={{ width: 72, flexShrink: 0 }}
        >
            {label}
        </Typography>
        <ToggleButtonGroup
            exclusive
            size="small"
            value={value}
            onChange={(_, v) => v !== null && onChange(v)}
        >
            {options.map(opt => (
                <ToggleButton key={opt.value} value={opt.value}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ display: 'flex', fontSize: 16 }}>
                            {opt.icon}
                        </Box>
                        <Typography variant="caption">{opt.label}</Typography>
                    </Stack>
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    </Stack>
);

export default ModeRow;
