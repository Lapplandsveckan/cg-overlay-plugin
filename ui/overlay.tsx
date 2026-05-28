import {Box, Button, Stack, Typography} from '@mui/material';
// @ts-ignore
import {MotionControl} from './motion';
import VideoQueue from './video';
import PresentationIndex from './bibelord/PresentationIndex';
import PresentationEditor from './bibelord/PresentationEditor';

const OverlayTest = ({ path }) => {
    if (path && path[0] === 'motion') return <MotionControl />;

    if (path && path[0] === 'bibel') {
        const id = path[1];
        if (id) return <PresentationEditor id={id} />;
        return <PresentationIndex />;
    }

    return (
        <Stack spacing={2} sx={{maxWidth: 720, margin: '0 auto', padding: 2}}>
            <Typography variant="h5" fontWeight={600}>Overlay controls</Typography>

            <VideoQueue />;

            <Box sx={{paddingTop: 1}}>
                <Typography variant="overline" color="text.secondary">More</Typography>
                <Stack direction="row" spacing={1.5} sx={{marginTop: 1}}>
                    <Button component="a" href="lappis/motion" variant="outlined" fullWidth>
                        Motion
                    </Button>
                    <Button component="a" href="lappis/bibel" variant="outlined" fullWidth>
                        Bibel ord
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
};

export default OverlayTest;
