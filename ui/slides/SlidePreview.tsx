import React from 'react';
import {Box, Typography} from '@mui/material';

export interface SlidePreviewProps {
    text: string;
    reference?: string;

    backgroundUrl?: string | null;
    aspectRatio?: string;
    minWidth?: number | string;
    selected?: boolean;
    dimmed?: boolean;
}

// Live template uses vw/vh against the program output (16:9). The preview is
// also rendered into a 16:9 box and uses cqw/cqh, so every unit maps 1:1 to
// vw/vh and the layout is pixel-proportional to the live render.
export const SlidePreview: React.FC<SlidePreviewProps> = ({
    text,
    reference = '',
    backgroundUrl,
    aspectRatio = '16/9',
    minWidth,
    selected,
    dimmed,
}) => (
    <Box
        sx={{
            position: 'relative',
            aspectRatio,
            width: '100%',
            minWidth,
            backgroundColor: '#1a1c22',
            backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
            backgroundSize: 'cover',
            borderRadius: 1,
            overflow: 'hidden',
            border: selected ? '2px solid #4a90e2' : '1px solid rgba(255,255,255,0.08)',
            transition: 'border-color 80ms, opacity 80ms',
            opacity: dimmed ? 0.55 : 1,
            containerType: 'size',
        }}
    >
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Typography
                sx={{
                    maxWidth: '78cqw',
                    fontFamily: `'Alright Sans', sans-serif`,
                    fontSize: '6.4cqh',
                    lineHeight: 1.3,
                    fontWeight: 400,
                    textAlign: 'center',
                    textWrap: 'balance',
                    color: '#fff',
                    margin: 0,
                }}
            >
                {text || <Box component="span" sx={{opacity: 0.4, fontStyle: 'italic'}}>(empty)</Box>}
            </Typography>
        </Box>
        {reference && (
            <Box
                sx={{
                    position: 'absolute',
                    left: '5cqw',
                    bottom: '5cqh',
                    fontFamily: `'Alright Sans', sans-serif`,
                    fontSize: '2.8cqh',
                    fontWeight: 300,
                    letterSpacing: '0.05em',
                    color: 'rgba(255, 255, 255, 0.75)',
                    lineHeight: 1,
                }}
            >
                {reference}
            </Box>
        )}
    </Box>
);

export default SlidePreview;
