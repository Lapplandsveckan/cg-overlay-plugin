import React, { useCallback, useState } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { useSocket } from '@web-lib';
import { useTranslation } from '../i18n';

import {
    type ArmEvent,
    playSlide,
    slideRef,
    stopPlayback,
    useArmEvents,
    usePlaybackState,
    usePresentation,
} from './api';
import RunModal from './RunModal';

interface RundownEntry {
    id: string;
    title: string;
    data: any;
    type?: string;
}

interface SlidesRundownItemProps {
    entry: RundownEntry;
}

export const SlidesRundownItem: React.FC<SlidesRundownItemProps> = ({
    entry,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const presentationId: string | null = entry.data?.presentationId ?? null;
    const presentation = usePresentation(presentationId);
    const playback = usePlaybackState();
    const [armed, setArmed] = useState(false);

    const playingHere = !!(
        playback?.playing &&
        presentationId &&
        playback.presentationId === presentationId
    );

    const onArm = useCallback(
        (event: ArmEvent) => {
            // Arming any entry closes other entries' modals so only one is open.
            setArmed(event.rundownId === entry.id);
        },
        [entry.id],
    );
    useArmEvents(onArm);

    const displayContent = (() => {
        if (!presentationId) {
            return (
                <Chip
                    label={t('slides.noPresentation')}
                    size="small"
                    color="warning"
                    variant="outlined"
                />
            );
        }
        if (presentation === undefined) {
            return (
                <Typography variant="caption" color="text.secondary">
                    {t('slides.loading')}
                </Typography>
            );
        }
        if (presentation === null) {
            return (
                <Chip
                    label={t('slides.presentationMissing')}
                    size="small"
                    color="error"
                    variant="outlined"
                />
            );
        }

        const slideCount = presentation.slides.length;
        const firstRef = slideCount > 0 ? slideRef(presentation.slides[0]) : '';
        const lastRef =
            slideCount > 1 ? slideRef(presentation.slides[slideCount - 1]) : '';

        return (
            <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                        label={t('slides.slideCount', { count: slideCount })}
                        size="small"
                        variant="outlined"
                    />
                    {playingHere && (
                        <Chip
                            label={t('slides.live')}
                            size="small"
                            color="error"
                        />
                    )}
                </Stack>
                {firstRef && (
                    <Typography variant="caption" color="text.secondary">
                        {firstRef}
                        {lastRef && lastRef !== firstRef && <> — {lastRef}</>}
                    </Typography>
                )}
            </Stack>
        );
    })();

    return (
        <>
            {displayContent}
            <RunModal
                open={armed}
                presentation={presentation ?? null}
                playback={playback}
                onClose={() => {
                    setArmed(false);
                }}
                onStop={() => {
                    stopPlayback(conn).catch(console.error);
                }}
                onPlay={(slideId, grabAttention) => {
                    if (!presentationId) return;
                    playSlide(
                        conn,
                        presentationId,
                        slideId,
                        grabAttention,
                    ).catch(console.error);
                }}
            />
        </>
    );
};

export default SlidesRundownItem;
