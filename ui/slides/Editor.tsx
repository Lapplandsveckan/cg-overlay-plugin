import React, { useMemo, useState } from 'react';
import { Button, Chip, Stack, Typography, TextField } from '@mui/material';

import { noTry } from 'no-try';
import { RundownEditorActionBar } from '@web-lib';
import { useTranslation } from '../i18n';
import { usePresentations, useBackgroundImage } from './api';
import { currentPath, slidesEditorUrl } from './urls';
import PresentationCover from './PresentationCover';
import PresentationPickerDialog from './PresentationPickerDialog';

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
    const { presentations } = usePresentations();
    const backgroundUrl = useBackgroundImage();

    const [presentationId, setPresentationId] = useState<string>(
        entry?.data?.presentationId ?? '',
    );
    const [title, setTitle] = useState<string>(entry?.title ?? '');
    const [titleTouched, setTitleTouched] = useState<boolean>(!!entry?.title);
    const [pickerOpen, setPickerOpen] = useState(false);

    const selected = useMemo(
        () => presentations?.find(p => p.id === presentationId) ?? null,
        [presentations, presentationId],
    );
    // Set by a rundown drag-and-drop drop, before the import job has finished
    // creating the presentation — the id exists but isn't in the list yet.
    const importPending = !!presentationId && !selected;

    const handleSelect = (id: string) => {
        setPresentationId(id);
        setPickerOpen(false);
        // Auto-fill the rundown entry title from the presentation, unless the user has typed their own.
        const p = presentations?.find(x => x.id === id);
        if (p && !titleTouched) setTitle(p.title);
    };

    const loading = presentations === null;

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
                <Stack spacing={1}>
                    {importPending ? (
                        <Typography variant="body2" color="text.secondary">
                            {t('slides.importPreparing')}
                        </Typography>
                    ) : selected ? (
                        <Stack
                            spacing={1}
                            role="button"
                            tabIndex={0}
                            onClick={() => openPresentationEditor(selected.id)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openPresentationEditor(selected.id);
                                }
                            }}
                            sx={{ cursor: 'pointer', outline: 'none' }}
                        >
                            <PresentationCover
                                presentation={selected}
                                backgroundUrl={backgroundUrl}
                            />
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                            >
                                <Typography
                                    variant="body2"
                                    sx={{
                                        flexGrow: 1,
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {selected.title}
                                </Typography>
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={t('slides.slideCount', {
                                        count: selected.slides.length,
                                    })}
                                />
                            </Stack>
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {t('slides.noPresentationChosen')}
                        </Typography>
                    )}

                    <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setPickerOpen(true)}
                    >
                        {selected
                            ? t('slides.changePresentation')
                            : t('slides.choosePresentation')}
                    </Button>
                </Stack>
            )}

            <RundownEditorActionBar
                exists={!creating}
                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        // Preserve other data fields (e.g. importJobId, set by
                        // a rundown drag-and-drop) rather than clobbering them.
                        data: { ...entry.data, presentationId },
                        title,
                    });
                }}
            />

            <PresentationPickerDialog
                open={pickerOpen}
                selectedId={presentationId}
                onClose={() => setPickerOpen(false)}
                onSelect={handleSelect}
            />
        </Stack>
    );
};

function openPresentationEditor(id: string) {
    // Use an absolute URL — the rundown editor isn't mounted under the plugin
    // page, so relative paths would resolve against the rundown URL.
    // Attach the current rundown path as `from` so the editor can show "Back".
    const url = slidesEditorUrl(id, currentPath());
    const [err] = noTry(() => window.open(url, '_blank', 'noopener'));
    if (err) window.location.assign(url);
}

export default SlidesEditor;
