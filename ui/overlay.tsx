import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Collapse,
    FormControlLabel,
    IconButton,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Method, useBroadcast, useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import { topic } from './broadcast-topics';
import VideoQueue from './video';
import ActiveRundownSelector from './active-rundown';

interface DiagEvent {
    level: 'error' | 'warn' | 'health';
    scope: string;
    message: string;
    time: number;
}

const LEVEL_COLORS: Record<DiagEvent['level'], 'error' | 'warning' | 'info'> = {
    error: 'error',
    warn: 'warning',
    health: 'warning',
};

const diagnosticsTopic = topic<DiagEvent>(
    'plugin/lappis/diagnostics',
    Method.UPDATE,
);

function DiagnosticsPanel() {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [open, setOpen] = useState(false);
    const [events, setEvents] = useState<DiagEvent[]>([]);

    // Backfill on mount + subscribe to live updates
    useEffect(() => {
        if (!conn) return;

        conn.rawRequest('diagnostics', 'GET', null)
            .then((res: any) => {
                if (Array.isArray(res?.events))
                    setEvents(prev => {
                        // Merge backfill with any live events that arrived
                        // during the fetch — keep live events not in backfill.
                        const backfillKeys = new Set(
                            (res.events as DiagEvent[]).map(
                                e => `${e.time}:${e.message}`,
                            ),
                        );
                        const liveOnly = prev.filter(
                            e => !backfillKeys.has(`${e.time}:${e.message}`),
                        );
                        const merged = [...res.events, ...liveOnly].sort(
                            (a: DiagEvent, b: DiagEvent) => a.time - b.time,
                        );
                        return merged.length > 50
                            ? merged.slice(merged.length - 50)
                            : merged;
                    });
            })
            .catch(() => {});
    }, [conn]);

    useBroadcast(diagnosticsTopic, event => {
        setEvents(prev => {
            const next = [...prev, event];
            return next.length > 50 ? next.slice(next.length - 50) : next;
        });
    });

    const errorCount = events.filter(e => e.level === 'error').length;
    const healthCount = events.filter(e => e.level === 'health').length;

    return (
        <Box sx={{ mt: 3 }}>
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setOpen(o => !o)}
            >
                <Typography
                    variant="subtitle2"
                    sx={{ color: 'text.secondary' }}
                >
                    {t('diagnostics.heading')}
                </Typography>
                {errorCount > 0 && (
                    <Chip
                        label={t('diagnostics.errorCount', {
                            count: errorCount,
                        })}
                        color="error"
                        size="small"
                    />
                )}
                {healthCount > 0 && (
                    <Chip
                        label={t('diagnostics.healthCount', {
                            count: healthCount,
                        })}
                        color="warning"
                        size="small"
                    />
                )}
                <IconButton size="small" sx={{ ml: 'auto' }}>
                    {open ? (
                        <ExpandLessIcon sx={{ fontSize: 18 }} />
                    ) : (
                        <ExpandMoreIcon sx={{ fontSize: 18 }} />
                    )}
                </IconButton>
            </Stack>

            <Collapse in={open}>
                <Box
                    sx={{
                        mt: 1,
                        maxHeight: 280,
                        overflowY: 'auto',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                    }}
                >
                    {events.length === 0 ? (
                        <Typography
                            variant="body2"
                            sx={{ p: 2, color: 'text.secondary' }}
                        >
                            {t('diagnostics.empty')}
                        </Typography>
                    ) : (
                        [...events].reverse().map((ev, i) => (
                            <Stack
                                key={`${ev.time}-${ev.scope}-${i}`}
                                direction="row"
                                spacing={1}
                                alignItems="baseline"
                                sx={{
                                    px: 1.5,
                                    py: 0.75,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    '&:last-child': { borderBottom: 0 },
                                }}
                            >
                                <Chip
                                    label={ev.scope}
                                    size="small"
                                    color={LEVEL_COLORS[ev.level]}
                                    variant="outlined"
                                    sx={{
                                        fontSize: 10,
                                        height: 18,
                                        flexShrink: 0,
                                    }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        flexGrow: 1,
                                        wordBreak: 'break-word',
                                        color:
                                            ev.level === 'error'
                                                ? 'error.main'
                                                : ev.level === 'health'
                                                  ? 'warning.main'
                                                  : 'text.primary',
                                    }}
                                >
                                    {ev.message}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: 'text.disabled',
                                        flexShrink: 0,
                                    }}
                                >
                                    {new Date(ev.time).toLocaleTimeString()}
                                </Typography>
                            </Stack>
                        ))
                    )}
                </Box>
            </Collapse>
        </Box>
    );
}

const ROOT = '/api/plugin/lappis';

interface CaptionKitSettings {
    channel: string;
    language: string;
    fontSize: number;
    lines: number;
}

const CAPTIONKIT_DEFAULTS: CaptionKitSettings = {
    channel: '',
    language: 'sv',
    fontSize: 12,
    lines: 2,
};

