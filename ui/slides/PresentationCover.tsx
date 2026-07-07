import React from 'react';
import { Box } from '@mui/material';

import { useTranslation } from '../i18n';
import SlidePreview from './SlidePreview';
import {
    type Presentation,
    slideRef,
    slideText,
    useImageThumbnails,
} from './api';

interface PresentationCoverProps {
    presentation: Presentation;
    backgroundUrl?: string | null;
    selected?: boolean;
}

/** Renders a presentation's cover: its first slide, or a black placeholder if empty. */
export const PresentationCover: React.FC<PresentationCoverProps> = ({
    presentation,
    backgroundUrl,
    selected,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const firstSlide = presentation.slides[0];
    const coverMediaIds =
        firstSlide?.type === 'image' ? [firstSlide.mediaId] : [];
    const coverThumbs = useImageThumbnails(coverMediaIds);

    if (!firstSlide) {
        return (
            <Box
                sx={{
                    aspectRatio: '16/9',
                    backgroundColor: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 14,
                    fontStyle: 'italic',
                    border: selected
                        ? '2px solid #4a90e2'
                        : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 1,
                }}
            >
                {t('presentationIndex.empty')}
            </Box>
        );
    }

    if (firstSlide.type === 'image') {
        return (
            <SlidePreview
                imageUrl={coverThumbs[firstSlide.mediaId] ?? null}
                selected={selected}
            />
        );
    }

    return (
        <SlidePreview
            text={slideText(firstSlide)}
            reference={slideRef(firstSlide)}
            backgroundUrl={backgroundUrl}
            selected={selected}
        />
    );
};

export default PresentationCover;
