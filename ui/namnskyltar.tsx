import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import { noTryAsync } from 'no-try';
import { useSocket } from '@web-lib';
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
    onDelete: () => void;
}

const NamnskyltCard: React.FC<NamnskyltCardProps> = ({ name, onDelete }) => {
    const { t } = useTranslation('cg-overlay-plugin');

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
                })
            }
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
                    '& .delete-btn': { opacity: 1 },
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
                        '&:hover': {
                            color: '#e88c8c',
                            backgroundColor: 'rgba(232,140,140,0.08)',
                        },
                    }}
                >
                    <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </Tooltip>
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

    useEffect(() => {
        conn.rawRequest('/api/plugin/lappis/namnskylt-presets', 'GET', {})
            .then((res: any) =>
                setPresets(Array.isArray(res?.data) ? res.data : []),
            )
            .catch(console.error)
            .finally(() => setLoaded(true));
    }, []);

    const sorted = useMemo(
        () => [...presets].sort((a, b) => a.localeCompare(b)),
        [presets],
    );

    const handleAdd = async () => {
        const name = draftName.trim();
        if (!name || presets.includes(name)) {
            setDialogOpen(false);
            setDraftName('');
            return;
        }

        const next = [...presets, name];
        setSaving(true);
        const [err, res] = await noTryAsync<any>(() =>
            conn.rawRequest(
                '/api/plugin/lappis/namnskylt-presets',
                'UPDATE',
                next,
            ),
        );
        if (err) console.error(err);
        else setPresets(Array.isArray(res?.data) ? res.data : next);
        setSaving(false);
        setDialogOpen(false);
        setDraftName('');
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
                    {t('panel.namnskyltarHint')}
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setDialogOpen(true)}
                >
                    {t('panel.addPreset')}
                </Button>
            </Stack>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
                {!loaded ? null : sorted.length === 0 ? (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        sx={{ height: '100%', color: 'text.secondary' }}
                    >
                        <Typography variant="body2">
                            {t('panel.noPresets')}
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

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle>{t('panel.addPresetTitle')}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label={t('panel.nameLabel')}
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        sx={{ marginTop: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDialogOpen(false)}
                        disabled={saving}
                    >
                        {t('panel.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleAdd}
                        disabled={!draftName.trim() || saving}
                    >
                        {saving ? t('panel.saving') : t('panel.add')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Stack>
    );
};

export default NamnskyltarTab;
