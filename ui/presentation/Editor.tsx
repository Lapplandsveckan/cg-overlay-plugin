import React, { useState } from 'react';
import {
    Checkbox,
    FormControlLabel,
    FormHelperText,
    Stack,
    TextField,
    Typography,
} from '@mui/material';

import { RundownEditorActionBar } from '@web-lib';
import { useTranslation } from '../i18n';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface PresentationEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const PresentationEditor: React.FC<PresentationEditorProps> = ({
    entry,
    updateEntry,
    deleteEntry,
    creating,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const [title, setTitle] = useState(entry?.title ?? '');
    const [atem, setAtem] = useState(entry?.data.atem ?? false);

    return (
        <Stack spacing={2}>
            <Typography variant="h6">{t('presentation.heading')}</Typography>

            <TextField
                label={t('presentation.titleLabel')}
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText={t('presentation.titleHelper')}
            />

            <Stack>
                <FormControlLabel
                    label={t('presentation.switchAtemLabel')}
                    control={
                        <Checkbox
                            checked={atem}
                            onChange={e => setAtem(e.target['checked'])}
                        />
                    }
                />
                <FormHelperText sx={{ marginLeft: 4 }}>
                    {t('presentation.switchAtemHelper')}
                </FormHelperText>
            </Stack>

            <RundownEditorActionBar
                exists={!creating}
                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            atem,
                        },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default PresentationEditor;
