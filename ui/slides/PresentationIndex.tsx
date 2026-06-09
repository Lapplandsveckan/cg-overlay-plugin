import React, {useState} from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Link,
    Stack,
    Typography,
} from '@mui/material';

// @ts-ignore
import {useSocket} from '@web-lib';

import SlidePreview from './SlidePreview';
import {Presentation, createPresentation, usePresentations, slideRef} from './api';
import {slidesEditorUrl} from './urls';

export const PresentationIndex: React.FC = () => {
    const conn = useSocket();
    const {presentations} = usePresentations();
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        setCreating(true);
        setError(null);
        try {
            const p = await createPresentation(conn, {title: 'Untitled', slides: []});
            window.location.assign(slidesEditorUrl(p.id));
        } catch (err: any) {
            console.error(err);
            setError(err?.message ?? 'Failed to create presentation');
            setCreating(false);
        }
    };

    return (
        <Box sx={{maxWidth: 1400, margin: '0 auto', padding: {xs: 2, md: 3}}}>
            <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="h5" fontWeight={600}>Presentations</Typography>
                    <Box sx={{flexGrow: 1}} />
                    <Link href="lappis" sx={{fontSize: 14}}>← Plugin home</Link>
                </Stack>

                {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

                {presentations === null ? (
                    <Typography variant="body2" color="text.secondary">Loading…</Typography>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)',
                                lg: 'repeat(4, 1fr)',
                            },
                            gap: 2.5,
                        }}
                    >
                        <CreateTile onClick={handleCreate} disabled={creating} />
                        {presentations.map(p => (
                            <PresentationTile key={p.id} presentation={p} />
                        ))}
                    </Box>
                )}
            </Stack>
        </Box>
    );
};

const CreateTile: React.FC<{onClick: () => void, disabled: boolean}> = ({onClick, disabled}) => (
    <Box
        onClick={disabled ? undefined : onClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }}
        sx={{
            cursor: disabled ? 'progress' : 'pointer',
            outline: 'none',
            aspectRatio: '16/9',
            borderRadius: 1.5,
            border: '1px dashed rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            color: 'text.secondary',
            transition: 'border-color 120ms, background-color 120ms',
            '&:hover, &:focus-visible': disabled ? {} : {
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74,144,226,0.06)',
                color: 'text.primary',
            },
        }}
    >
        <Box component="span" sx={{fontSize: 36, lineHeight: 1, fontWeight: 300}}>+</Box>
        <Typography variant="body2">{disabled ? 'Creating…' : 'New presentation'}</Typography>
    </Box>
);

const PresentationTile: React.FC<{presentation: Presentation}> = ({presentation}) => {
    const firstSlide = presentation.slides[0];
    return (
        <Stack
            spacing={1}
            component="a"
            href={slidesEditorUrl(presentation.id)}
            sx={{
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
                '&:hover .pres-card-title': {color: '#4a90e2'},
                '&:hover .pres-thumb': {borderColor: '#4a90e2'},
            }}
        >
            <Box
                className="pres-thumb"
                sx={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 1.5,
                    transition: 'border-color 80ms',
                    overflow: 'hidden',
                }}
            >
                {firstSlide ? (
                    <SlidePreview text={firstSlide.text} reference={slideRef(firstSlide)} />
                ) : (
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
                        }}
                    >
                        Empty
                    </Box>
                )}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{paddingLeft: 0.25}}>
                <Typography
                    className="pres-card-title"
                    variant="body1"
                    sx={{flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
                >
                    {presentation.title}
                </Typography>
                <Chip
                    label={`${presentation.slides.length}`}
                    size="small"
                    variant="outlined"
                />
            </Stack>
        </Stack>
    );
};

export default PresentationIndex;
