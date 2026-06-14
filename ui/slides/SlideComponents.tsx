import React from 'react';
import {
    Box,
    Button,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
// @ts-expect-error -- no type declarations for @web-lib
import SlidePreview from './SlidePreview';
import { type Slide, slideLabel } from './api';

export const CenteredMessage: React.FC<React.PropsWithChildren> = ({
    children,
}) => (
    <Box sx={{ padding: 6, textAlign: 'center', color: 'text.secondary' }}>
        {children}
    </Box>
);

export const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
    <Box
        sx={{
            padding: 6,
            textAlign: 'center',
            border: '1px dashed rgba(255,255,255,0.15)',
            borderRadius: 2,
            color: 'text.secondary',
        }}
    >
        <Stack spacing={1.5} alignItems="center">
            <Typography variant="body1">No slides yet.</Typography>
            <Typography variant="body2">
                Add Bible verses or a text slide to get started.
            </Typography>
            <Button variant="contained" size="small" onClick={onAdd}>
                + Add slides
            </Button>
        </Stack>
    </Box>
);

export interface SlideCardProps {
    slide: Slide;
    index: number;
    backgroundUrl?: string | null;
    onEdit: () => void;
    onDelete: () => void;
}

export const SlideCard: React.FC<SlideCardProps> = ({
    slide,
    index,
    backgroundUrl,
    onEdit,
    onDelete,
}) => (
    <Stack spacing={1}>
        <Box
            sx={{
                position: 'relative',
                '&:hover .slide-overlay': { opacity: 1 },
            }}
        >
            <SlidePreview
                text={slide.text}
                reference={slide.type === 'bible' ? slide.reference : ''}
                backgroundUrl={backgroundUrl}
            />
            <Stack
                className="slide-overlay"
                direction="row"
                spacing={0.5}
                sx={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    opacity: 0,
                    transition: 'opacity 80ms',
                }}
            >
                <Tooltip title="Edit slide">
                    <IconButton
                        onClick={onEdit}
                        sx={{
                            width: 28,
                            height: 28,
                            padding: 0,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                        }}
                    >
                        <Box
                            component="span"
                            sx={{ fontSize: 14, lineHeight: 1 }}
                        >
                            ✎
                        </Box>
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete slide">
                    <IconButton
                        onClick={onDelete}
                        sx={{
                            width: 28,
                            height: 28,
                            padding: 0,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#e88c8c',
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                        }}
                    >
                        <Box
                            component="span"
                            sx={{
                                fontSize: 16,
                                lineHeight: 1,
                                fontWeight: 300,
                            }}
                        >
                            ×
                        </Box>
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
        <Typography
            variant="body2"
            color="text.secondary"
            sx={{ paddingLeft: 0.25 }}
        >
            {index}. {slideLabel(slide)}
        </Typography>
    </Stack>
);
