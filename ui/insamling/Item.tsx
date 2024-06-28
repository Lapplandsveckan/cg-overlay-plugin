import React from 'react';
import {Stack, Typography} from '@mui/material';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface InsamlingRundownItemProps {
    entry: RundownEntry;
}

export const InsamlingRundownItem: React.FC<InsamlingRundownItemProps> = ({entry}) => {
    return (
        <Stack
            spacing={2}
            direction="column"
        >
            <Typography variant="body1">
                Insamling {entry.data.now} / {entry.data.goal}
            </Typography>
        </Stack>
    );
}

export default InsamlingRundownItem;