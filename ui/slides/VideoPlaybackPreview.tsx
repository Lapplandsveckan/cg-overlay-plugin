import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

export interface VideoPlaybackPreviewProps {
    mediaId: string;
    poster?: string | null;
    /** Authoritative elapsed time (seconds) from the backend, interpolated by the caller. */
    currentTime: number;
    playing: boolean;
}

// How far the preview's native playback clock may drift from the
// authoritative `currentTime` before we hard-correct it. Keeps the preview
// smooth (native <video> playback) while staying locked to the real timeline.
const DRIFT_THRESHOLD_SEC = 0.3;

export const VideoPlaybackPreview: React.FC<VideoPlaybackPreviewProps> = ({
    mediaId,
    poster,
    currentTime,
    playing,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (Math.abs(video.currentTime - currentTime) > DRIFT_THRESHOLD_SEC)
            video.currentTime = currentTime;
        // Also re-apply after a clip switch remounts the <video> element below.
    }, [currentTime, mediaId]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (playing) video.play().catch(() => {});
        else video.pause();
        // Also re-apply after a clip switch remounts the <video> element below.
    }, [playing, mediaId]);

    return (
        <Box
            sx={{
                position: 'relative',
                aspectRatio: '16/9',
                width: '100%',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: '#000',
                border: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            {/* Remounts on clip change so a stale frame never lingers under the new src. */}
            <video
                key={mediaId}
                ref={videoRef}
                src={`/api/caspar/media/raw/${encodeURIComponent(mediaId)}`}
                poster={poster ?? undefined}
                muted
                preload="metadata"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                }}
            />
        </Box>
    );
};

export default VideoPlaybackPreview;
