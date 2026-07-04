import React from 'react';
import { Box } from '@mui/material';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import PresentationIndex from './slides/PresentationIndex';
import PresentationEditor from './slides/PresentationEditor';

export const meta = {
    label: 'cg-overlay-plugin:nav.slides',
    icon: SlideshowIcon,
};

const PresentationsPage = ({ path }) => {
    // The navbar page is mounted at /ext/cg-overlay-plugin/slides. Depending
    // on whether the host forwards `path` relative to that mount point or to
    // the plugin root, the id arrives as path[0] or path[1] (after a leading
    // 'slides' segment) — handle both so the index route isn't mistaken for
    // an id of "slides".
    const id = path?.[0] === 'slides' ? path[1] : path?.[0];
    if (id) {
        return <PresentationEditor id={id} />;
    }

    return (
        <Box
            sx={{ maxWidth: 1600, margin: '0 auto', padding: { xs: 2, md: 3 } }}
        >
            <PresentationIndex />
        </Box>
    );
};

export default PresentationsPage;
