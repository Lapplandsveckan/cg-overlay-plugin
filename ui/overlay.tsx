import React from 'react';
import {Box, Button, Stack, Typography} from '@mui/material';
import {MotionControl} from './motion';
import VideoQueue from './video';

// Main component
const OverlayTest = ({ path }) => {
    if (path && path[0] === 'motion') return <MotionControl />;

    return (
        <Stack spacing={2} sx={{maxWidth: 720, margin: '0 auto', padding: 2}}>
            <Typography variant="h5" fontWeight={600}>Overlay controls</Typography>

            <VideoQueue />

            <Box sx={{paddingTop: 1}}>
                <Typography variant="overline" color="text.secondary">More</Typography>
                <Stack direction="row" spacing={1.5} sx={{marginTop: 1}}>
                    <Button component="a" href="lappis/motion" variant="outlined" fullWidth>
                        Motion
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
};

export default OverlayTest;
