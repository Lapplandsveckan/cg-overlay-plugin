export interface BibleSlide {
    type: 'bible';
    id: string;
    text: string;
    reference: string;
    translation: string;
    book: string;
    chapter: number;
    verse: number;
}

export interface TextSlide {
    type: 'text';
    id: string;
    text: string;
}

export interface HeadingSlide {
    type: 'heading';
    id: string;
    text: string;
}

export interface ImageSlide {
    type: 'image';
    id: string;
    mediaId: string;
}

export interface VideoSlide {
    type: 'video';
    id: string;
    mediaId: string;
    inPoint?: number;
    outPoint?: number;
    volume?: number;
}

export type Slide =
    | BibleSlide
    | TextSlide
    | HeadingSlide
    | ImageSlide
    | VideoSlide;

export interface Presentation {
    id: string;
    title: string;
    slides: Slide[];
    createdAt: number;
    updatedAt: number;
}

export interface VideoPlaybackMetadata {
    playing: boolean;
    paused: boolean;
    clipDuration: number;
    playDuration: number;
}

export interface PlaybackState {
    playing: boolean;
    presentationId: string | null;
    slideId: string | null;
    video?: VideoPlaybackMetadata;
}

export interface ArmEvent {
    presentationId: string;
    rundownId: string | null;
    ts: number;
}

/** Returns the reference string for a slide, or '' for non-bible slides. */
export function slideRef(slide: Slide): string {
    return slide.type === 'bible' ? slide.reference : '';
}

/** Returns the display text for a slide, or '' for image/video slides. */
export function slideText(slide: Slide): string {
    return slide.type === 'image' || slide.type === 'video' ? '' : slide.text;
}

/** Short label for a slide: its reference for bible slides, 'Image'/'Video' for media slides, 'Text' otherwise. */
export function slideLabel(slide: Slide): string {
    if (slide.type === 'bible') return slide.reference;
    if (slide.type === 'image') return 'Image';
    if (slide.type === 'video') return 'Video';
    if (slide.type === 'heading') return 'Heading';
    return 'Text';
}
