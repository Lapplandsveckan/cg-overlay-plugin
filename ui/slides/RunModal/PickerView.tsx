import React from 'react';
import { Box, Stack, Typography } from '@mui/material';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SlidePreview from '../SlidePreview';
import { type Slide, slideLabel } from '../api';

import { useTranslation } from '../../i18n';
import { slidePreviewProps } from './index';

export interface PickerViewProps {
    slides: Slide[];
    backgroundUrl?: string | null;
    thumbnails: Record<string, string>;
    onPlay: (slideId: string, shiftHeld: boolean) => void;
}

export const PickerView: React.FC<PickerViewProps> = ({
    slides,
    backgroundUrl,
    thumbnails,
    onPlay,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    if (slides.length === 0) {
        return (
            <Box
                sx={{
                    padding: 6,
                    textAlign: 'center',
                    color: 'text.secondary',
                }}
            >
                <Typography variant="body2">
                    {t('runModal.noSlides')}
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 2,
                paddingTop: 0.5,
                paddingBottom: 1,
            }}
        >
            {slides.map((slide, idx) => (
                <Box
                    key={slide.id}
                    onClick={e => onPlay(slide.id, e.shiftKey)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPlay(slide.id, e.shiftKey);
                        }
                    }}
                    sx={{
                        cursor: 'pointer',
                        '&:hover .picker-thumb, &:focus-visible .picker-thumb':
                            { borderColor: '#ff9800' },
                        '&:hover .picker-overlay, &:focus-visible .picker-overlay':
                            { opacity: 1 },
                    }}
                >
                    <Stack spacing={0.75}>
                        <Box
                            className="picker-thumb"
                            sx={{
                                position: 'relative',
                                padding: '2px',
                                border: '2px solid transparent',
                                borderRadius: 1,
                                transition: 'border-color 100ms',
                            }}
                        >
                            <SlidePreview
                                {...slidePreviewProps(
                                    slide,
                                    thumbnails,
                                    backgroundUrl,
                                )}
                            />
                            <Box
                                className="picker-overlay"
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.45)',
                                    opacity: 0,
                                    transition: 'opacity 100ms',
                                    borderRadius: 1,
                                    pointerEvents: 'none',
                                }}
                            >
                                <Stack alignItems="center" spacing={0.5}>
                                    <PlayArrowIcon
                                        sx={{
                                            fontSize: 36,
                                            color: '#fff',
                                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: '#fff',
                                            letterSpacing: '0.05em',
                                        }}
                                    >
                                        {t('runModal.startFromHere')}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ textAlign: 'center' }}
                        >
                            {idx + 1}. {slideLabel(slide)}
                        </Typography>
                    </Stack>
                </Box>
            ))}
        </Box>
    );
};
