import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputAdornment,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { noTryAsync } from 'no-try';
import { useSocket, useContextMenu } from '@web-lib';
import { useTranslation } from './i18n';
import { setRundownDragPayload } from './drag';

const DragHandleIcon: React.FC = () => (
    <Box
        component="svg"
        viewBox="0 0 12 16"
        sx={{
            width: 12,
            height: 16,
            flexShrink: 0,
            color: 'rgba(232,234,237,0.45)',
        }}
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

interface NamnskyltCardProps {
    name: string;
    onEdit: () => void;
    onDelete: () => void;
    onPlay: () => void;
}

const NamnskyltCard: React.FC<NamnskyltCardProps> = ({
    name,
    onEdit,
    onDelete,
    onPlay,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const menu = useContextMenu();

    const menuItems = [
        {
            label: t('panel.playPreset'),
            icon: <PlayArrowIcon sx={{ fontSize: 18 }} />,
            onClick: onPlay,
        },
        {
            label: t('panel.editPreset'),
            icon: <EditIcon sx={{ fontSize: 18 }} />,
            onClick: onEdit,
        },
        {
            label: t('panel.deletePreset'),
            icon: <DeleteIcon sx={{ fontSize: 18 }} />,
            danger: true,
            divider: true,
            onClick: onDelete,
        },
    ];

    return (
        <Stack
            draggable
            direction="row"
            spacing={1.25}
            alignItems="center"
            onDragStart={e =>
                setRundownDragPayload(e, {
                    type: 'namnskylt',
                    data: { name },
                    title: name,
                    immediate: true,
                })
            }
            onClick={onEdit}
            onContextMenu={menu.bind(menuItems)}
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
                    '& svg': { color: 'rgba(232,234,237,0.85)' },
                },
                '&:active': { cursor: 'grabbing' },
            }}
        >
            <DragHandleIcon />
            <Typography
                variant="body2"
                sx={{ color: '#e8eaed', flexGrow: 1, minWidth: 0 }}
            >
                {name}
            </Typography>
        </Stack>
    );
};

const NamnskyltarTab: React.FC = () => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [presets, setPresets] = useState<string[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [draftName, setDraftName] = useState('');
    const [editingName, setEditingName] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        conn.rawRequest('/api/plugin/lappis/namnskylt-presets', 'GET', {})
            .then((res: any) => setPresets(Array.isArray(res) ? res : []))
            .catch(console.error)
            .finally(() => setLoaded(true));
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return [...presets]
            .filter(name => !q || name.toLowerCase().includes(q))
            .sort((a, b) => a.localeCompare(b));
    }, [presets, query]);

    const openAdd = () => {
        setEditingName(null);
        setDraftName('');
        setDialogOpen(true);
    };

    const openEdit = (name: string) => {
        setEditingName(name);
        setDraftName(name);
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setDraftName('');
        setEditingName(null);
    };

    const handleSave = async () => {
        const name = draftName.trim();
        if (!name) {
            closeDialog();
            return;
        }

        let next: string[];
        if (editingName === null) {
            // Add mode
            if (presets.includes(name)) {
                closeDialog();
                return;
            }
            next = [...presets, name];
        } else {
            // Edit mode — no-op if unchanged or conflicts with existing
            if (name === editingName) {
                closeDialog();
                return;
            }
            if (presets.includes(name)) {
                closeDialog();
                return;
            }
            next = presets.map(p => (p === editingName ? name : p));
        }

        setSaving(true);
        const [err, res] = await noTryAsync<any>(() =>
            conn.rawRequest(
                '/api/plugin/lappis/namnskylt-presets',
                'UPDATE',
                next,
            ),
        );
        if (err) console.error(err);
        else setPresets(Array.isArray(res) ? res : next);
        setSaving(false);
        closeDialog();
    };

    const handleDelete = async (name: string) => {
        const previous = presets;
        const next = presets.filter(p => p !== name);
        setPresets(next);
        const [err] = await noTryAsync(() =>
            conn.rawRequest(
                '/api/plugin/lappis/namnskylt-presets',
                'UPDATE',
                next,
            ),
        );
        if (err) {
            console.error(err);
            setPresets(previous);
        }
    };

    const handlePlay = (name: string) => {
        conn.rawRequest('/api/plugin/lappis/namnskylt-presets/play', 'ACTION', {
            name,
        }).catch(console.error);
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
                gap={1}
            >
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ minWidth: 0, flexShrink: 1 }}
                    noWrap
                >
                    {t('panel.namnskyltarHint')}
                </Typography>
                <Stack
                    direction="row"
                    alignItems="center"
                    gap={1}
                    flexShrink={0}
                >
                    <TextField
                        size="small"
                        placeholder={t('panel.searchNamnskyltar')}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        sx={{ width: 200 }}
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
                    <Button variant="outlined" size="small" onClick={openAdd}>
                        {t('panel.addPreset')}
                    </Button>
                </Stack>
            </Stack>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
                {!loaded ? null : filtered.length === 0 ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{ height: '100%', color: 'text.secondary' }}
                    >
                        <Typography variant="body2">
                            {t(
                                query.trim()
                                    ? 'panel.noNamnskyltarResults'
                                    : 'panel.noPresets',
                            )}
                        </Typography>
                    </Stack>
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: 1,
                        }}
                    >
                        {filtered.map(name => (
                            <NamnskyltCard
                                key={name}
                                name={name}
                                onEdit={() => openEdit(name)}
                                onDelete={() => handleDelete(name)}
                                onPlay={() => handlePlay(name)}
                            />
                        ))}
                    </Box>
                )}
            </Box>

            <Dialog
                open={dialogOpen}
                onClose={closeDialog}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>
                    {editingName !== null
                        ? t('panel.editPresetTitle')
                        : t('panel.addPresetTitle')}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label={t('panel.nameLabel')}
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        sx={{ marginTop: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog} disabled={saving}>
                        {t('panel.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={!draftName.trim() || saving}
                    >
                        {saving
                            ? t('panel.saving')
                            : editingName !== null
                              ? t('panel.save')
                              : t('panel.add')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

export default NamnskyltarTab;