function CaptionKitPanel() {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [open, setOpen] = useState(false);
    const [settings, setSettings] =
        useState<CaptionKitSettings>(CAPTIONKIT_DEFAULTS);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!conn) return;
        conn.rawRequest(`${ROOT}/captionkit/settings`, 'GET', null)
            .then((res: any) => {
                if (res) setSettings(prev => ({ ...prev, ...res }));
            })
            .catch(() => {});
    }, [conn]);

    const update = (patch: Partial<CaptionKitSettings>) =>
        setSettings(prev => ({ ...prev, ...patch }));

    const save = () => {
        if (!conn) return;
        setSaving(true);
        conn.rawRequest(`${ROOT}/captionkit/settings`, 'UPDATE', settings)
            .catch(() => {})
            .finally(() => setSaving(false));
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setOpen(o => !o)}
            >
                <Typography
                    variant="subtitle2"
                    sx={{ color: 'text.secondary' }}
                >
                    {t('captionkit.heading')}
                </Typography>
                <IconButton size="small" sx={{ ml: 'auto' }}>
                    {open ? (
                        <ExpandLessIcon sx={{ fontSize: 18 }} />
                    ) : (
                        <ExpandMoreIcon sx={{ fontSize: 18 }} />
                    )}
                </IconButton>
            </Stack>

            <Collapse in={open}>
                <Stack spacing={2} sx={{ mt: 1.5, maxWidth: 420 }}>
                    <TextField
                        label={t('captionkit.channel')}
                        value={settings.channel}
                        onChange={e => update({ channel: e.target.value })}
                        size="small"
                        helperText={t('captionkit.channelHelper')}
                    />
                    <TextField
                        label={t('captionkit.language')}
                        value={settings.language}
                        onChange={e => update({ language: e.target.value })}
                        size="small"
                    />
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label={t('captionkit.fontSize')}
                            type="number"
                            value={settings.fontSize}
                            onChange={e =>
                                update({ fontSize: Number(e.target.value) })
                            }
                            size="small"
                        />
                        <TextField
                            label={t('captionkit.lines')}
                            type="number"
                            value={settings.lines}
                            onChange={e =>
                                update({ lines: Number(e.target.value) })
                            }
                            size="small"
                        />
                    </Stack>
                    <Button
                        variant="outlined"
                        size="small"
                        disabled={saving}
                        onClick={save}
                        sx={{ alignSelf: 'flex-start' }}
                    >
                        {t('captionkit.save')}
                    </Button>
                </Stack>
            </Collapse>
        </Box>
    );
}

interface PluginSettings {
    projectorsToProgram: boolean;
}

const SETTINGS_DEFAULTS: PluginSettings = {
    projectorsToProgram: false,
};

const settingsTopic = topic<Partial<PluginSettings>>(
    'plugin/lappis/settings',
    Method.UPDATE,
);

function SettingsPanel() {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<PluginSettings>(SETTINGS_DEFAULTS);

    useEffect(() => {
        if (!conn) return;
        conn.rawRequest(`${ROOT}/settings`, 'GET', null)
            .then((res: any) => {
                if (res) setSettings(prev => ({ ...prev, ...res }));
            })
            .catch(() => {});
    }, [conn]);

    useBroadcast(settingsTopic, data => {
        if (!data) return;
        setSettings(prev => ({ ...prev, ...data }));
    });

    const update = (patch: Partial<PluginSettings>) => {
        setSettings(prev => ({ ...prev, ...patch }));
        if (!conn) return;
        conn.rawRequest(`${ROOT}/settings`, 'UPDATE', patch).catch(() => {});
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setOpen(o => !o)}
            >
                <Typography
                    variant="subtitle2"
                    sx={{ color: 'text.secondary' }}
                >
                    {t('settings.heading')}
                </Typography>
                <IconButton size="small" sx={{ ml: 'auto' }}>
                    {open ? (
                        <ExpandLessIcon sx={{ fontSize: 18 }} />
                    ) : (
                        <ExpandMoreIcon sx={{ fontSize: 18 }} />
                    )}
                </IconButton>
            </Stack>

            <Collapse in={open}>
                <Stack spacing={1} sx={{ mt: 1.5, maxWidth: 420 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.projectorsToProgram}
                                onChange={e =>
                                    update({
                                        projectorsToProgram: e.target.checked,
                                    })
                                }
                                size="small"
                            />
                        }
                        label={
                            <Typography variant="body2">
                                {t('settings.projectorsToProgram')}
                            </Typography>
                        }
                    />
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary' }}
                    >
                        {t('settings.projectorsToProgramHelper')}
                    </Typography>
                </Stack>
            </Collapse>
        </Box>
    );
}

const OverlayTest = () => (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', padding: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 2 }}>
            <ActiveRundownSelector />
        </Box>
        <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems="flex-start"
        >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <CaptionKitPanel />
                <SettingsPanel />
                <DiagnosticsPanel />
            </Box>
            <Box
                sx={{
                    flexBasis: 380,
                    flexShrink: 0,
                    width: { xs: '100%', md: 'auto' },
                }}
            >
                <VideoQueue showSetCurrentRundown={false} />
            </Box>
        </Stack>
    </Box>
);

export default OverlayTest;
