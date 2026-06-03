import React, {useState} from 'react';
import {Checkbox, FormControlLabel, FormHelperText, Stack, TextField, Typography} from '@mui/material';

// @ts-ignore
import {RundownEditorActionBar} from '@web-lib';
import {useTranslation} from '../i18n';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface SwishEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const SwishEditor: React.FC<SwishEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const {t} = useTranslation('cg-overlay-plugin');
    const [title, setTitle] = useState(entry?.title ?? '');
    const [number, setNumber] = useState(entry?.data.number ?? '');
    const [labels, setLabels] = useState(entry?.data.labels ?? '');
    const [skipFirst, setSkipFirst] = useState(entry?.data.skipFirst ?? false);

    return (
        <Stack spacing={2}>
            <Typography variant="h6">{t('swish.heading')}</Typography>

            <TextField
                label={t('swish.titleLabel')}
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText={t('swish.titleHelper')}
            />

            <TextField
                label={t('swish.numberLabel')}
                value={number}
                placeholder="123 607 27 97"
                InputLabelProps={{shrink: true}}
                onChange={e => setNumber(e.target['value'])}
                helperText={t('swish.numberHelper')}
            />

            <TextField
                label={t('swish.labelsLabel')}
                value={labels}
                onChange={e => setLabels(e.target['value'])}
                helperText={t('swish.labelsHelper')}
            />

            <Stack>
                <FormControlLabel
                    label={t('swish.skipFirstLabel')}
                    control={
                        <Checkbox
                            checked={skipFirst}
                            onChange={e => setSkipFirst(e.target['checked'])}
                        />
                    }
                />
                <FormHelperText sx={{marginLeft: 4}}>
                    {t('swish.skipFirstHelper')}
                </FormHelperText>
            </Stack>

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            number,
                            labels,
                            skipFirst,
                        },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default SwishEditor;
