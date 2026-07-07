import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';

import CancelPresentationIcon from '@mui/icons-material/CancelPresentationOutlined';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import LiveTvIcon from '@mui/icons-material/LiveTvOutlined';
import TvOffIcon from '@mui/icons-material/TvOffOutlined';
import {
    type Presentation,
    type Slide,
    type ImageSlide,
    type VideoSlide,
    type PlaybackState,
    useBackgroundImage,
    useFullImage,
    useImageThumbnails,
    slideRef,
    slideText,
} from '../api';
import { useTranslation } from '../../i18n';
import { PlayingView } from './PlayingView';
import { PickerView } from './PickerView';

export function slidePreviewProps(
    slide: Slide,
    thumbnails: Record<string, string>,
    backgroundUrl?: string | null,
) {
    if (slide.type === 'image' || slide.type === 'video')
        return {
            imageUrl: (thumbnails[(slide as ImageSlide | VideoSlide).mediaId] ??
                null) as string | null,
            isVideo: slide.type === 'video',
        };
    return {
        text: slideText(slide),
        reference: slideRef(slide),
        heading: slide.type === 'heading',
        backgroundUrl,
    };
}

export interface RunModalProps {
    open: boolean;
    presentation: Presentation | null;
    playback: PlaybackState | null;

    onClose: () => void;
    onClear: () => void;
    onPlay: (slideId: string, grabAttention: boolean) => void;
    onPauseVideo: () => void;
    onResumeVideo: () => void;
}

