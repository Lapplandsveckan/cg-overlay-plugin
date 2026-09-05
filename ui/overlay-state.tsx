import React, { useEffect, useState } from 'react';
import { Chip } from '@mui/material';
import { Method, useBroadcast, useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import { normalizeVideoPayload } from './video-utils';
import { topic, videosTopic } from './broadcast-topics';

const ROOT = '/api/plugin/lappis';

const overlayStateTopic = topic<OverlayState | null>(
    'plugin/lappis/overlay-state',
    Method.UPDATE,
);

export interface OverlayState {
    bars: boolean;
    caption: boolean;
    swish: { on: boolean; number: string };
    insamling: boolean;
    namnskylt: {
        on: boolean;
        name: string | null;
        startedAt: number | null;
        totalDuration: number | null;
    };
}

export function useOverlayState(): OverlayState | null {
    const conn = useSocket();
    const [state, setState] = useState<OverlayState | null>(null);

    useEffect(() => {
        if (!conn) return;
        conn.rawRequest(`${ROOT}/overlay-state`, 'GET', {})
            // Only apply the GET result if no broadcast has arrived yet.
            .then((res: any) => setState(prev => prev ?? res ?? null))
            .catch(console.error);
    }, [conn]);

    useBroadcast(overlayStateTopic, data => setState(data ?? null));

    return state;
}

export interface VideoPlayback {
    currentClip: string | null;
    queued: Set<string>;
    current: {
        elapsedSec: number;
        durationSec: number | null;
        loop: boolean;
    } | null;
}

function parseVideoData(data: any): VideoPlayback {
    const { current, queue } = normalizeVideoPayload(data);
    return {
        currentClip: current?.clipId ?? null,
        queued: new Set(queue.map(v => v.clipId).filter(Boolean) as string[]),
        current: current
            ? {
                  elapsedSec: current.elapsedSec,
                  durationSec: current.durationSec || null,
                  loop: current.loop,
              }
            : null,
    };
}

export function useVideoPlayback(): VideoPlayback {
    const conn = useSocket();
    const [playback, setPlayback] = useState<VideoPlayback>({
        currentClip: null,
        queued: new Set(),
        current: null,
    });

    useEffect(() => {
        if (!conn) return;
        conn.rawRequest(`${ROOT}/videos`, 'GET', {})
            // Only apply the GET result if no broadcast has arrived yet.
            .then((res: any) =>
                setPlayback(prev =>
                    prev.currentClip !== null || prev.queued.size > 0
                        ? prev
                        : parseVideoData(res),
                ),
            )
            .catch(console.error);
    }, [conn]);

    useBroadcast(videosTopic, data => setPlayback(parseVideoData(data)));

    return playback;
}

export const LiveChip: React.FC<{ variant: 'live' | 'queued' }> = ({
    variant,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    return (
        <Chip
            label={t(variant === 'live' ? 'common.live' : 'common.queued')}
            size="small"
            color={variant === 'live' ? 'error' : 'default'}
            variant={variant === 'live' ? 'filled' : 'outlined'}
        />
    );
};
