import React from 'react';
import { Chip } from '@mui/material';

import ContentCutIcon from '@mui/icons-material/ContentCut';
import FastForwardIcon from '@mui/icons-material/FastForward';
import GradientIcon from '@mui/icons-material/Gradient';
import { useTranslation } from './i18n';
import {
    normalizeIntro,
    normalizeOutro,
    type VideoOptions,
} from './video-utils';

const introIcons = {
    fast: <FastForwardIcon sx={{ fontSize: 14 }} />,
    fade: <GradientIcon sx={{ fontSize: 14 }} />,
    cut: <ContentCutIcon sx={{ fontSize: 14 }} />,
};

const outroIcons = {
    fade: <GradientIcon sx={{ fontSize: 14 }} />,
    cut: <ContentCutIcon sx={{ fontSize: 14 }} />,
};

const chipSx = { px: 0.75 };

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

interface TransitionChipsProps {
    options?: VideoOptions;
}

// Shows a small chip per intro/outro option that deviates from its default
// ('regular' intro, 'cut' outro) — defaults render nothing.
export const TransitionChips: React.FC<TransitionChipsProps> = ({
    options,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const intro = normalizeIntro(options);
    const outro = normalizeOutro(options);

    return (
        <>
            {intro !== 'regular' && (
                <Chip
                    icon={introIcons[intro]}
                    label={`${t('transition.introLabel')}: ${t(`transition.intro${capitalize(intro)}`)}`}
                    size="small"
                    variant="outlined"
                    sx={chipSx}
                />
            )}
            {outro !== 'cut' && (
                <Chip
                    icon={outroIcons[outro]}
                    label={`${t('transition.outroLabel')}: ${t(`transition.outro${capitalize(outro)}`)}`}
                    size="small"
                    variant="outlined"
                    sx={chipSx}
                />
            )}
        </>
    );
};

export default TransitionChips;
