import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
    TextField,
} from '@mui/material';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import { useSocket } from '@web-lib';
import { useTranslation } from '../../i18n';
import { MediaPicker } from './MediaPicker';
import SlidePreview from '../SlidePreview';
import { type Slide, useBackgroundImage, useFullImage } from '../api';
import {
    DEFAULT_FPS,
    fullDurationOf,
    isTrimmed,
    normalizeVideoPayload,
} from '../../video-utils';
import { type VideoInspectorValue } from '../../play-video/VideoInspector';
import VideoInspectorModal from '../../play-video/VideoInspectorModal';
import { formatTime } from '../../format';
import { type BroadcastReq, useBroadcast } from '../../hooks';

interface EditSlideDialogProps {
    slide: Slide | null;
    onClose: () => void;
    onSave: (slide: Slide) => void;
}

const EditSlideDialog: React.FC<EditSlideDialogProps> = ({
    slide,
    onClose,
    onSave,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [text, setText] = useState('');
    const [reference, setReference] = useState('');
    const [mediaId, setMediaId] = useState('');
    const [mediaKind, setMediaKind] = useState<'image' | 'video'>('image');
    const [clip, setClip] = useState<any | null>(null);
    const [inspectorOpen, setInspectorOpen] = useState(false);
    const [channelFps, setChannelFps] = useState(DEFAULT_FPS);
    const [trim, setTrim] = useState<VideoInspectorValue>({
        inPoint: 0,
        outPoint: 0,
        volume: 1,
    });
    const outPointExplicit = useRef(false);
    const backgroundUrl = useBackgroundImage();
    const isMedia = slide?.type === 'image' || slide?.type === 'video';
    const isVideo = mediaKind === 'video';
    const selectedImageUrl = useFullImage(isMedia ? mediaId : null);

    useEffect(() => {
        if (!slide) return;
        if (slide.type === 'image' || slide.type === 'video') {
            setMediaId(slide.mediaId);
            setMediaKind(slide.type);
            const video = slide.type === 'video' ? slide : null;
            outPointExplicit.current = video?.outPoint !== undefined;
            setTrim({
                inPoint: video?.inPoint ?? 0,
                outPoint: video?.outPoint ?? 0,
                volume: video?.volume ?? 1,
            });
        } else {
            setText(slide.text);
            setReference(slide.type === 'bible' ? slide.reference : '');
        }
    }, [slide?.id]);

    // Loads the raw CasparCG media item for the selected video, so the
    // inspector can scrub a real <video> and know the full duration.
    useEffect(() => {
        if (!isVideo || !mediaId) {
            setClip(null);
            return;
        }
        (conn as any).caspar
            .getMedia()
            .then((map: Map<string, any>) => setClip(map.get(mediaId) ?? null))
            .catch(console.error);

        const onMedia = (key: string, value: any) => {
            if (key === mediaId && value) setClip(value);
        };
        (conn as any).caspar.on('media', onMedia);
        return () => (conn as any).caspar.off('media', onMedia);
    }, [conn, isVideo, mediaId]);

    useEffect(() => {
        conn.rawRequest('/api/plugin/lappis/videos', 'GET', {})
            .then((res: any) =>
                setChannelFps(normalizeVideoPayload(res.data).channelFps),
            )
            .catch(() => {});
    }, [conn]);
    useBroadcast(
        conn,
        'plugin/lappis/videos',
        'UPDATE',
        useCallback(
            (req: BroadcastReq) =>
                setChannelFps(normalizeVideoPayload(req.data).channelFps),
            [],
        ),
    );

    const fullDuration = fullDurationOf(clip);

    // Untrimmed slides default the out point to the full clip once its
    // duration loads, so the inspector opens edge-to-edge instead of at 0.
    useEffect(() => {
        if (outPointExplicit.current || !fullDuration) return;
        outPointExplicit.current = true;
        setTrim(prev => ({ ...prev, outPoint: fullDuration }));
        // Also depend on clip?.id: a clip swap with an identical duration
        // wouldn't otherwise retrigger this effect.
    }, [fullDuration, clip?.id]);

    const trimmed = outPointExplicit.current && isTrimmed(trim, fullDuration);
    const volumeChanged = trim.volume !== 1;
    const trimRangeValid = trim.outPoint > trim.inPoint;

    const inspectorSummary = [
        trimmed &&
            t('playVideo.trimmedChip', {
                in: formatTime(trim.inPoint),
                out: formatTime(trim.outPoint),
            }),
        volumeChanged &&
            t('playVideo.volumeChip', {
                volume: Math.round(trim.volume * 100),
            }),
    ]
        .filter(Boolean)
        .join(' · ');

    if (!slide) return null;

    const selectMedia = (id: string, kind: 'image' | 'video') => {
        if (id !== mediaId) {
            outPointExplicit.current = false;
            setTrim({ inPoint: 0, outPoint: 0, volume: 1 });
        }
        setMediaId(id);
        setMediaKind(kind);
    };

    const handleSave = () => {
        if (slide.type === 'image' || slide.type === 'video') {
            if (!mediaId) return;
            // Rebuild from just `id` — spreading the old image/video slide
            // would leak its stale inPoint/outPoint/volume through whenever
            // the trim/volume aren't actively set on this save.
            if (mediaKind === 'video') {
                onSave({
                    type: 'video',
                    id: slide.id,
                    mediaId,
                    ...(trimmed && trimRangeValid
                        ? { inPoint: trim.inPoint, outPoint: trim.outPoint }
                        : {}),
                    ...(volumeChanged ? { volume: trim.volume } : {}),
                });
            } else {
                onSave({ type: 'image', id: slide.id, mediaId });
            }
        } else if (slide.type === 'bible') {
            onSave({ ...slide, text, reference });
        } else {
            onSave({ ...slide, text });
        }
    };

    return (
        <Dialog
            open={!!slide}
            onClose={onClose}
            fullWidth
            maxWidth={false}
            PaperProps={{
                component: 'form',
                onSubmit: (e: React.FormEvent) => {
                    e.preventDefault();
                    handleSave();
                },
                sx: { width: 'min(92vw, 1100px)', maxWidth: 'none' },
            }}
        >
            <DialogTitle>{t('presentationEditor.editSlide')}</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ marginTop: 1 }}>
                    {isMedia ? (
                        <>
                            <SlidePreview
                                imageUrl={selectedImageUrl}
                                isVideo={isVideo}
                                videoUrl={
                                    isVideo && clip?.id
                                        ? `/api/caspar/media/raw/${encodeURIComponent(clip.id)}`
                                        : null
                                }
                                inPoint={trim.inPoint}
                                outPoint={trim.outPoint}
                                volume={trim.volume}
                            />
                            {isVideo && clip && (
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1.5}
                                >
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ flexGrow: 1, minWidth: 0 }}
                                        noWrap
                                    >
                                        {inspectorSummary ||
                                            t('playVideo.noTrim')}
                                    </Typography>
                                    <Button
                                        type="button"
                                        size="small"
                                        variant="outlined"
                                        startIcon={
                                            <ContentCutIcon
                                                sx={{ fontSize: 16 }}
                                            />
                                        }
                                        onClick={() => setInspectorOpen(true)}
                                        sx={{ flexShrink: 0 }}
                                    >
                                        {t('playVideo.openInspector')}
                                    </Button>
                                </Stack>
                            )}
                            <MediaPicker
                                selectedId={mediaId}
                                onSelect={selectMedia}
                            />
                        </>
                    ) : (
                        <>
                            <SlidePreview
                                text={text}
                                reference={reference}
                                heading={slide.type === 'heading'}
                                backgroundUrl={backgroundUrl}
                            />

                            {slide.type === 'bible' && (
                                <TextField
                                    label={t(
                                        'presentationEditor.referenceLabel',
                                    )}
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    fullWidth
                                />
                            )}

                            <TextField
                                label={t('presentationEditor.textLabel')}
                                value={text}
                                onChange={e => setText(e.target.value)}
                                multiline
                                minRows={4}
                                fullWidth
                            />
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button type="button" onClick={onClose}>
                    {t('panel.cancel')}
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    disabled={isMedia && !mediaId}
                >
                    {t('presentationEditor.save')}
                </Button>
            </DialogActions>
            {isVideo && (
                <VideoInspectorModal
                    open={inspectorOpen}
                    onClose={() => setInspectorOpen(false)}
                    clip={clip}
                    value={trim}
                    onChange={setTrim}
                    fps={channelFps}
                />
            )}
        </Dialog>
    );
};

export { EditSlideDialog };
