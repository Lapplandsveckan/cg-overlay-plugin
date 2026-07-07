import React from 'react';
import { MediaPicker } from './MediaPicker';

interface VideoSlideSectionProps {
    onMediaSelect: (mediaId: string, kind: 'video' | 'image') => void;
}

const VideoSlideSection: React.FC<VideoSlideSectionProps> = ({
    onMediaSelect,
}) => <MediaPicker selectedId={null} onSelect={onMediaSelect} />;

export { VideoSlideSection };
