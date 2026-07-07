import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';

import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '../i18n';
import VideoInspector, { type VideoInspectorValue } from './VideoInspector';

interface VideoInspectorModalProps {
    open: boolean;
    onClose: () => void;

    clip: any;
    value: VideoInspectorValue;
    onChange: (value: VideoInspectorValue) => void;
    fps?: number;
}

export const VideoInspectorModal: React.FC<VideoInspectorModalProps> = ({
    open,
    onClose,
    clip,
    value,
    onChange,
    fps,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ paddingBottom: 1 }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Typography variant="h6">
                        {t('playVideo.inspectorLabel')}
                    </Typography>
                    <IconButton onClick={onClose} size="small" color="inherit">
                        <CloseIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <VideoInspector
                    clip={clip}
                    value={value}
                    onChange={onChange}
                    fps={fps}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('playVideo.close')}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default VideoInspectorModal;
