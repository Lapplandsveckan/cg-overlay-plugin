import React from 'react';
import {Stack, Typography} from '@mui/material';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface TextRundownItemProps {
    entry: RundownEntry;
}

export const TextRundownItem: React.FC<TextRundownItemProps> = ({entry}) => {
    return (
        <Stack
            spacing={2}
            direction="column"
        >
            <Typography variant="body1">
                {entry.data.text}
            </Typography>
        </Stack>
    );
}

export default TextRundownItem;
