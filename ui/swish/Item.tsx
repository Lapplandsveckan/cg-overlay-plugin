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
            {
                entry.data.labels && (
                    <Typography variant="body2">
                        {entry.data.labels}
                    </Typography>
                )
            }
            {
                entry.data.skipFirst && (
                    <Typography variant="body2">
                        Skip first
                    </Typography>
                )
            }
        </Stack>
    );
}

export default SwishRundownItem;
