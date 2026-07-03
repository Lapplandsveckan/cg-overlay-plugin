import React, { useCallback, useEffect, useState } from 'react';
import { Chip } from '@mui/material';
import { useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import { type BroadcastReq, useBroadcast } from './hooks';

const ROOT = '/api/plugin/lappis';

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
            .then((res: any) => setState(prev => prev ?? res?.data ?? null))
            .catch(console.error);
    }, [conn]);

    const onUpdate = useCallback(
        (req: BroadcastReq) => setState(req.data ?? null),
        [],
    );
    useBroadcast(conn, 'plugin/lappis/overlay-state', 'UPDATE', onUpdate);

    return state;
}

export interface VideoPlayback {
    currentClip: string | null;
    queued: Set<string>;
    current: {
        playDuration: number;
        clipDuration: number | null;
        loop: boolean;
    } | null;
}

function parseVideoData(data: any): VideoPlayback {
    if (!data) return { currentClip: null, queued: new Set(), current: null };
    const currentClip: string | null = data.current?.data?.id ?? null;
    const queued = new Set<string>(
        ((data.queue ?? []) as any[]).map(v => v?.data?.id).filter(Boolean),
    );
    const metadata = data.current?.metadata;
    const current = metadata
        ? {
              playDuration: metadata.playDuration ?? 0,
              clipDuration:
                  typeof metadata.clipDuration === 'number'
                      ? metadata.clipDuration
                      : null,
              loop: metadata.loop ?? false,
          }
        : null;
    return { currentClip, queued, current };
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
                        : parseVideoData(res?.data),
                ),
            )
            .catch(console.error);
    }, [conn]);

    const onUpdate = useCallback(
        (req: BroadcastReq) => setPlayback(parseVideoData(req.data)),
        [],
    );
    useBroadcast(conn, 'plugin/lappis/videos', 'UPDATE', onUpdate);

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
