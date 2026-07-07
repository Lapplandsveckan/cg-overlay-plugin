import React, { useState } from 'react';
import { Stack, TextField, Typography } from '@mui/material';

import { RundownEditorActionBar } from '@web-lib';
import { useTranslation } from '../i18n';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface CaptionEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const CaptionEditor: React.FC<CaptionEditorProps> = ({
    entry,
    updateEntry,
    deleteEntry,
    creating,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const [title, setTitle] = useState(entry?.title ?? '');

    return (
        <Stack spacing={2}>
            <Typography variant="h6">{t('caption.heading')}</Typography>
            <Typography variant="body2" color="text.secondary">
                {t('caption.description')}
            </Typography>

            <TextField
                label={t('caption.titleLabel')}
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText={t('caption.titleHelper')}
            />

            <RundownEditorActionBar
                exists={!creating}
                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {},
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default CaptionEditor;
