import React, { useState } from 'react';
import { noTryAsync } from 'no-try';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Link,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
// @ts-expect-error -- no type declarations for @web-lib
import { useSocket } from '@web-lib';
import NameDialog from './NameDialog';
import { CenteredMessage, EmptyState, SlideCard } from './SlideComponents';
import { AddSlidesDialog, EditSlideDialog } from './SlideDialogs';
import {
    type Slide,
    updatePresentation,
    deletePresentation,
    usePresentation,
    useBackgroundImage,
} from './api';
import { pluginHomeUrl, backTargetFromSearch } from './urls';

interface Props {
    id: string;
}

export const PresentationEditor: React.FC<Props> = ({ id }) => {
    const conn = useSocket();
    const remote = usePresentation(id);
    const backFrom = backTargetFromSearch(window.location.search);
    const backHref = backFrom ?? pluginHomeUrl();
    const backLabel = backFrom ? '← Back' : '← Home';
    const backgroundUrl = useBackgroundImage();

    const [renameOpen, setRenameOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Slide | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRename = async (title: string) => {
        setRenameOpen(false);
        const [err] = await noTryAsync(() =>
            updatePresentation(conn, id, { title }),
        );
        if (err) {
            console.error(err);
            setError('Failed to rename presentation');
        }
    };

    if (remote === undefined) {
        return <CenteredMessage>Loading…</CenteredMessage>;
    }
    if (remote === null) {
        return (
            <CenteredMessage>
                <Stack spacing={1.5} alignItems="center">
                    <Typography variant="body1">
                        Presentation not found.
                    </Typography>
                    <Link href={backHref}>{backLabel}</Link>
                </Stack>
            </CenteredMessage>
        );
    }

    const persistSlides = async (slides: Slide[]) => {
        setError(null);
        const [err] = await noTryAsync(() =>
            updatePresentation(conn, id, { slides }),
        );
        if (err) {
            console.error(err);
            setError((err as any)?.message ?? 'Failed to save slides');
        }
    };

    const handleAddSlides = (slides: Slide[]) => {
        persistSlides([...remote.slides, ...slides]);
        setAddOpen(false);
    };

    const handleUpdateSlide = (updated: Slide) => {
        persistSlides(
            remote.slides.map(s => (s.id === updated.id ? updated : s)),
        );
        setEditing(null);
    };

    const handleDeleteSlide = (slideId: string) => {
        persistSlides(remote.slides.filter(s => s.id !== slideId));
    };

    const handleDeletePresentation = async () => {
        setConfirmDelete(false);
        const [err] = await noTryAsync(() => deletePresentation(conn, id));
        if (err) {
            console.error(err);
            setError('Failed to delete presentation');
            return;
        }
        window.location.assign(pluginHomeUrl());
    };

    return (
        <Box
            sx={{ maxWidth: 1400, margin: '0 auto', padding: { xs: 2, md: 3 } }}
        >
            <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                        component="a"
                        href={backHref}
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {backLabel}
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => setConfirmDelete(true)}
                    >
                        Delete presentation
                    </Button>
                </Stack>

                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Typography
                        variant="h2"
                        fontWeight={600}
                        sx={
                            !remote.title
                                ? {
                                      color: 'text.disabled',
                                      fontStyle: 'italic',
                                  }
                                : undefined
                        }
                    >
                        {remote.title || 'Untitled'}
                    </Typography>
                    <Tooltip title="Rename">
                        <IconButton
                            onClick={() => setRenameOpen(true)}
                            sx={{
                                width: 32,
                                height: 32,
                                padding: 0,
                                color: 'text.secondary',
                                '&:hover': { color: 'text.primary' },
                            }}
                        >
                            <Box
                                component="span"
                                sx={{
                                    fontSize: 19,
                                    lineHeight: 1,
                                    fontWeight: 700,
                                }}
                            >
                                ✎
                            </Box>
                        </IconButton>
                    </Tooltip>
                    <Box sx={{ flexGrow: 1 }} />
                    <Chip
                        label={`${remote.slides.length} slide${remote.slides.length === 1 ? '' : 's'}`}
                        variant="outlined"
                    />
                </Stack>

                <NameDialog
                    open={renameOpen}
                    title="Rename presentation"
                    initialName={remote.title}
                    onClose={() => setRenameOpen(false)}
                    onSubmit={handleRename}
                />

                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="flex-end"
                >
                    <Button
                        variant="contained"
                        onClick={() => setAddOpen(true)}
                    >
                        + Add slides
                    </Button>
                </Stack>

                {remote.slides.length === 0 ? (
                    <EmptyState onAdd={() => setAddOpen(true)} />
                ) : (
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(2, 1fr)',
                                md: 'repeat(3, 1fr)',
                                lg: 'repeat(4, 1fr)',
                            },
                            gap: 2.5,
                        }}
                    >
                        {remote.slides.map((slide, idx) => (
                            <SlideCard
                                key={slide.id}
                                slide={slide}
                                index={idx + 1}
                                backgroundUrl={backgroundUrl}
                                onEdit={() => setEditing(slide)}
                                onDelete={() => handleDeleteSlide(slide.id)}
                            />
                        ))}
                    </Box>
                )}
            </Stack>

            <AddSlidesDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onAdd={handleAddSlides}
            />

            <EditSlideDialog
                slide={editing}
                onClose={() => setEditing(null)}
                onSave={handleUpdateSlide}
            />

            <Dialog
                open={confirmDelete}
                onClose={() => setConfirmDelete(false)}
            >
                <DialogTitle>Delete presentation?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        "{remote.title}" will be permanently removed. Any
                        rundown entries that reference it will show
                        "Presentation missing".
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(false)}>
                        Cancel
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeletePresentation}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PresentationEditor;
