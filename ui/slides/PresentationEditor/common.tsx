import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n';

const CenteredMessage: React.FC<React.PropsWithChildren> = ({ children }) => (
    <Box sx={{ padding: 6, textAlign: 'center', color: 'text.secondary' }}>
        {children}
    </Box>
);

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    return (
        <Box
            sx={{
                padding: 6,
                textAlign: 'center',
                border: '1px dashed rgba(255,255,255,0.15)',
                borderRadius: 2,
                color: 'text.secondary',
            }}
        >
            <Stack spacing={1.5} alignItems="center">
                <Typography variant="body1">
                    {t('presentationEditor.noSlidesYet')}
                </Typography>
                <Typography variant="body2">
                    {t('presentationEditor.noSlidesHelper')}
                </Typography>
                <Button variant="contained" size="small" onClick={onAdd}>
                    {t('presentationEditor.addSlides')}
                </Button>
            </Stack>
        </Box>
    );
};

export { CenteredMessage, EmptyState };
