import React from 'react';
import { TextField } from '@mui/material';
import { useTranslation } from '../../i18n';

interface TextSlideSectionProps {
    value: string;
    onChange: (value: string) => void;
}

const TextSlideSection: React.FC<TextSlideSectionProps> = ({
    value,
    onChange,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');

    return (
        <TextField
            label={t('presentationEditor.textLabel')}
            value={value}
            onChange={e => onChange(e.target.value)}
            multiline
            minRows={4}
            fullWidth
            autoFocus
            placeholder={t('presentationEditor.textPlaceholder')}
        />
    );
};

export { TextSlideSection };
