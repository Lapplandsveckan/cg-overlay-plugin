import React from 'react';
import {Stack, Typography} from '@mui/material';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface NamnskyltRundownItemProps {
    entry: RundownEntry;
}

export const NamnskyltRundownItem: React.FC<NamnskyltRundownItemProps> = ({entry}) => {
    return (
        <Stack
            spacing={2}
            direction="column"
        >
            <Typography variant="body1">
                Namnskylt
            </Typography>
        </Stack>
    );
}

export default NamnskyltRundownItem;