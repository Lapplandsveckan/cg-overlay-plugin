import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '../../i18n';
import NameDialog from '../NameDialog';

interface PresentationEditorToolbarProps {
    title: string | null;
    slideCount: number;
    error: string | null;
    selectedCount: number;
    renameOpen: boolean;
    onBack: () => void;
    onRenameClick: () => void;
    onDeletePresentationClick: () => void;
    onAddSlidesClick: () => void;
    onRenameClose: () => void;
    onRename: (newTitle: string) => void;
    onClearError: () => void;
    onDeleteSelected: () => void;
    onClearSelection: () => void;
}

export const PresentationEditorToolbar: React.FC<
    PresentationEditorToolbarProps
> = ({
    title,
    slideCount,
    error,
    selectedCount,
    renameOpen,
    onBack,
    onRenameClick,
    onDeletePresentationClick,
    onAddSlidesClick,
    onRenameClose,
    onRename,
    onClearError,
    onDeleteSelected,
    onClearSelection,
}) => {
    const { t } = useTranslation('cg-overlay-plugin');

    return (
        <Stack spacing={3}>
            <Button
                variant="text"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={onBack}
                sx={{ alignSelf: 'flex-start', color: 'text.secondary' }}
            >
                {t('presentationEditor.back')}
            </Button>

            <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography
                    variant="h2"
                    fontWeight={600}
                    sx={
                        !title
                            ? {
                                  color: 'text.disabled',
                                  fontStyle: 'italic',
                              }
                            : undefined
                    }
                >
                    {title || t('presentationEditor.untitled')}
                </Typography>
                <Tooltip title={t('presentationEditor.renameTooltip')}>
                    <IconButton
                        onClick={onRenameClick}
                        sx={{
                            width: 32,
                            height: 32,
                            padding: 0,
                            color: 'text.secondary',
                            '&:hover': { color: 'text.primary' },
                        }}
                    >
                        <EditIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                </Tooltip>
                <Tooltip title={t('presentationEditor.deleteButton')}>
                    <IconButton
                        onClick={onDeletePresentationClick}
                        sx={{
                            width: 32,
                            height: 32,
                            padding: 0,
                            color: 'text.secondary',
                            '&:hover': { color: 'error.main' },
                        }}
                    >
                        <DeleteIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                </Tooltip>
                <Box sx={{ flexGrow: 1 }} />
                <Chip
                    label={t('slides.slideCount', {
                        count: slideCount,
                    })}
                    variant="outlined"
                />
                <Button variant="contained" onClick={onAddSlidesClick}>
                    {t('presentationEditor.addSlides')}
                </Button>
            </Stack>

            <NameDialog
                open={renameOpen}
                title={t('presentationEditor.renameDialogTitle')}
                initialName={title ?? ''}
                onClose={onRenameClose}
                onSubmit={onRename}
            />

            {error && (
                <Alert severity="error" onClose={onClearError}>
                    {error}
                </Alert>
            )}

            <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                    padding: '6px 12px',
                    borderRadius: 1,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                }}
            >
                <Typography variant="body2">
                    {t('presentationEditor.slidesSelected', {
                        count: selectedCount,
                    })}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    size="small"
                    color="error"
                    disabled={selectedCount === 0}
                    startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                    onClick={onDeleteSelected}
                >
                    {selectedCount === 1
                        ? t('presentationEditor.deleteSlide')
                        : t('presentationEditor.deleteNSlides', {
                              count: selectedCount,
                          })}
                </Button>
                <Button
                    size="small"
                    disabled={selectedCount === 0}
                    startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                    onClick={onClearSelection}
                >
                    {t('presentationEditor.clearSelection')}
                </Button>
            </Stack>
        </Stack>
    );
};
