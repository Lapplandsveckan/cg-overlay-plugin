import React from 'react';
import {Stack, Typography} from '@mui/material';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface SwishRundownItemProps {
    entry: RundownEntry;
}

export const SwishRundownItem: React.FC<SwishRundownItemProps> = ({entry}) => {
    return (
        <Stack
            spacing={2}
            direction="column"
        >
            <Typography variant="body1">
                Swish {entry.data.number}
            </Typography>
        </Stack>
    );
}

export default SwishRundownItem;