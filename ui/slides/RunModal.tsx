import React, { useEffect } from 'react';
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

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SlidePreview from './SlidePreview';
import {
    type Presentation,
    type Slide,
    type PlaybackState,
    slideRef,
    slideLabel,
    slideText,
    useBackgroundImage,
} from './api';
import { useTranslation } from '../i18n';

export interface RunModalProps {
    open: boolean;
    presentation: Presentation | null;
    playback: PlaybackState | null;

    onClose: () => void;
    onStop: () => void;
    onPlay: (slideId: string) => void;
}

export const RunModal: React.FC<RunModalProps> = ({
    open,
    presentation,
    playback,
    onClose,
    onStop,
    onPlay,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const slides = presentation?.slides ?? [];
    const backgroundUrl = useBackgroundImage();

    // "Playing here" = backend reports playing AND the playing presentation
    // matches the one this modal is currently controlling.
    const playingHere = !!(
        playback?.playing && playback.presentationId === presentation?.id
    );

    const currentIndex = playingHere
        ? slides.findIndex(s => s.id === playback?.slideId)
        : -1;
    const current = currentIndex >= 0 ? slides[currentIndex] : null;

    const atStart = currentIndex <= 0;
    const atEnd = currentIndex < 0 || currentIndex >= slides.length - 1;

    const handleNext = () => {
        if (!playingHere) return;
        const next = slides[currentIndex + 1];
        if (next) onPlay(next.id);
    };

    const handlePrev = () => {
        if (!playingHere) return;
        const prev = slides[currentIndex - 1];
        if (prev) onPlay(prev.id);
    };

    useEffect(() => {
        if (!open) return;

        const handler = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            )
                return;

            if (e.key === 'Escape') {
                e.preventDefault();
                if (playingHere) onStop();
                else onClose();
                return;
            }

            if (!playingHere) return;

            if (
                e.key === 'ArrowRight' ||
                e.key === ' ' ||
                e.key === 'PageDown'
            ) {
                e.preventDefault();
                if (!atEnd) handleNext();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                if (!atStart) handlePrev();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, playingHere, atStart, atEnd, currentIndex]);

    const thumbnailRef = useThumbnailScroll(
        playingHere ? (playback?.slideId ?? null) : null,
        open,
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth={false}
            PaperProps={{ sx: { width: 'min(92vw, 900px)', maxWidth: 'none' } }}
        >
            <DialogTitle sx={{ paddingBottom: 1 }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={1.5} alignItems="baseline">
                        <Typography variant="h6">
                            {t('runModal.heading')}
                        </Typography>
                        {presentation?.title && (
                            <Typography variant="body2" color="text.secondary">
                                {presentation.title}
                            </Typography>
                        )}
                        {!playingHere && slides.length > 0 && (
                            <Chip
                                label={t('runModal.clickToStart')}
                                size="small"
                                variant="outlined"
                                sx={{ borderStyle: 'dashed' }}
                            />
                        )}
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {playingHere && (
                            <Typography variant="body2" color="text.secondary">
                                {`${currentIndex + 1} / ${slides.length}`}
                            </Typography>
                        )}
                        {playingHere && (
                            <Tooltip title={t('runModal.stopTooltip')}>
                                <Button
                                    onClick={onStop}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                >
                                    {t('runModal.stop')}
                                </Button>
                            </Tooltip>
                        )}
                        <Tooltip
                            title={
                                playingHere
                                    ? t('runModal.closeModal')
                                    : t('runModal.closeEsc')
                            }
                        >
                            <Button
                                onClick={onClose}
                                size="small"
                                color="inherit"
                                variant="outlined"
                            >
                                {t('runModal.close')}
                            </Button>
                        </Tooltip>
                    </Stack>
                </Stack>
            </DialogTitle>
            <DialogContent>
                {playingHere && current ? (
                    <PlayingView
                        slides={slides}
                        currentSlideId={playback!.slideId}
                        current={current}
                        atStart={atStart}
                        atEnd={atEnd}
                        thumbnailRef={thumbnailRef}
                        backgroundUrl={backgroundUrl}
                        onNext={handleNext}
                        onPrev={handlePrev}
                        onJump={onPlay}
                    />
                ) : (
                    <PickerView
                        slides={slides}
                        onPlay={onPlay}
                        backgroundUrl={backgroundUrl}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};

interface PlayingViewProps {
    slides: Slide[];
    currentSlideId: string | null;
    current: Slide;
    atStart: boolean;
    atEnd: boolean;
    thumbnailRef: React.RefObject<HTMLDivElement>;
    backgroundUrl?: string | null;
    onNext: () => void;
    onPrev: () => void;
    onJump: (slideId: string) => void;
}

const PlayingView: React.FC<PlayingViewProps> = ({
    slides,
    currentSlideId,
    current,
    atStart,
    atEnd,
    thumbnailRef,
    backgroundUrl,
    onNext,
    onPrev,
    onJump,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="stretch">
                <Tooltip title={t('runModal.prev')}>
                    <span>
                        <IconButton
                            onClick={onPrev}
                            disabled={atStart}
                            sx={{
                                width: 56,
                                alignSelf: 'stretch',
                                borderRadius: 1,
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                },
                            }}
                        >
                            <ChevronLeftIcon sx={{ fontSize: 28 }} />
                        </IconButton>
                    </span>
                </Tooltip>
                <Box sx={{ flexGrow: 1 }}>
                    <SlidePreview
                        text={slideText(current)}
                        reference={slideRef(current)}
                        backgroundUrl={backgroundUrl}
                    />
                </Box>
                <Tooltip title={t('runModal.next')}>
                    <span>
                        <IconButton
                            onClick={onNext}
                            disabled={atEnd}
                            sx={{
                                width: 56,
                                alignSelf: 'stretch',
                                borderRadius: 1,
                                backgroundColor: 'rgba(255,255,255,0.04)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                },
                            }}
                        >
                            <ChevronRightIcon sx={{ fontSize: 28 }} />
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
                        data-slide-thumb-id={slide.id}
                        onClick={() => onJump(slide.id)}
                        sx={{
                            flexShrink: 0,
                            width: 200,
                            cursor: 'pointer',
                            scrollSnapAlign: 'center',
                        }}
                    >
                        <Stack spacing={0.5}>
                            <SlidePreview
                                text={slideText(slide)}
                                reference={slideRef(slide)}
                                backgroundUrl={backgroundUrl}
                                selected={slide.id === currentSlideId}
                                dimmed={slide.id !== currentSlideId}
                            />
                            <Typography
                                variant="caption"
                                color={
                                    slide.id === currentSlideId
                                        ? 'text.primary'
                                        : 'text.secondary'
                                }
                                sx={{ textAlign: 'center' }}
                            >
                                {idx + 1}. {slideLabel(slide)}
                            </Typography>
                        </Stack>
                    </Box>
                ))}
            </Box>
        </Stack>
    );
};

interface PickerViewProps {
    slides: Slide[];
    backgroundUrl?: string | null;
    onPlay: (slideId: string) => void;
}

const PickerView: React.FC<PickerViewProps> = ({
    slides,
    backgroundUrl,
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
                paddingBottom: 1,
            }}
        >
            {slides.map((slide, idx) => (
                <Box
                    key={slide.id}
                    onClick={() => onPlay(slide.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPlay(slide.id);
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
                        '&:hover .picker-overlay, &:focus-visible .picker-overlay':
                            { opacity: 1 },
                    }}
                >
                    <Stack spacing={0.75}>
                        <Box sx={{ position: 'relative' }}>
                            <SlidePreview
                                text={slideText(slide)}
                                reference={slideRef(slide)}
                                backgroundUrl={backgroundUrl}
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

function useThumbnailScroll(currentSlideId: string | null, active: boolean) {
    const ref = React.useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!active || !ref.current || !currentSlideId) return;
        const target = ref.current.querySelector(
            `[data-slide-thumb-id="${currentSlideId}"]`,
        );
        if (target instanceof HTMLElement) {
            target.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
            });
        }
    }, [currentSlideId, active]);

    return ref;
}

export default RunModal;
