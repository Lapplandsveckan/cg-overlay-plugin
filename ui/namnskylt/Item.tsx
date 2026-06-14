import React from 'react';
import { Stack, Typography } from '@mui/material';
import { useTranslation } from '../i18n';

interface RundownEntry {
    id: string;
    title: string;
    data: any;

    type?: string;
}

interface NamnskyltRundownItemProps {
    entry: RundownEntry;
}

export const NamnskyltRundownItem: React.FC<NamnskyltRundownItemProps> = ({
    entry: _entry,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');

    return (
        <Stack spacing={2} direction="column">
            <Typography variant="body1">{t('namnskylt.label')}</Typography>
        </Stack>
    );
};

export default NamnskyltRundownItem;
