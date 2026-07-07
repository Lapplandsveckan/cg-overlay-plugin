import { type VideoEffectOptions } from './effects/misc/video';

export type VideoPlayoutOptions = Pick<
    VideoEffectOptions,
    'loop' | 'seekSec' | 'lengthSec' | 'volume'
>;

// 'regular'/'fast' show the beratta-om banner (ATEM hard-cuts behind it);
// 'cut'/'fade' skip the banner and drive the transition on the ATEM directly.
export type VideoIntroMode = 'regular' | 'fast' | 'fade' | 'cut';
export type VideoOutroMode = 'fade' | 'cut';

export interface PresentationVideoMetadata {
    playing: boolean;
    paused: boolean;
    clipDuration: number;
    playDuration: number;
}

export interface PresentationPlaybackState {
    playing: boolean;
    presentationId: string | null;
    slideId: string | null;
    video?: PresentationVideoMetadata;
}

export interface PresentationArmEvent {
    presentationId: string;
    rundownId: string | null;
    ts: number;
}

export type SlideRender =
    | { kind: 'text'; text: string; reference: string; heading?: boolean }
    | { kind: 'image'; mediaId: string }
    | {
          kind: 'video';
          mediaId: string;
          inPoint?: number;
          outPoint?: number;
          volume?: number;
      };

export interface Recyclable {
    base: string;
    rebuild: () => void;
    isOnAir: () => boolean;
    replay: () => void;
    lastUsed: number;
    attempts: number;
    recycling: boolean;
}
