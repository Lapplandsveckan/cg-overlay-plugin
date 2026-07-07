import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useSocket, MediaDropZone, UploadButton } from '@web-lib';
import { useTranslation } from '../../i18n';
import { buildThumbnailUrl } from '../api';

const IMAGE_CODECS = new Set([
    'mjpeg',
    'png',
    'bmp',
    'gif',
    'webp',
    'tiff',
    'jpeg',
    'apng',
]);

/** Classifies a CasparCG media item as a still image or a video, or null if unusable. */
function classifyMedia(item: any): 'image' | 'video' | null {
    const streams = item.mediainfo?.streams;
    if (!streams) return null;
    const duration = Number(item.mediainfo?.format?.duration) || 0;
    const hasAudio = streams.some((s: any) => s.codec?.type === 'audio');
    const hasImageCodec = streams.some((s: any) =>
        IMAGE_CODECS.has(s.codec?.name),
    );
    if (!hasAudio && (hasImageCodec || duration === 0)) return 'image';
    return duration > 0 ? 'video' : null;
}

interface MediaPickerProps {
    selectedId: string | null;
    onSelect: (id: string, kind: 'image' | 'video') => void;
}

const MediaPicker: React.FC<MediaPickerProps> = ({ selectedId, onSelect }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [allMedia, setAllMedia] = useState<
        { item: any; kind: 'image' | 'video' }[]
    >([]);
    const [query, setQuery] = useState('');

    useEffect(() => {
        const load = () =>
            (conn as any).caspar
                .getMedia()
                .then((media: Map<string, any>) => {
                    const items: { item: any; kind: 'image' | 'video' }[] = [];
                    for (const item of media.values()) {
                        const kind = classifyMedia(item);
                        if (kind) items.push({ item, kind });
                    }
                    setAllMedia(items);
                })
                .catch(console.error);

        load();
        (conn as any).caspar.on('media', load);
        return () => void (conn as any).caspar.off('media', load);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allMedia;
        return allMedia.filter(m => m.item.id.toLowerCase().includes(q));
    }, [allMedia, query]);

    return (
        <MediaDropZone
            accept={['image/*', 'video/*']}
            overlayLabel={t('presentationEditor.dropToUpload')}
        >
            <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                        size="small"
                        placeholder={t(
                            'presentationEditor.imageSearchPlaceholder',
                        )}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        sx={{ flexGrow: 1 }}
                        InputProps={{
                            endAdornment: query ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setQuery('')}
                                    >
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />
                    <UploadButton
                        label={t('presentationEditor.uploadImage')}
                        multiple
                        types={[
                            {
                                description: 'Media',
                                accept: {
                                    'image/*': [
                                        '.png',
                                        '.jpg',
                                        '.jpeg',
                                        '.gif',
                                        '.bmp',
                                        '.webp',
                                        '.tiff',
                                    ],
                                    'video/*': [
                                        '.mp4',
                                        '.mov',
                                        '.mxf',
                                        '.mkv',
                                        '.webm',
                                    ],
                                },
                            },
                        ]}
                        createUpload={(file: File) =>
                            (conn as any).caspar.uploadMedia(file.name, file)
                        }
                    />
                </Stack>
                <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
                    {filtered.length === 0 ? (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ py: 2, textAlign: 'center' }}
                        >
                            {t('presentationEditor.noImages')}
                        </Typography>
                    ) : (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(auto-fill, minmax(120px, 1fr))',
                                gap: 1,
                            }}
                        >
                            {filtered.map(({ item, kind }) => {
                                const thumbUrl = buildThumbnailUrl(item);
                                const name =
                                    item.id.split('/').pop() ?? item.id;
                                const isSelected = item.id === selectedId;
                                return (
                                    <Box
                                        key={item.id}
                                        onClick={() => onSelect(item.id, kind)}
                                        sx={{
                                            position: 'relative',
                                            aspectRatio: '16/9',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            backgroundColor: '#1a1c22',
                                            backgroundImage: thumbUrl
                                                ? `url(${thumbUrl})`
                                                : undefined,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            border: isSelected
                                                ? '2px solid #4a90e2'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            cursor: 'pointer',
                                            transition: 'border-color 80ms',
                                            '&:hover': {
                                                borderColor: isSelected
                                                    ? '#4a90e2'
                                                    : '#fff',
                                            },
                                        }}
                                    >
                                        {kind === 'video' && (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor:
                                                        'rgba(0,0,0,0.2)',
                                                    pointerEvents: 'none',
                                                }}
                                            >
                                                <PlayArrowIcon
                                                    sx={{
                                                        fontSize: 28,
                                                        color: 'rgba(255,255,255,0.85)',
                                                    }}
                                                />
                                            </Box>
                                        )}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                padding: '3px 5px',
                                                backgroundColor:
                                                    'rgba(0,0,0,0.6)',
                                            }}
                                        >
                                            <Typography
                                                fontSize={10}
                                                noWrap
                                                sx={{ color: '#e8eaed' }}
                                                title={item.id}
                                            >
                                                {name}
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Box>
            </Stack>
        </MediaDropZone>
    );
};

export { MediaPicker, classifyMedia, IMAGE_CODECS };
