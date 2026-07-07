import React, { useEffect, useState } from 'react';
import {
    Box,
    IconButton,
    LinearProgress,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SlidePreview from '../SlidePreview';
import VideoPlaybackPreview from '../VideoPlaybackPreview';
import {
    type Slide,
    type VideoSlide,
    type VideoPlaybackMetadata,
    slideLabel,
} from '../api';
import { formatTime } from '../../format';
import { playbackProgress } from '../../video-utils';

import { useTranslation } from '../../i18n';
import { slidePreviewProps } from './index';

export interface PlayingViewProps {
    slides: Slide[];
    currentSlideId: string | null;
    current: Slide;
    video: VideoPlaybackMetadata | null;
    atStart: boolean;
    atEnd: boolean;
    thumbnailRef: React.RefObject<HTMLDivElement>;
    backgroundUrl?: string | null;
    thumbnails: Record<string, string>;
    currentFullUrl?: string | null;
    onNext: (shiftHeld: boolean) => void;
    onPrev: (shiftHeld: boolean) => void;
    onJump: (slideId: string, shiftHeld: boolean) => void;
    onPauseVideo: () => void;
    onResumeVideo: () => void;
}

export const PlayingView: React.FC<PlayingViewProps> = ({
    slides,
    currentSlideId,
    current,
    video,
    atStart,
    atEnd,
    thumbnailRef,
    backgroundUrl,
    currentFullUrl,
    thumbnails,
    onNext,
    onPrev,
    onJump,
    onPauseVideo,
    onResumeVideo,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const isVideoSlide = current.type === 'video';
    const [playTime, setPlayTime] = useState(video?.playDuration ?? 0);

    useEffect(() => {
        if (!video) return;
        setPlayTime(video.playDuration);
        if (!video.playing) return;
        const interval = setInterval(() => setPlayTime(t => t + 100), 100);
        return () => clearInterval(interval);
    }, [video]);

    const progress = playbackProgress(
        playTime / 1000,
        (video?.clipDuration ?? 0) / 1000,
        { active: !!video && (video.playing || video.paused) },
    );
    const showVideoStatus = isVideoSlide && progress.active;

    return (
        <Stack spacing={2}>
            <Stack direction="row" spacing={1.5} alignItems="stretch">
                <Tooltip title={t('runModal.prev')}>
                    <span>
                        <IconButton
                            onClick={e => onPrev(e.shiftKey)}
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
                <Stack spacing={1} sx={{ flexGrow: 1 }}>
                    {isVideoSlide ? (
                        <VideoPlaybackPreview
                            mediaId={(current as VideoSlide).mediaId}
                            poster={
                                thumbnails[(current as VideoSlide).mediaId] ??
                                null
                            }
                            currentTime={playTime / 1000}
                            playing={!!video?.playing}
                        />
                    ) : (
                        <SlidePreview
                            {...slidePreviewProps(
                                current,
                                thumbnails,
                                backgroundUrl,
                            )}
                            {...(currentFullUrl
                                ? { imageUrl: currentFullUrl }
                                : {})}
                        />
                    )}
                    {showVideoStatus && (
                        <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                        >
                            <Tooltip
                                title={
                                    video?.paused
                                        ? t('runModal.resumeVideo')
                                        : t('runModal.pauseVideo')
                                }
                            >
                                <IconButton
                                    size="small"
                                    onClick={
                                        video?.paused
                                            ? onResumeVideo
                                            : onPauseVideo
                                    }
                                    sx={{
                                        backgroundColor:
                                            'rgba(255,255,255,0.06)',
                                    }}
                                >
                                    {video?.paused ? (
                                        <PlayArrowIcon sx={{ fontSize: 18 }} />
                                    ) : (
                                        <PauseIcon sx={{ fontSize: 18 }} />
                                    )}
                                </IconButton>
                            </Tooltip>
                            <LinearProgress
                                variant="determinate"
                                value={progress.percent}
                                sx={{
                                    flexGrow: 1,
                                    height: 4,
                                    borderRadius: 2,
                                }}
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ minWidth: 48, textAlign: 'right' }}
                            >
                                {t('runModal.videoTimeLeft', {
                                    time: formatTime(progress.timeLeft),
                                })}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
                <Tooltip title={t('runModal.next')}>
                    <span>
                        <IconButton
                            onClick={e => onNext(e.shiftKey)}
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
                        onClick={e => onJump(slide.id, e.shiftKey)}
                        sx={{
                            flexShrink: 0,
                            width: 200,
                            cursor: 'pointer',
                            scrollSnapAlign: 'center',
                        }}
                    >
                        <Stack spacing={0.5}>
                            <SlidePreview
                                {...slidePreviewProps(
                                    slide,
                                    thumbnails,
                                    backgroundUrl,
                                )}
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
