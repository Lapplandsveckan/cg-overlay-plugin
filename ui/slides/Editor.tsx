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
            createPresentation(conn, { title: 'Untitled', slides: [] }),
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
            <Typography variant="h6">Slides</Typography>

            <TextField
                label="Title"
                value={title}
                onChange={e => {
                    setTitle(e.target['value']);
                    setTitleTouched(true);
                }}
                helperText="Shown in the rundown."
            />

            {loading && (
                <Typography variant="body2" color="text.secondary">
                    Loading presentations…
                </Typography>
            )}

            {!loading && (
                <TextField
                    select
                    label="Presentation"
                    value={presentationId}
                    onChange={e => handleSelect(e.target.value)}
                    helperText={
                        empty
                            ? 'No presentations yet. Create one to get started.'
                            : selected
                              ? `${selected.slides.length} slide${selected.slides.length === 1 ? '' : 's'}`
                              : 'Select which presentation this entry plays.'
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
                    {creatingNew ? 'Creating…' : '+ New presentation'}
                </Button>
                {selected && (
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => openPresentationEditor(selected.id)}
                    >
                        Edit selected
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
    const url = slidesEditorUrl(id);
    const [err] = noTry(() => window.open(url, '_blank', 'noopener'));
    if (err) window.location.assign(url);
}

export default SlidesEditor;
