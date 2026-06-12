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

// Verse-number marker emitted by the server: ⟨N⟩<verse text…>
const VERSE_NUM_RE = /⟨(\d+)⟩/g;

function renderText(text: string): React.ReactNode {
    if (!text) return <Box component="span" sx={{opacity: 0.4, fontStyle: 'italic'}}>(empty)</Box>;
    if (!text.includes('⟨')) return text;

    const parts: React.ReactNode[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    VERSE_NUM_RE.lastIndex = 0;
    while ((match = VERSE_NUM_RE.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index));
        parts.push(
            <Box
                key={match.index}
                component="span"
                sx={{
                    fontSize: '0.55em',
                    verticalAlign: 'super',
                    opacity: 0.65,
                    marginRight: '0.2em',
                    fontWeight: 500,
                }}
            >
                {match[1]}
            </Box>,
        );
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return <>{parts}</>;
}

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
                    fontSize: '7.6cqh',
                    lineHeight: 1.3,
                    fontWeight: 400,
                    textAlign: 'center',
                    textWrap: 'balance',
                    color: '#fff',
                    margin: 0,
                }}
            >
                {renderText(text)}
            </Typography>
        </Box>
        {reference && (
            <Box
                sx={{
                    position: 'absolute',
                    left: '5cqw',
                    bottom: '5cqh',
                    fontFamily: `'Alright Sans', sans-serif`,
                    fontSize: '4.2cqh',
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
