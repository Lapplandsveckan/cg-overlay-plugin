import React, {useState} from 'react';
import {Stack, TextField, Typography} from '@mui/material';

// @ts-ignore
import {RundownEditorActionBar} from '@web-lib';
import {useTranslation} from '../i18n';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface BarsEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const BarsEditor: React.FC<BarsEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const {t} = useTranslation('cg-overlay-plugin');
    const [title, setTitle] = useState(entry?.title ?? '');

    return (
        <Stack spacing={2}>
            <Typography variant="h6">{t('bars.heading')}</Typography>
            <Typography variant="body2" color="text.secondary">
                {t('bars.description')}
            </Typography>

            <TextField
                label={t('bars.titleLabel')}
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText={t('bars.titleHelper')}
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

export default BarsEditor;
