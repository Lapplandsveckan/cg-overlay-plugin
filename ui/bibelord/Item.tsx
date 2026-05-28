import React, {useCallback, useEffect, useState} from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';

// @ts-ignore
import {useSocket} from '@web-lib';
import SlidePreview from './SlidePreview';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface Slide {
    id: string;
    text: string;
    reference: string;
    translation: string;
    book: string;
    chapter: number;
    verse: number;
}

interface BibelordState {
    active: boolean;
    playing: boolean;
    entryId: string | null;
    title: string;
    slides: Slide[];
    currentIndex: number;
}

interface BibelordRundownItemProps {
    entry: RundownEntry;
}

const BIBELORD_PATH = '/api/plugin/lappis/bibelord';

export const BibelordRundownItem: React.FC<BibelordRundownItemProps> = ({entry}) => {
    const slides: Slide[] = Array.isArray(entry.data?.slides) ? entry.data.slides : [];

    const conn = useSocket();
    const [state, setState] = useState<BibelordState | null>(null);

    useEffect(() => {
        const setData = (data: BibelordState | null) => setState(data ?? null);

        const listener = {
            path: 'plugin/lappis/bibelord',
            method: 'UPDATE',
            handler: (req: any) => setData(req.data),
        };

        conn.rawRequest(BIBELORD_PATH, 'GET', {})
            .then((res: any) => setData(res?.data))
            .catch(console.error);
        conn.routes.register(listener);

        return () => {
            conn.routes.unregister(listener);
        };
    }, []);

    const isOpenHere = !!(state?.active && state.entryId === entry.id);
    const isPlayingHere = isOpenHere && !!state?.playing;

    const sendAction = useCallback((action: string, extra: any = {}) => {
        return conn.rawRequest(BIBELORD_PATH, 'ACTION', {action, ...extra})
            .catch(console.error);
    }, [conn]);

    return (
        <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body1">Bibel ord</Typography>
                <Chip
                    label={`${slides.length} slide${slides.length === 1 ? '' : 's'}`}
                    size="small"
                    variant="outlined"
                />
                {isPlayingHere && (
                    <Chip label="Live" size="small" color="error" />
                )}
            </Stack>
            {slides.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                    {slides[0].reference}
                    {slides.length > 1 && <> — {slides[slides.length - 1].reference}</>}
                </Typography>
            )}

            <ControlModal
                open={isOpenHere}
                state={state}
                onClose={() => sendAction('close')}
                onStop={() => sendAction('stop')}
                onNext={() => sendAction('next')}
                onPrev={() => sendAction('prev')}
                onJump={(index) => sendAction('jump', {index})}
            />
        </Stack>
    );
};

interface ControlModalProps {
    open: boolean;
    state: BibelordState | null;
    onClose: () => void;
    onStop: () => void;
    onNext: () => void;
    onPrev: () => void;
    onJump: (index: number) => void;
}

const ControlModal: React.FC<ControlModalProps> = ({open, state, onClose, onStop, onNext, onPrev, onJump}) => {
    const slides = state?.slides ?? [];
    const playing = !!state?.playing;
    const currentIndex = state?.currentIndex ?? 0;
    const current = slides[currentIndex];

    const atStart = currentIndex <= 0;
    const atEnd = currentIndex >= slides.length - 1;

    useEffect(() => {
        if (!open) return;

        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                // Two-step exit during a live: first Esc stops playback, second closes.
                if (playing) onStop();
                else onClose();
                return;
            }

            if (!playing) return;

            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
                e.preventDefault();
                if (!atEnd) onNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                if (!atStart) onPrev();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, playing, atStart, atEnd, onNext, onPrev, onClose, onStop]);

    const thumbnailRef = useThumbnailScroll(currentIndex, open && playing);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth={false}
            PaperProps={{sx: {width: 'min(92vw, 900px)', maxWidth: 'none'}}}
        >
            <DialogTitle sx={{paddingBottom: 1}}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="baseline">
                        <Typography variant="h6">Bibel ord</Typography>
                        {state?.title && (
                            <Typography variant="body2" color="text.secondary">
                                {state.title}
                            </Typography>
                        )}
                        {!playing && slides.length > 0 && (
                            <Chip
                                label="Click a slide to start"
                                size="small"
                                variant="outlined"
                                sx={{borderStyle: 'dashed'}}
                            />
                        )}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {playing && (
                            <Typography variant="body2" color="text.secondary">
                                {`${currentIndex + 1} / ${slides.length}`}
                            </Typography>
                        )}
                        {playing && (
                            <Tooltip title="Stop playback, keep modal open (Esc)">
                                <Button
                                    onClick={onStop}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                >
                                    Stop
                                </Button>
                            </Tooltip>
                        )}
                        <Tooltip title={playing ? 'Close modal' : 'Close (Esc)'}>
                            <Button
                                onClick={onClose}
                                size="small"
                                color="inherit"
                                variant="outlined"
                            >
                                Close
                            </Button>
                        </Tooltip>
                    </Stack>
                </Stack>
            </DialogTitle>
            <DialogContent>
                {playing
                    ? (
                        <PlayingView
                            slides={slides}
                            currentIndex={currentIndex}
                            current={current}
                            atStart={atStart}
                            atEnd={atEnd}
                            thumbnailRef={thumbnailRef}
                            onNext={onNext}
                            onPrev={onPrev}
                            onJump={onJump}
                        />
                    )
                    : <PickerView slides={slides} onJump={onJump} />
                }
            </DialogContent>
        </Dialog>
    );
};

