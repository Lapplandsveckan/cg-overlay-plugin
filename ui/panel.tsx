import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Box, Breadcrumbs, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Link, Stack, Tab, Tabs, TextField, Tooltip, Typography} from '@mui/material';

// @ts-ignore
import {MediaDropZone, useSocket} from '@web-lib';
import {useTranslation} from './i18n';

import SlidePreview from './slides/SlidePreview';
import RunModal from './slides/RunModal';
import {
    ArmEvent,
    createPresentation,
    playSlide,
    Presentation,
    slideRef,
    stopPlayback,
    useArmEvents,
    usePlaybackState,
    usePresentation,
    usePresentations,
} from './slides/api';
import {slidesEditorUrl, slidesIndexUrl} from './slides/urls';

const RUNDOWN_ITEM_MIME = 'application/x-cg-rundown-item';

// ---------- Drag payload helpers ----------

function setRundownDragPayload(e: React.DragEvent, payload: {type: string; data?: unknown; title?: string}) {
    e.dataTransfer.setData(RUNDOWN_ITEM_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
}

// ============================================================
// Media tab
// ============================================================

interface MediaItem {
    id: string;
    duration: number;
    thumbnailUrl: string | null;
}

function buildThumbnailUrl(clip: any): string | null {
    const background = clip?._attachments?.['thumb.png'];
    if (!background) return null;
    const base64 = btoa(String.fromCharCode(...background.data.data));
    return `data:${background.content_type};base64,${base64}`;
}

function formatDuration(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

interface DraggableClipProps {
    item: MediaItem;
    displayName: string;
}

const DraggableClip: React.FC<DraggableClipProps> = ({item, displayName}) => (
    <Box
        draggable
        onDragStart={e => setRundownDragPayload(e, {
            type: 'play-video',
            data: {clip: item.id, options: {}},
            title: displayName,
        })}
        sx={{
            position: 'relative',
            aspectRatio: '16/9',
            borderRadius: 1,
            overflow: 'hidden',
            backgroundColor: '#1a1c22',
            backgroundImage: item.thumbnailUrl ? `url(${item.thumbnailUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'grab',
            transition: 'border-color 80ms',
            userSelect: 'none',
            '&:hover': {borderColor: '#4a90e2'},
            '&:active': {cursor: 'grabbing'},
        }}
    >
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '4px 6px',
                backgroundColor: 'rgba(0,0,0,0.6)',
            }}
        >
            <Typography
                fontSize={11}
                sx={{color: '#e8eaed', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0}}
                title={displayName}
            >
                {displayName}
            </Typography>
            {item.duration > 0 && (
                <Typography fontSize={10} sx={{color: 'rgba(232,234,237,0.65)', flexShrink: 0, marginLeft: 1}}>
                    {formatDuration(item.duration)}
                </Typography>
            )}
        </Stack>
    </Box>
);

interface FolderTileProps {
    name: string;
    onOpen: () => void;
}

const FolderTile: React.FC<FolderTileProps> = ({name, onOpen}) => (
    <Box
        onClick={onOpen}
        sx={{
            aspectRatio: '16/9',
            borderRadius: 1,
            border: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: '#23252b',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            color: 'text.secondary',
            transition: 'background-color 80ms, border-color 80ms',
            '&:hover': {borderColor: '#4a90e2', backgroundColor: '#2a2d35'},
        }}
    >
        <Box component="span" sx={{fontSize: 22}}>📁</Box>
        <Typography variant="caption" noWrap sx={{maxWidth: '90%'}}>{name}</Typography>
    </Box>
);

const MediaTab: React.FC = () => {
    const {t} = useTranslation('cg-overlay-plugin');
    const socket = useSocket();
    const [allMedia, setAllMedia] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [path, setPath] = useState<string[]>([]);

    useEffect(() => {
        const load = () => socket.caspar
            .getMedia()
            .then((media: Map<string, any>) => setAllMedia([...media.values()]))
            .catch(console.error);

        load();
        socket.caspar.on('media', load);
        return () => void socket.caspar.off('media', load);
    }, []);

    const prefix = path.length ? path.join('/') + '/' : '';
    const trimmedQuery = query.trim().toLowerCase();
    const searching = trimmedQuery.length > 0;

    const {clips, folders} = useMemo(() => {
        const folderSet = new Set<string>();
        const clipList: {item: MediaItem; displayName: string}[] = [];

        for (const media of allMedia) {
            if (!media.id.startsWith(prefix)) continue;
            const remainder = media.id.substring(prefix.length);

            if (searching) {
                if (!media.id.toLowerCase().includes(trimmedQuery)) continue;
                clipList.push({
                    item: {
                        id: media.id,
                        duration: Number(media.mediainfo?.format?.duration) || 0,
                        thumbnailUrl: buildThumbnailUrl(media),
                    },
                    displayName: media.id,
                });
                continue;
            }

            const parts = remainder.split('/');
            if (parts.length > 1) {
                folderSet.add(parts[0]);
                continue;
            }

            clipList.push({
                item: {
                    id: media.id,
                    duration: Number(media.mediainfo?.format?.duration) || 0,
                    thumbnailUrl: buildThumbnailUrl(media),
                },
                displayName: remainder,
            });
        }

        clipList.sort((a, b) => a.displayName.localeCompare(b.displayName));
        return {clips: clipList, folders: [...folderSet].sort()};
    }, [allMedia, prefix, trimmedQuery, searching]);

    const isEmpty = clips.length === 0 && folders.length === 0;

    return (
        <MediaDropZone
            accept={['video/*']}
            overlayLabel={t('panel.dropToUpload')}
            onComplete={(results: {file: File; error?: string}[]) => {
                for (const r of results) {
                    if (r.error) console.error(`Upload failed for ${r.file.name}: ${r.error}`);
                }
            }}
        >
        <Stack spacing={1.5} sx={{padding: 1.5, height: '100%', boxSizing: 'border-box'}}>
            <Stack direction="row" spacing={1.5} alignItems="center">
                {path.length > 0 ? (
                    <Breadcrumbs separator="/" sx={{fontSize: 13, flexGrow: 1, minWidth: 0}}>
                        <Link
                            component="button"
                            underline="hover"
                            color="primary"
                            onClick={() => setPath([])}
                            sx={{fontSize: 13}}
                        >
                            {t('panel.backAll')}
                        </Link>
                        {path.map((segment, idx) => (
                            <Link
                                key={`${segment}-${idx}`}
                                component="button"
                                underline="hover"
                                color={idx === path.length - 1 ? 'text.primary' : 'primary'}
                                onClick={() => setPath(path.slice(0, idx + 1))}
                                sx={{fontSize: 13}}
                            >
                                {segment}
                            </Link>
                        ))}
                    </Breadcrumbs>
                ) : (
                    <Box sx={{flexGrow: 1}} />
                )}
                <TextField
                    size="small"
                    placeholder={t('panel.searchPlaceholder')}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    sx={{width: 220}}
                    InputProps={{
                        endAdornment: query ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setQuery('')}>
                                    <Box component="span" sx={{fontSize: 14, lineHeight: 1}}>×</Box>
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                />
            </Stack>

            <Box sx={{flexGrow: 1, overflowY: 'auto', minHeight: 0}}>
                {isEmpty ? (
                    <Stack alignItems="center" justifyContent="center" sx={{height: '100%', color: 'text.secondary'}}>
                        <Typography variant="body2">
                            {searching ? t('panel.noSearchResults') : t('panel.emptyFolder')}
                        </Typography>
                    </Stack>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: 1,
                        }}
                    >
                        {!searching && folders.map(folder => (
                            <FolderTile
                                key={`folder-${folder}`}
                                name={folder}
                                onOpen={() => setPath([...path, folder])}
                            />
                        ))}
                        {clips.map(({item, displayName}) => (
                            <DraggableClip key={item.id} item={item} displayName={displayName} />
                        ))}
                    </Box>
                )}
            </Box>
        </Stack>
        </MediaDropZone>
    );
};

// ============================================================
// Namnskyltar tab
// ============================================================

interface NamnskyltCardProps {
    name: string;
    onDelete: () => void;
}

const DragHandleIcon: React.FC = () => (
    <Box
        component="svg"
        viewBox="0 0 12 16"
        sx={{width: 12, height: 16, flexShrink: 0, color: 'rgba(232,234,237,0.45)'}}
        aria-hidden
    >
        <g fill="currentColor">
            <circle cx="3" cy="3" r="1.3" />
            <circle cx="9" cy="3" r="1.3" />
            <circle cx="3" cy="8" r="1.3" />
            <circle cx="9" cy="8" r="1.3" />
            <circle cx="3" cy="13" r="1.3" />
            <circle cx="9" cy="13" r="1.3" />
        </g>
    </Box>
);

const NamnskyltCard: React.FC<NamnskyltCardProps> = ({name, onDelete}) => {
    const {t} = useTranslation('cg-overlay-plugin');

    return (
        <Stack
            draggable
            direction="row"
            spacing={1.25}
            alignItems="center"
            onDragStart={e => setRundownDragPayload(e, {
                type: 'namnskylt',
                data: {name},
                title: name,
            })}
            sx={{
                padding: '10px 12px',
                borderRadius: 1,
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: '#23252b',
                cursor: 'grab',
                transition: 'border-color 80ms, background-color 80ms',
                userSelect: 'none',
                minHeight: 44,
                '&:hover': {
                    borderColor: '#4a90e2',
                    backgroundColor: '#2a2d35',
                    '& svg': {color: 'rgba(232,234,237,0.85)'},
                    '& .delete-btn': {opacity: 1},
                },
                '&:active': {cursor: 'grabbing'},
            }}
        >
            <DragHandleIcon />
            <Typography variant="body2" sx={{color: '#e8eaed', flexGrow: 1, minWidth: 0}}>{name}</Typography>
            <Tooltip title={t('panel.removePreset')}>
                <IconButton
                    className="delete-btn"
                    size="small"
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    sx={{
                        opacity: 0,
                        transition: 'opacity 80ms',
                        color: 'rgba(232,234,237,0.65)',
                        padding: 0.25,
                        '&:hover': {color: '#e88c8c', backgroundColor: 'rgba(232,140,140,0.08)'},
                    }}
                >
                    <Box component="span" sx={{fontSize: 16, lineHeight: 1, fontWeight: 300}}>×</Box>
                </IconButton>
            </Tooltip>
        </Stack>
    );
};

const NamnskyltarTab: React.FC = () => {
    const {t} = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [presets, setPresets] = useState<string[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [draftName, setDraftName] = useState('');

    useEffect(() => {
        conn.rawRequest('/api/plugin/lappis/namnskylt-presets', 'GET', {})
            .then((res: any) => setPresets(Array.isArray(res?.data) ? res.data : []))
            .catch(console.error)
            .finally(() => setLoaded(true));
    }, []);

    const sorted = useMemo(() => [...presets].sort((a, b) => a.localeCompare(b)), [presets]);

    const handleAdd = async () => {
        const name = draftName.trim();
        if (!name || presets.includes(name)) {
            setDialogOpen(false);
            setDraftName('');
            return;
        }

        const next = [...presets, name];
        setSaving(true);
        try {
            const res: any = await conn.rawRequest('/api/plugin/lappis/namnskylt-presets', 'UPDATE', next);
            setPresets(Array.isArray(res?.data) ? res.data : next);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
            setDialogOpen(false);
            setDraftName('');
        }
    };

    const handleDelete = async (name: string) => {
        const previous = presets;
        const next = presets.filter(p => p !== name);
        setPresets(next);
        try {
            await conn.rawRequest('/api/plugin/lappis/namnskylt-presets', 'UPDATE', next);
        } catch (err) {
            console.error(err);
            setPresets(previous);
        }
    };

    return (
        <Stack spacing={1.5} sx={{padding: 1.5, height: '100%', boxSizing: 'border-box'}}>
            <Stack direction="row" alignItems="center" justifyContent="flex-end">
                <Button variant="outlined" size="small" onClick={() => setDialogOpen(true)}>
                    {t('panel.addPreset')}
                </Button>
            </Stack>

            <Box sx={{flexGrow: 1, overflowY: 'auto', minHeight: 0}}>
                {!loaded ? null : sorted.length === 0 ? (
                    <Stack alignItems="center" justifyContent="center" sx={{height: '100%', color: 'text.secondary'}}>
                        <Typography variant="body2">{t('panel.noPresets')}</Typography>
                    </Stack>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 1,
                        }}
                    >
                        {sorted.map(name => (
                            <NamnskyltCard
                                key={name}
                                name={name}
                                onDelete={() => handleDelete(name)}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>{t('panel.addPresetTitle')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label={t('panel.nameLabel')}
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        sx={{marginTop: 1}}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving}>{t('panel.cancel')}</Button>
                    <Button variant="contained" onClick={handleAdd} disabled={!draftName.trim() || saving}>
                        {saving ? t('panel.saving') : t('panel.add')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

// ============================================================
// Slides tab + global run modal
// ============================================================

interface PresentationCardProps {
    presentation: Presentation;
}

const PresentationCard: React.FC<PresentationCardProps> = ({presentation}) => {
    const firstSlide = presentation.slides[0];
    return (
        <Box
            draggable
            onDragStart={e => setRundownDragPayload(e, {
                type: 'slides',
                data: {presentationId: presentation.id},
                title: presentation.title,
            })}
            onClick={() => window.location.assign(slidesEditorUrl(presentation.id))}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
                if (e.key === 'Enter') window.location.assign(slidesEditorUrl(presentation.id));
            }}
            sx={{
                cursor: 'grab',
                userSelect: 'none',
                outline: 'none',
                '&:active': {cursor: 'grabbing'},
                '&:hover .pres-title': {color: '#4a90e2'},
                '&:hover .pres-thumb': {borderColor: '#4a90e2'},
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
                        <SlidePreview text={firstSlide.text} reference={slideRef(firstSlide)} />
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
                            Empty
                        </Box>
                    )}
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{paddingLeft: 0.25}}>
                    <Typography
                        className="pres-title"
                        variant="body2"
                        sx={{flexGrow: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e8eaed'}}
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
    const conn = useSocket();
    const {presentations} = usePresentations();
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        setCreating(true);
        try {
            const p = await createPresentation(conn, {title: 'Untitled', slides: []});
            window.location.assign(slidesEditorUrl(p.id));
        } catch (err) {
            console.error(err);
            setCreating(false);
        }
    };

    return (
        <Stack spacing={1.5} sx={{padding: 1.5, height: '100%', boxSizing: 'border-box'}}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                    Drag to add to rundown · Click to edit
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        size="small"
                        component="a"
                        href={slidesIndexUrl()}
                    >
                        Open all
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={handleCreate}
                        disabled={creating}
                    >
                        {creating ? 'Creating…' : '+ New'}
                    </Button>
                </Stack>
            </Stack>

            <Box sx={{flexGrow: 1, overflowY: 'auto', minHeight: 0}}>
                {presentations === null ? null
                    : presentations.length === 0 ? (
                        <Stack alignItems="center" justifyContent="center" sx={{height: '100%', color: 'text.secondary'}}>
                            <Typography variant="body2">No presentations yet.</Typography>
                        </Stack>
                    ) : (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: 1.5,
                            }}
                        >
                            {presentations.map(p => (
                                <PresentationCard key={p.id} presentation={p} />
                            ))}
                        </Box>
                    )}
            </Box>
        </Stack>
    );
};

// ============================================================
// Global run modal — listens for arm events, controls playback
// ============================================================

const GlobalRunModal: React.FC = () => {
    const conn = useSocket();
    const [armedPresentationId, setArmedPresentationId] = useState<string | null>(null);

    const presentation = usePresentation(armedPresentationId);
    const playback = usePlaybackState();

    const onArm = useCallback((event: ArmEvent) => {
        setArmedPresentationId(event.presentationId);
    }, []);
    useArmEvents(onArm);

    // If a slide is playing and the modal is closed (no armed pres), open the
    // modal pointed at the playing presentation so the operator can control it.
    useEffect(() => {
        if (!armedPresentationId && playback?.playing && playback.presentationId) {
            setArmedPresentationId(playback.presentationId);
        }
    }, [armedPresentationId, playback?.playing, playback?.presentationId]);

    const open = !!armedPresentationId;

    return (
        <RunModal
            open={open}
            presentation={presentation ?? null}
            playback={playback}
            onClose={async () => {
                // If actively playing, also stop the overlay on close.
                if (playback?.playing) {
                    try {
                        await stopPlayback(conn);
                    } catch (err) {
                        console.error(err);
                    }
                }
                setArmedPresentationId(null);
            }}
            onStop={async () => {
                try {
                    await stopPlayback(conn);
                } catch (err) {
                    console.error(err);
                }
            }}
            onPlay={async (slideId) => {
                if (!armedPresentationId) return;
                try {
                    await playSlide(conn, armedPresentationId, slideId);
                } catch (err) {
                    console.error(err);
                }
            }}
        />
    );
};

// ============================================================
// Container
// ============================================================

const BottomPanel: React.FC = () => {
    const {t} = useTranslation('cg-overlay-plugin');
    const [tab, setTab] = useState<'media' | 'namnskyltar' | 'slides'>('media');

    return (
        <Stack direction="column" sx={{height: '100%'}}>
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    minHeight: 40,
                    '& .MuiTab-root': {minHeight: 40, textTransform: 'none'},
                }}
            >
                <Tab label={t('panel.mediaTab')} value="media" />
                <Tab label={t('panel.namnskyltarTab')} value="namnskyltar" />
                <Tab label={t('panel.slidesTab')} value="slides" />
            </Tabs>
            <Box sx={{flexGrow: 1, minHeight: 0}}>
                {tab === 'media' && <MediaTab />}
                {tab === 'namnskyltar' && <NamnskyltarTab />}
                {tab === 'slides' && <SlidesTab />}
            </Box>

            <GlobalRunModal />
        </Stack>
    );
};

export default BottomPanel;
