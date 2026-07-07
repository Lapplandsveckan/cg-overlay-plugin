import React, { useEffect, useState } from 'react';
import { LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '../i18n';
import { LiveChip, useOverlayState } from '../overlay-state';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface NamnskyltRundownItemProps {
    entry: RundownEntry;
}

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export const NamnskyltRundownItem: React.FC<NamnskyltRundownItemProps> = ({
    entry,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const state = useOverlayState();
    const isLive =
        !!state?.namnskylt.on &&
        state.namnskylt.name === (entry.data?.name ?? null);

    const { startedAt, totalDuration } = state?.namnskylt ?? {};
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!isLive || !startedAt) return;
        setNow(Date.now());
        const interval = setInterval(() => setNow(Date.now()), 100);
        return () => clearInterval(interval);
    }, [isLive, startedAt]);

    const showProgress = isLive && !!startedAt && !!totalDuration;
    const elapsed = showProgress ? now - startedAt! : 0;
    const remaining = showProgress ? Math.max(0, totalDuration! - elapsed) : 0;
    const progressPct = showProgress
        ? Math.min(100, (elapsed / totalDuration!) * 100)
        : 0;

    return (
        <Stack spacing={0.5}>
            <Stack spacing={1} direction="row" alignItems="center">
                <Typography variant="body1">{t('namnskylt.label')}</Typography>
                {isLive && <LiveChip variant="live" />}
                {showProgress && (
                    <Typography variant="caption" color="text.secondary">
                        {t('namnskylt.timeLeft', {
                            time: formatTime(remaining / 1000),
                        })}
                    </Typography>
                )}
            </Stack>
            {showProgress && (
                <LinearProgress
                    variant="determinate"
                    value={progressPct}
                    sx={{ height: 4, borderRadius: 2 }}
                />
            )}
        </Stack>
    );
};

export default NamnskyltRundownItem;
