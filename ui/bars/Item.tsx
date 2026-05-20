import React from 'react';
import {Box, Stack, Typography} from '@mui/material';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface BarsRundownItemProps {
    entry: RundownEntry;
}

export const BarsRundownItem: React.FC<BarsRundownItemProps> = () => {
    return (
        <Stack direction="row" spacing={1} alignItems="center">
            <Box
                sx={{
                    width: 56,
                    height: 32,
                    borderRadius: 0.5,
                    backgroundColor: '#3a3d44',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{position: 'absolute', top: 0, left: 0, right: 0, height: 7, backgroundColor: '#000'}} />
                <Box sx={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 7, backgroundColor: '#000'}} />
            </Box>
            <Typography variant="body2" color="text.secondary">Cinematic bars</Typography>
        </Stack>
    );
};

export default BarsRundownItem;
