import React, { useMemo, useState } from 'react';
import {
    Box,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { noTryAsync } from 'no-try';
import { useSocket } from '@web-lib';
import { useTranslation } from '../i18n';

import PresentationCover from './PresentationCover';
import CreateTile from './CreateTile';
import {
    createPresentation,
    usePresentations,
    useBackgroundImage,
} from './api';
import { currentPath, slidesEditorUrl } from './urls';

interface PresentationPickerDialogProps {
    open: boolean;
    selectedId: string;
    onClose: () => void;
    onSelect: (id: string) => void;
}

export const PresentationPickerDialog: React.FC<
    PresentationPickerDialogProps
> = ({ open, selectedId, onClose, onSelect }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const { presentations } = usePresentations();
    const backgroundUrl = useBackgroundImage();
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!presentations) return [];
        return presentations.filter(
            p => !q || p.title.toLowerCase().includes(q),
        );
    }, [presentations, query]);

    const handleCreate = async () => {
        setCreating(true);
        const [err, created] = await noTryAsync(() =>
            createPresentation(conn, {
                title: t('presentationEditor.untitled'),
                slides: [],
            }),
        );
        setCreating(false);
        if (err) {
            console.error(err);
            return;
        }
        onSelect(created!.id);
        window.open(
            slidesEditorUrl(created!.id, currentPath()),
            '_blank',
            'noopener',
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                >
                    {t('slides.choosePresentation')}
                    <IconButton size="small" onClick={onClose}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2.5}>
                    <TextField
                        size="small"
                        autoFocus
                        placeholder={t('presentationIndex.search')}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        sx={{ width: 240 }}
                        InputProps={{
                            endAdornment: query ? (
                                <InputAdornment position="end">
                                    <IconButton
                                        size="small"
                                        onClick={() => setQuery('')}
                                    >
                                        <CloseIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                        }}
                    />

                    {presentations === null ? (
                        <Typography variant="body2" color="text.secondary">
                            {t('slides.loadingPresentations')}
                        </Typography>
                    ) : (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: 2.5,
                                minWidth: 0,
                            }}
                        >
                            <CreateTile
                                onClick={handleCreate}
                                disabled={creating}
                            />
                            {filtered.map(p => (
                                <Stack
                                    key={p.id}
                                    spacing={1}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onSelect(p.id)}
                                    onKeyDown={e => {
                                        if (
                                            e.key === 'Enter' ||
                                            e.key === ' '
                                        ) {
                                            e.preventDefault();
                                            onSelect(p.id);
                                        }
                                    }}
                                    sx={{
                                        cursor: 'pointer',
                                        outline: 'none',
                                        '&:hover .pres-card-title': {
                                            color: '#4a90e2',
                                        },
                                    }}
                                >
                                    <PresentationCover
                                        presentation={p}
                                        backgroundUrl={backgroundUrl}
                                        selected={p.id === selectedId}
                                    />
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        sx={{ paddingLeft: 0.25 }}
                                    >
                                        <Typography
                                            className="pres-card-title"
                                            variant="body1"
                                            sx={{
                                                flexGrow: 1,
                                                minWidth: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {p.title}
                                        </Typography>
                                        <Chip
                                            label={`${p.slides.length}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Stack>
                                </Stack>
                            ))}
                        </Box>
                    )}
                    {presentations !== null &&
                        query.trim() !== '' &&
                        filtered.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                {t('presentationIndex.noResults')}
                            </Typography>
                        )}
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default PresentationPickerDialog;
