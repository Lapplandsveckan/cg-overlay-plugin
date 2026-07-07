import React from 'react';
import { TextField } from '@mui/material';
import { useTranslation } from '../../i18n';

interface HeadingSlideSectionProps {
    value: string;
    onChange: (value: string) => void;
}

const HeadingSlideSection: React.FC<HeadingSlideSectionProps> = ({
    value,
    onChange,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');

    return (
        <TextField
            label={t('presentationEditor.headingLabel')}
            value={value}
            onChange={e => onChange(e.target.value)}
            multiline
            minRows={2}
            fullWidth
            autoFocus
            placeholder={t('presentationEditor.headingPlaceholder')}
        />
    );
};

export { HeadingSlideSection };
