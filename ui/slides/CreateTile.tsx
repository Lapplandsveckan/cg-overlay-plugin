import React from 'react';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import { useTranslation } from '../i18n';

export const CreateTile: React.FC<{
    onClick: () => void;
    disabled: boolean;
}> = ({ onClick, disabled }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    return (
        <Box
            onClick={disabled ? undefined : onClick}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={e => {
                if (disabled) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            sx={{
                cursor: disabled ? 'progress' : 'pointer',
                outline: 'none',
                aspectRatio: '16/9',
                borderRadius: 1.5,
                border: '1px dashed rgba(255,255,255,0.2)',
                backgroundColor: 'rgba(255,255,255,0.02)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                color: 'text.secondary',
                transition: 'border-color 120ms, background-color 120ms',
                '&:hover, &:focus-visible': disabled
                    ? {}
                    : {
                          borderColor: '#4a90e2',
                          backgroundColor: 'rgba(74,144,226,0.06)',
                          color: 'text.primary',
                      },
            }}
        >
            <AddIcon sx={{ fontSize: 36 }} />
            <Typography variant="body2">
                {disabled
                    ? t('panel.creating')
                    : t('presentationIndex.newPresentation')}
            </Typography>
        </Box>
    );
};

export default CreateTile;