export const RunModal: React.FC<RunModalProps> = ({
    open,
    presentation,
    playback,
    onClose,
    onClear,
    onPlay,
    onPauseVideo,
    onResumeVideo,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const slides = presentation?.slides ?? [];
    const backgroundUrl = useBackgroundImage();
    const [grabAttention, setGrabAttention] = useState(true);
    const [shiftPressed, setShiftPressed] = useState(false);
    const imageMediaIds = slides
        .filter(
            (s): s is ImageSlide | VideoSlide =>
                s.type === 'image' || s.type === 'video',
        )
        .map(s => s.mediaId);
    const thumbnails = useImageThumbnails(imageMediaIds);

    // "Playing here" = backend reports playing AND the playing presentation
    // matches the one this modal is currently controlling.
    const playingHere = !!(
        playback?.playing && playback.presentationId === presentation?.id
    );

    const currentIndex = playingHere
        ? slides.findIndex(s => s.id === playback?.slideId)
        : -1;
    const current = currentIndex >= 0 ? slides[currentIndex] : null;
    const currentFullUrl = useFullImage(
        current?.type === 'image' ? current.mediaId : null,
    );

    const atStart = currentIndex <= 0;
    const atEnd = currentIndex < 0 || currentIndex >= slides.length - 1;

    const play = (slideId: string, shiftHeld = false) => {
        onPlay(slideId, shiftHeld ? false : grabAttention);
    };

    const handleNext = (shiftHeld = false) => {
        if (!playingHere) return;
        const next = slides[currentIndex + 1];
        if (next) play(next.id, shiftHeld);
    };

    const handlePrev = (shiftHeld = false) => {
        if (!playingHere) return;
        const prev = slides[currentIndex - 1];
        if (prev) play(prev.id, shiftHeld);
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
                if (playingHere) onClear();
                else onClose();
                return;
            }

            if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3') {
                e.preventDefault();
                if (playingHere) onClear();
                return;
            }

            if (e.key.toLowerCase() === 'a') {
                e.preventDefault();
                setGrabAttention(g => !g);
                return;
            }

            if (!playingHere) return;

            if (
                e.key === 'ArrowRight' ||
                e.key === ' ' ||
                e.key === 'PageDown'
            ) {
                e.preventDefault();
                if (!atEnd) handleNext(e.shiftKey);
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                if (!atStart) handlePrev(e.shiftKey);
            }
        };

        const shiftHandler = (e: KeyboardEvent) => {
            setShiftPressed(e.shiftKey);
        };

        window.addEventListener('keydown', handler);
        window.addEventListener('keyup', shiftHandler);
        window.addEventListener('keydown', shiftHandler);
        return () => {
            window.removeEventListener('keydown', handler);
            window.removeEventListener('keyup', shiftHandler);
            window.removeEventListener('keydown', shiftHandler);
        };
    }, [open, playingHere, atStart, atEnd, currentIndex, grabAttention]);

    const thumbnailRef = useThumbnailScroll(
        playingHere ? (playback?.slideId ?? null) : null,
        open,
    );

    const contentRef = useRef<HTMLDivElement>(null);
    const pickerScrollTop = useRef(0);

    useEffect(() => {
        if (open) pickerScrollTop.current = 0;
    }, [open, presentation?.id]);

    useLayoutEffect(() => {
        if (!playingHere && contentRef.current)
            contentRef.current.scrollTop = pickerScrollTop.current;
    }, [playingHere]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            onClick={e => e.stopPropagation()}
            fullScreen
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
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                        {playingHere && (
                            <Typography variant="body2" color="text.secondary">
                                {`${currentIndex + 1} / ${slides.length}`}
                            </Typography>
                        )}
                        {playingHere && (
                            <Tooltip title={t('runModal.clearTooltip')}>
                                <IconButton
                                    size="small"
                                    onClick={onClear}
                                    color="error"
                                >
                                    <CancelPresentationIcon
                                        sx={{ fontSize: 20 }}
                                    />
                                </IconButton>
                            </Tooltip>
                        )}
                        <Tooltip
                            title={
                                shiftPressed
                                    ? t('runModal.grabAttentionShiftHint')
                                    : t('runModal.grabAttentionHint')
                            }
                        >
                            <Box sx={{ position: 'relative', display: 'flex' }}>
                                <IconButton
                                    size="small"
                                    onClick={() => setGrabAttention(g => !g)}
                                    color={
                                        shiftPressed
                                            ? 'default'
                                            : grabAttention
                                              ? 'warning'
                                              : 'default'
                                    }
                                    sx={{
                                        opacity:
                                            shiftPressed || grabAttention
                                                ? 1
                                                : 0.5,
                                        position: 'relative',
                                        top: -2,
                                        transition: 'all 100ms ease-in-out',
                                    }}
                                >
                                    {shiftPressed ? (
                                        <TvOffIcon sx={{ fontSize: 20 }} />
                                    ) : grabAttention ? (
                                        <LiveTvIcon sx={{ fontSize: 20 }} />
                                    ) : (
                                        <TvOffIcon sx={{ fontSize: 20 }} />
                                    )}
                                </IconButton>
                                {shiftPressed && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: -4,
                                            right: 0,
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            backgroundColor: '#ff9800',
                                            animation:
                                                'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                            '@keyframes pulse': {
                                                '0%, 100%': { opacity: 1 },
                                                '50%': { opacity: 0.5 },
                                            },
                                        }}
                                    />
                                )}
                            </Box>
                        </Tooltip>
                        <Tooltip
                            title={
                                playingHere
                                    ? t('runModal.closeModal')
                                    : t('runModal.closeEsc')
                            }
                        >
                            <IconButton
                                onClick={onClose}
                                size="small"
                                color="inherit"
                            >
                                <CloseIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
            </DialogTitle>
            <DialogContent
                ref={contentRef}
                onScroll={e => {
                    if (!playingHere)
                        pickerScrollTop.current = e.currentTarget.scrollTop;
                }}
                sx={{ userSelect: 'none' }}
            >
                {playingHere && current ? (
                    <PlayingView
                        slides={slides}
                        currentSlideId={playback!.slideId}
                        current={current}
                        video={playback!.video ?? null}
                        atStart={atStart}
                        atEnd={atEnd}
                        thumbnailRef={thumbnailRef}
                        backgroundUrl={backgroundUrl}
                        thumbnails={thumbnails}
                        currentFullUrl={currentFullUrl}
                        onNext={shiftHeld => handleNext(shiftHeld)}
                        onPrev={shiftHeld => handlePrev(shiftHeld)}
                        onJump={(slideId, shiftHeld) =>
                            play(slideId, shiftHeld)
                        }
                        onPauseVideo={onPauseVideo}
                        onResumeVideo={onResumeVideo}
                    />
                ) : (
                    <PickerView
                        slides={slides}
                        onPlay={(slideId, shiftHeld) =>
                            play(slideId, shiftHeld)
                        }
                        backgroundUrl={backgroundUrl}
                        thumbnails={thumbnails}
                    />
                )}
            </DialogContent>
        </Dialog>
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
