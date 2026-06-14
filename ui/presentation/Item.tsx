import React from 'react';
import { Chip, Stack, Typography } from '@mui/material';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface PresentationRundownItemProps {
    entry: RundownEntry;
}

export const PresentationRundownItem: React.FC<
    PresentationRundownItemProps
> = ({ entry }) => {
    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body1">Presentation</Typography>
            {entry.data?.atem && (
                <Chip
                    label="ATEM cut"
                    size="small"
                    color="primary"
                    variant="outlined"
                />
            )}
        </Stack>
    );
};

export default PresentationRundownItem;
