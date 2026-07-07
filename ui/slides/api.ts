// Barrel re-export file for slides API
export {
    type ArmEvent,
    type HeadingSlide,
    type ImageSlide,
    type PlaybackState,
    type Presentation,
    type TextSlide,
    type VideoPlaybackMetadata,
    type VideoSlide,
    type BibleSlide,
    type Slide,
    slideLabel,
    slideRef,
    slideText,
} from './slides-types';

export {
    ROOT,
    type BibleLookup,
    type FetchedVerse,
    createPresentation,
    deletePresentation,
    duplicatePresentation,
    fetchBibleSlides,
    getPlaybackState,
    getPresentation,
    listPresentations,
    pausePlayback,
    playSlide,
    resumePlayback,
    stopPlayback,
    updatePresentation,
} from './slides-crud';

export {
    type ImportJob,
    type ImportStatus,
    getImportJob,
    importJobLabel,
    startImport,
    useImportStatus,
} from './slides-import';

export {
    buildThumbnailUrl,
    useArmEvents,
    useBackgroundImage,
    useFullImage,
    useImageThumbnails,
    usePlaybackState,
    usePresentation,
    usePresentations,
} from './slides-hooks';
