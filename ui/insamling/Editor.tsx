import React, {useState} from 'react';
import {InputAdornment, Stack, TextField, Typography} from '@mui/material';

// @ts-ignore
import {RundownEditorActionBar} from '@web-lib';
import {useTranslation} from '../i18n';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface InsamlingEditorProps {
    creating?: boolean;

    entry: RundownEntry;
    updateEntry: (entry: RundownEntry) => void;
    deleteEntry: (entry: RundownEntry) => void;
}

export const InsamlingEditor: React.FC<InsamlingEditorProps> = ({entry, updateEntry, deleteEntry, creating}) => {
    const {t} = useTranslation('cg-overlay-plugin');
    const [title, setTitle] = useState(entry?.title ?? '');
    const [goal, setGoal] = useState<string>(String(entry?.data.goal ?? '0'));
    const [now, setNow] = useState<string>(String(entry?.data.now ?? '0'));

    const kr = <InputAdornment position="end">kr</InputAdornment>;

    return (
        <Stack spacing={2}>
            <Typography variant="h6">{t('insamling.heading')}</Typography>

            <TextField
                label={t('insamling.titleLabel')}
                value={title}
                onChange={e => setTitle(e.target['value'])}
                helperText={t('insamling.titleHelper')}
            />

            <Stack direction="row" spacing={2}>
                <TextField
                    label={t('insamling.currentLabel')}
                    type="number"
                    value={now}
                    onChange={e => setNow(e.target['value'])}
                    InputProps={{endAdornment: kr}}
                    helperText={t('insamling.currentHelper')}
                    sx={{flex: 1}}
                />
                <TextField
                    label={t('insamling.goalLabel')}
                    type="number"
                    value={goal}
                    onChange={e => setGoal(e.target['value'])}
                    InputProps={{endAdornment: kr}}
                    helperText={t('insamling.goalHelper')}
                    sx={{flex: 1}}
                />
            </Stack>

            <RundownEditorActionBar
                exists={!creating}

                onDelete={() => deleteEntry(entry)}
                onSave={() => {
                    updateEntry({
                        ...entry,
                        data: {
                            goal,
                            now,
                        },
                        title,
                    });
                }}
            />
        </Stack>
    );
};

export default InsamlingEditor;
