import React, { useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import { noTry, noTryAsync } from 'no-try';
import { RundownEditorActionBar, useSocket } from '@web-lib';
import { useTranslation } from '../i18n';
import { usePresentations, createPresentation } from './api';
import { slidesEditorUrl } from './urls';

interface RundownEntry {
    id: string;
    title: string;
    data: any;
    type?: string;
}

interface SlidesEditorProps {
    creating?: boolean;
    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const SlidesEditor: React.FC<SlidesEditorProps> = ({
    entry,
    updateEntry,
    deleteEntry,
    creating,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const { presentations } = usePresentations();

    const [presentationId, setPresentationId] = useState<string>(
        entry?.data?.presentationId ?? '',
    );
    const [title, setTitle] = useState<string>(entry?.title ?? '');
    const [titleTouched, setTitleTouched] = useState<boolean>(!!entry?.title);
    const [creatingNew, setCreatingNew] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selected = useMemo(
        () => presentations?.find(p => p.id === presentationId) ?? null,
        [presentations, presentationId],
    );

    const handleSelect = (id: string) => {
        setPresentationId(id);
        // Auto-fill the rundown entry title from the presentation, unless the user has typed their own.
        const p = presentations?.find(x => x.id === id);
        if (p && !titleTouched) setTitle(p.title);
    };

    const handleCreateNew = async () => {
        setCreatingNew(true);
        setError(null);
        const [err, created] = await noTryAsync(() =>
            createPresentation(conn, { title: t('presentationEditor.untitled'), slides: [] }),
        );
        if (err) {
            console.error(err);
            setError((err as any)?.message ?? 'Failed to create presentation');
        } else {
            handleSelect(created!.id);
            openPresentationEditor(created!.id);
        }
        setCreatingNew(false);
    };

    const loading = presentations === null;
    const empty = !loading && presentations.length === 0;

    return (
        <Stack spacing={2}>
            <Typography variant="h6">{t('slides.heading')}</Typography>

            <TextField
                label={t('slides.titleLabel')}
                value={title}
                onChange={e => {
                    setTitle(e.target['value']);
                    setTitleTouched(true);
                }}
                helperText={t('slides.titleHelper')}
            />

            {loading && (
                <Typography variant="body2" color="text.secondary">
                    {t('slides.loadingPresentations')}
                </Typography>
            )}

            {!loading && (
                <TextField
                    select
                    label={t('slides.presentationLabel')}
                    value={presentationId}
                    onChange={e => handleSelect(e.target.value)}
                    helperText={
                        empty
                            ? t('slides.noPresentationsCreate')
                            : selected
                              ? t('slides.slideCount', { count: selected.slides.length })
                              : t('slides.selectHelper')
                    }
                    fullWidth
                >
                    {(presentations ?? []).map(p => (
                        <MenuItem key={p.id} value={p.id}>
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ width: '100%' }}
                            >
                                <Box
                                    sx={{
                                        flexGrow: 1,
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {p.title}
                                </Box>
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${p.slides.length}`}
                                />
                            </Stack>
                        </MenuItem>
                    ))}
                </TextField>
            )}

            <Stack direction="row" spacing={1}>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCreateNew}
                    disabled={creatingNew}
                >
                    {creatingNew ? t('panel.creating') : t('slides.newPresentation')}
                </Button>
                {selected && (
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => openPresentationEditor(selected.id)}
                    >
                        {t('slides.editSelected')}
                    </Button>
                )}
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            <RundownEditorActionBar
                exists={!creating}
                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: { presentationId },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

function openPresentationEditor(id: string) {
    // Use an absolute URL — the rundown editor isn't mounted under the plugin
    // page, so relative paths would resolve against the rundown URL.
    // Attach the current rundown path as `from` so the editor can show "← Back".
    const from = window.location.pathname + window.location.search;
    const url = slidesEditorUrl(id, from);
    const [err] = noTry(() => window.open(url, '_blank', 'noopener'));
    if (err) window.location.assign(url);
}

export default SlidesEditor;
