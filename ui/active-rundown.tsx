import React from 'react';
import {
    FormControl,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import { useSocket } from '@web-lib';
import { useTranslation } from './i18n';
import { useActiveRundown } from './hooks';

export default function ActiveRundownSelector() {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const { rundowns, activeId, setActive } = useActiveRundown(conn);

    return (
        <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('activeRundown.label')}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                    value={activeId ?? ''}
                    onChange={e => setActive(e.target.value || null)}
                    displayEmpty
                >
                    <MenuItem value="">
                        <em>{t('activeRundown.none')}</em>
                    </MenuItem>
                    {rundowns.map(rd => (
                        <MenuItem key={rd.id} value={rd.id}>
                            {rd.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Stack>
    );
}
