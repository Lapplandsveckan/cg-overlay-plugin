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

interface TextEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
    entry,
    updateEntry,
    deleteEntry,
    creating,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const [title, setTitle] = useState(entry?.title ?? '');
    const [text, setText] = useState(entry?.data.text ?? '');

    return (
        <Stack spacing={2}>
            <Typography variant="h6">{t('text.heading')}</Typography>

            <TextField
                label={t('text.titleLabel')}
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText={t('text.titleHelper')}
            />

            <TextField
                label={t('text.textLabel')}
                value={text}
                onChange={e => setText(e.target['value'])}
                multiline
                minRows={3}
                helperText={t('text.textHelper')}
            />

            <RundownEditorActionBar
                exists={!creating}
                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            text,
                        },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default TextEditor;
