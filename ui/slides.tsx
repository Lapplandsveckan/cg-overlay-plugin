import React, { useMemo, useState } from 'react';
import {
    Box,
    Button,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { noTryAsync } from 'no-try';
import { useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import { setRundownDragPayload } from './drag';
import SlidePreview from './slides/SlidePreview';
import {
    createPresentation,
    type Presentation,
    slideRef,
    slideText,
    useBackgroundImage,
    useImageThumbnails,
    usePresentations,
} from './slides/api';
import { currentPath, slidesEditorUrl, slidesHomeUrl } from './slides/urls';

interface PresentationCardProps {
    presentation: Presentation;
}

const PresentationCard: React.FC<PresentationCardProps> = ({
    presentation,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const firstSlide = presentation.slides[0];
    const backgroundUrl = useBackgroundImage();
    const coverMediaIds =
        firstSlide?.type === 'image' ? [firstSlide.mediaId] : [];
    const coverThumbs = useImageThumbnails(coverMediaIds);
    return (
        <Box
            draggable
            onDragStart={e =>
                setRundownDragPayload(e, {
                    type: 'slides',
                    data: { presentationId: presentation.id },
                    title: presentation.title,
                })
            }
            onClick={() => {
                window.location.assign(
                    slidesEditorUrl(presentation.id, currentPath()),
                );
            }}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
                if (e.key === 'Enter') {
                    window.location.assign(
                        slidesEditorUrl(presentation.id, currentPath()),
                    );
                }
            }}
            sx={{
                cursor: 'grab',
                userSelect: 'none',
                outline: 'none',
                '&:active': { cursor: 'grabbing' },
                '&:hover .pres-title': { color: '#4a90e2' },
                '&:hover .pres-thumb': { borderColor: '#4a90e2' },
            }}
        >
            <Stack spacing={0.75}>
                <Box
                    className="pres-thumb"
                    sx={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 1,
                        overflow: 'hidden',
                        transition: 'border-color 80ms',
                    }}
                >
                    {firstSlide ? (
                        firstSlide.type === 'image' ? (
                            <SlidePreview
                                imageUrl={
                                    coverThumbs[firstSlide.mediaId] ?? null
                                }
                            />
                        ) : (
                            <SlidePreview
                                text={slideText(firstSlide)}
                                reference={slideRef(firstSlide)}
                                backgroundUrl={backgroundUrl}
                            />
                        )
                    ) : (
                        <Box
                            sx={{
                                aspectRatio: '16/9',
                                backgroundColor: '#000',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.35)',
                                fontSize: 12,
                                fontStyle: 'italic',
                            }}
                        >
                            {t('panel.emptySlide')}
                        </Box>
                    )}
                </Box>
                <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ paddingLeft: 0.25 }}
                >
                    <Typography
                        className="pres-title"
                        variant="body2"
                        sx={{
                            flexGrow: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#e8eaed',
                        }}
                    >
                        {presentation.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {presentation.slides.length}
                    </Typography>
                </Stack>
            </Stack>
        </Box>
    );
};

const SlidesTab: React.FC = () => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const { presentations } = usePresentations();
    const [creating, setCreating] = useState(false);
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!presentations) return [];
        return presentations.filter(
            p => !q || p.title.toLowerCase().includes(q),
        );
    }, [presentations, query]);

    const handleCreate = async () => {
        setCreating(true);
        const [err, p] = await noTryAsync(() =>
            createPresentation(conn, { title: 'Untitled', slides: [] }),
        );
        if (err) {
            console.error(err);
            setCreating(false);
            return;
        }
        window.location.assign(slidesEditorUrl(p!.id, currentPath()));
    };

    return (
        <Stack
            spacing={1.5}
            sx={{ padding: 1.5, height: '100%', boxSizing: 'border-box' }}
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
            >
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ minWidth: 0 }}
                    noWrap
                >
                    {t('panel.slidesHint')}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <TextField
                        size="small"
                        placeholder={t('panel.search')}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        sx={{ width: 160 }}
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
                    <Button
                        variant="outlined"
                        size="small"
                        component="a"
                        href={slidesHomeUrl()}
                    >
                        {t('panel.openAll')}
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleCreate}
                        disabled={creating}
                    >
                        {creating
                            ? t('panel.creating')
                            : t('panel.newPresentation')}
                    </Button>
                </Stack>
            </Stack>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
                {presentations === null ? null : presentations.length === 0 ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{ height: '100%', color: 'text.secondary' }}
                    >
                        <Typography variant="body2">
                            {t('panel.noPresentations')}
                        </Typography>
                    </Stack>
                ) : filtered.length === 0 ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{ height: '100%', color: 'text.secondary' }}
                    >
                        <Typography variant="body2">
                            {t('panel.noResults')}
                        </Typography>
                    </Stack>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 1.5,
                        }}
                    >
                        {filtered.map(p => (
                            <PresentationCard key={p.id} presentation={p} />
                        ))}
                    </Box>
                )}
            </Box>
        </Stack>
    );
};

export default SlidesTab;
