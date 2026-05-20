import React, {useEffect, useMemo, useState} from 'react';
import {Box, Breadcrumbs, IconButton, InputAdornment, Link, Stack, TextField, Typography} from '@mui/material';

// @ts-ignore
import {useSocket} from '@web-lib';

const RUNDOWN_ITEM_MIME = 'application/x-cg-rundown-item';

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

const DraggableClip: React.FC<DraggableClipProps> = ({item, displayName}) => {
    const onDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData(RUNDOWN_ITEM_MIME, JSON.stringify({
            type: 'play-video',
            data: {clip: item.id, options: {}},
            title: displayName,
        }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <Box
            draggable
            onDragStart={onDragStart}
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
                transition: 'transform 80ms, border-color 80ms',
                userSelect: 'none',
                '&:hover': {
                    borderColor: 'rgba(74,144,226,0.6)',
                    transform: 'translateY(-1px)',
                },
                '&:active': {
                    cursor: 'grabbing',
                },
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
                    sx={{
                        color: '#e8eaed',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                    }}
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
};

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
            '&:hover': {
                borderColor: 'rgba(74,144,226,0.6)',
                backgroundColor: '#2a2d35',
            },
        }}
    >
        <Box component="span" sx={{fontSize: 22}}>📁</Box>
        <Typography variant="caption" noWrap sx={{maxWidth: '90%'}}>{name}</Typography>
    </Box>
);

const PlayVideoBottomPanel: React.FC = () => {
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
        <Stack spacing={1.5} sx={{padding: 1.5, height: '100%', boxSizing: 'border-box'}}>
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Breadcrumbs separator="/" sx={{fontSize: 13, flexGrow: 1, minWidth: 0}}>
                    <Link
                        component="button"
                        underline="hover"
                        color={path.length ? 'primary' : 'text.primary'}
                        onClick={() => setPath([])}
                        sx={{fontSize: 13}}
                    >
                        Media
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
                <TextField
                    size="small"
                    placeholder="Search all clips…"
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
                            {searching ? 'No clips match your search.' : 'No clips in this folder.'}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                            Drag a clip onto the rundown to add a Play video entry.
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
    );
};

export default PlayVideoBottomPanel;
