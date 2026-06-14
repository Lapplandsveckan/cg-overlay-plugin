import React from 'react';
import { Box, Stack } from '@mui/material';
import VideoQueue from './video';
import PresentationIndex from './slides/PresentationIndex';
import PresentationEditor from './slides/PresentationEditor';

const OverlayTest = ({ path }) => {
    if (path && path[0] === 'slides' && path[1]) {
        return <PresentationEditor id={path[1]} />;
    }

    return (
        <Box
            sx={{ maxWidth: 1600, margin: '0 auto', padding: { xs: 2, md: 3 } }}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={3}
                alignItems="flex-start"
            >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <PresentationIndex />
                </Box>
                <Box
                    sx={{
                        flexBasis: 380,
                        flexShrink: 0,
                        width: { xs: '100%', md: 'auto' },
                    }}
                >
                    <VideoQueue />
                </Box>
            </Stack>
        </Box>
    );
};

export default OverlayTest;