interface PlayingViewProps {
    slides: Slide[];
    currentIndex: number;
    current: Slide | undefined;
    atStart: boolean;
    atEnd: boolean;
    thumbnailRef: React.RefObject<HTMLDivElement>;
    onNext: () => void;
    onPrev: () => void;
    onJump: (index: number) => void;
}

const PlayingView: React.FC<PlayingViewProps> = ({
    slides, currentIndex, current, atStart, atEnd, thumbnailRef, onNext, onPrev, onJump,
}) => (
    <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} alignItems="stretch">
            <Tooltip title="Previous (←)">
                <span>
                    <IconButton
                        onClick={onPrev}
                        disabled={atStart}
                        sx={{
                            width: 56,
                            alignSelf: 'stretch',
                            borderRadius: 1,
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            '&:hover': {backgroundColor: 'rgba(255,255,255,0.08)'},
                        }}
                    >
                        <Box component="span" sx={{fontSize: 28, lineHeight: 1}}>‹</Box>
                    </IconButton>
                </span>
            </Tooltip>
            <Box sx={{flexGrow: 1}}>
                {current ? (
                    <SlidePreview
                        text={current.text}
                        reference={current.reference}
                        aspectRatio="16/9"
                    />
                ) : (
                    <Box sx={{aspectRatio: '16/9', backgroundColor: '#000', borderRadius: 1}} />
                )}
            </Box>
            <Tooltip title="Next (→ / Space)">
                <span>
                    <IconButton
                        onClick={onNext}
                        disabled={atEnd}
                        sx={{
                            width: 56,
                            alignSelf: 'stretch',
                            borderRadius: 1,
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            '&:hover': {backgroundColor: 'rgba(255,255,255,0.08)'},
                        }}
                    >
                        <Box component="span" sx={{fontSize: 28, lineHeight: 1}}>›</Box>
                    </IconButton>
                </span>
            </Tooltip>
        </Stack>

        <Box
            ref={thumbnailRef}
            sx={{
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                paddingBottom: 1,
                scrollSnapType: 'x proximity',
            }}
        >
            {slides.map((slide, idx) => (
                <Box
                    key={slide.id}
                    data-slide-thumb-index={idx}
                    onClick={() => onJump(idx)}
                    sx={{
                        flexShrink: 0,
                        width: 200,
                        cursor: 'pointer',
                        scrollSnapAlign: 'center',
                    }}
                >
                    <Stack spacing={0.5}>
                        <SlidePreview
                            text={slide.text}
                            reference={slide.reference}
                            selected={idx === currentIndex}
                            dimmed={idx !== currentIndex}
                        />
                        <Typography
                            variant="caption"
                            color={idx === currentIndex ? 'text.primary' : 'text.secondary'}
                            sx={{textAlign: 'center'}}
                        >
                            {idx + 1}. {slide.reference}
                        </Typography>
                    </Stack>
                </Box>
            ))}
        </Box>
    </Stack>
);

interface PickerViewProps {
    slides: Slide[];
    onJump: (index: number) => void;
}

const PickerView: React.FC<PickerViewProps> = ({slides, onJump}) => {
    if (slides.length === 0) {
        return (
            <Box sx={{padding: 6, textAlign: 'center', color: 'text.secondary'}}>
                <Typography variant="body2">No slides to play.</Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 2,
                paddingBottom: 1,
            }}
        >
            {slides.map((slide, idx) => (
                <Box
                    key={slide.id}
                    onClick={() => onJump(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onJump(idx);
                        }
                    }}
                    sx={{
                        cursor: 'pointer',
                        outline: 'none',
                        borderRadius: 1.5,
                        transition: 'transform 100ms, box-shadow 100ms',
                        '&:hover, &:focus-visible': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px rgba(74,144,226,0.3)',
                        },
                        '&:hover .picker-overlay, &:focus-visible .picker-overlay': {opacity: 1},
                    }}
                >
                    <Stack spacing={0.75}>
                        <Box sx={{position: 'relative'}}>
                            <SlidePreview text={slide.text} reference={slide.reference} />
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
                                    <Box
                                        component="span"
                                        sx={{
                                            fontSize: 36,
                                            lineHeight: 1,
                                            color: '#fff',
                                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                                        }}
                                    >
                                        ▶
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{color: '#fff', letterSpacing: '0.05em'}}
                                    >
                                        Start from here
                                    </Typography>
                                </Stack>
                            </Box>
                        </Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{textAlign: 'center'}}
                        >
                            {idx + 1}. {slide.reference}
                        </Typography>
                    </Stack>
                </Box>
            ))}
        </Box>
    );
};

function useThumbnailScroll(currentIndex: number, active: boolean) {
    const ref = React.useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!active || !ref.current) return;
        const target = ref.current.querySelector(`[data-slide-thumb-index="${currentIndex}"]`);
        if (target instanceof HTMLElement) {
            target.scrollIntoView({behavior: 'smooth', inline: 'center', block: 'nearest'});
        }
    }, [currentIndex, active]);

    return ref;
}

export default BibelordRundownItem;
