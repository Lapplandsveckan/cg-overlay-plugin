import React, {useState} from 'react';
import {Stack, TextField, Typography} from '@mui/material';

import {RundownEditorActionBar} from '@web-lib';
import {useTranslation} from '../i18n';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface NamnskyltEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const NamnskyltEditor: React.FC<NamnskyltEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const {t} = useTranslation('cg-overlay-plugin');
    const [name, setName] = useState(entry?.data.name ?? '');

    return (
        <Stack spacing={2}>
            <Typography variant="h6">{t('namnskylt.heading')}</Typography>

            <TextField
                label={t('namnskylt.nameLabel')}
                value={name}
                onChange={e => setName(e.target['value'])}
                required
                error={name === ''}
                helperText={name === '' ? t('namnskylt.nameRequired') : t('namnskylt.nameHelper')}
            />

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            name,
                        },
                        title: name,
                    });
                }}
            />
        </Stack>
    );
};

export default NamnskyltEditor;
