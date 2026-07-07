import React, { useEffect } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Link,
    Stack,
    Typography,
    Button,
} from '@mui/material';
import { noTryAsync } from 'no-try';
import { useSocket } from '@web-lib';
import { useTranslation } from '../../i18n';
import {
    deletePresentation,
    updatePresentation,
    usePresentation,
} from '../api';
import { backTargetFromSearch, slidesHomeUrl } from '../urls';
import { usePresentationEditor, useDragAndDrop, useDialogState } from './hooks';
import { calculateNewOrder } from './utils';
import { CenteredMessage } from './common';
import { AddSlidesDialog } from './AddSlidesDialog';
import { EditSlideDialog } from './EditSlideDialog';
import { PresentationEditorToolbar } from './PresentationEditorToolbar';
import { PresentationEditorGrid } from './PresentationEditorGrid';

interface Props {
    id: string;
}

export const PresentationEditor: React.FC<Props> = ({ id }) => {
    const { t } = useTranslation('cg-overlay-plugin');
    const conn = useSocket();
    const remote = usePresentation(id);
    const backFrom = backTargetFromSearch(window.location.search);

    const editor = usePresentationEditor(remote?.slides, id);
    const dnd = useDragAndDrop();
    const dialogs = useDialogState();

    useEffect(() => {
        if (dialogs.dialogOpen) return;

        const onDocMouseDown = (e: MouseEvent) => {
            if (e.button !== 0) return;
            const target = e.target as HTMLElement;
            if (
                target.closest?.(
                    'button, a, input, textarea, select, [role="button"], [role="menu"], [role="menuitem"], [role="dialog"], [contenteditable], [data-slide-card]',
                )
            ) {
                return;
            }
            e.preventDefault();
            editor.isPainting.current = true;
            editor.paintedAny.current = false;
            editor.setAnchorId(null);
            const prevUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';
            const onMouseUp = () => {
                editor.isPainting.current = false;
                document.body.style.userSelect = prevUserSelect;
                window.removeEventListener('mouseup', onMouseUp);
                if (!editor.paintedAny.current) editor.clearSelection();
            };
            window.addEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [dialogs.dialogOpen, editor]);

    const handleRename = async (title: string) => {
        dialogs.setRenameOpen(false);
        const [err] = await noTryAsync(() =>
            updatePresentation(conn, id, { title }),
        );
        if (err) {
            console.error(err);
            editor.setError('Failed to rename presentation');
        }
    };

    const handleAddSlides = (slides: any[]) => {
        editor.persistSlides([...editor.orderedSlides, ...slides]);
        dialogs.setAddOpen(false);
    };

    const handleUpdateSlide = (updated: any) => {
        editor.persistSlides(
            editor.orderedSlides.map(s => (s.id === updated.id ? updated : s)),
        );
        dialogs.setEditing(null);
    };

    const handleDragStart = (event: DragStartEvent) => {
        dnd.handleDragStart(String(event.active.id));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) {
            dnd.handleDragEnd();
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);

        const next = calculateNewOrder(
            editor.orderedSlides,
            activeId,
            overId,
            editor.selectedIds,
        );

        editor.setOrderedSlides(next);
        editor.persistSlides(next);
        dnd.handleDragEnd();
    };

    const handleDeleteSelected = () => {
        if (editor.selectedIds.size >= 2) {
            dialogs.setConfirmBulkDelete(true);
            return;
        }
        editor.deleteSelected();
    };

    const confirmDeleteSelected = () => {
        dialogs.setConfirmBulkDelete(false);
        editor.deleteSelected();
    };

    const handleDeletePresentation = async () => {
        dialogs.setConfirmDelete(false);
        const [err] = await noTryAsync(() => deletePresentation(conn, id));
        if (err) {
            console.error(err);
            editor.setError('Failed to delete presentation');
            return;
        }
        window.location.assign(backFrom ?? slidesHomeUrl());
    };

    if (remote === undefined) {
        return (
            <CenteredMessage>{t('presentationEditor.loading')}</CenteredMessage>
        );
    }
    if (remote === null) {
        return (
            <CenteredMessage>
                <Stack spacing={1.5} alignItems="center">
                    <Typography variant="body1">
                        {t('presentationEditor.notFound')}
                    </Typography>
                    <Link href={backFrom ?? slidesHomeUrl()}>
                        {t('presentationEditor.home')}
                    </Link>
                </Stack>
            </CenteredMessage>
        );
    }

    return (
        <Box
            sx={{ maxWidth: 1400, margin: '0 auto', padding: { xs: 2, md: 3 } }}
        >
            <Stack spacing={3}>
                <PresentationEditorToolbar
                    title={remote.title}
                    slideCount={editor.orderedSlides.length}
                    error={editor.error}
                    selectedCount={editor.selectedIds.size}
                    renameOpen={dialogs.renameOpen}
                    onBack={() =>
                        backFrom
                            ? window.location.assign(backFrom)
                            : window.history.back()
                    }
                    onRenameClick={() => dialogs.setRenameOpen(true)}
                    onDeletePresentationClick={() =>
                        dialogs.setConfirmDelete(true)
                    }
                    onAddSlidesClick={() => dialogs.setAddOpen(true)}
                    onRenameClose={() => dialogs.setRenameOpen(false)}
                    onRename={handleRename}
                    onClearError={() => editor.setError(null)}
                    onDeleteSelected={handleDeleteSelected}
                    onClearSelection={editor.clearSelection}
                />

                <PresentationEditorGrid
                    slides={editor.orderedSlides}
                    selectedIds={editor.selectedIds}
                    activeDragId={dnd.activeDragId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={dnd.handleDragCancel}
                    onSelectSlide={editor.handleSelectSlide}
                    onPaintEnter={editor.addToSelection}
                    onEditSlide={slide => dialogs.setEditing(slide)}
                    onDeleteSlide={editor.handleDeleteSlide}
                    onDeleteSelected={handleDeleteSelected}
                    onAddSlides={() => dialogs.setAddOpen(true)}
                    isPainting={editor.isPainting}
                />
            </Stack>

            <AddSlidesDialog
                open={dialogs.addOpen}
                onClose={() => dialogs.setAddOpen(false)}
                onAdd={handleAddSlides}
            />

            <EditSlideDialog
                slide={dialogs.editing}
                onClose={() => dialogs.setEditing(null)}
                onSave={handleUpdateSlide}
            />

            <Dialog
                open={dialogs.confirmDelete}
                onClose={() => dialogs.setConfirmDelete(false)}
            >
                <DialogTitle>
                    {t('presentationEditor.deleteConfirmTitle')}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {t('presentationEditor.deleteConfirmBody', {
                            title: remote.title,
                        })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => dialogs.setConfirmDelete(false)}>
                        {t('panel.cancel')}
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleDeletePresentation}
                    >
                        {t('presentationEditor.delete')}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={dialogs.confirmBulkDelete}
                onClose={() => dialogs.setConfirmBulkDelete(false)}
            >
                <DialogTitle>
                    {t('presentationEditor.deleteSlidesConfirmTitle')}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {t('presentationEditor.deleteSlidesConfirmBody', {
                            count: editor.selectedIds.size,
                        })}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => dialogs.setConfirmBulkDelete(false)}>
                        {t('panel.cancel')}
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={confirmDeleteSelected}
                    >
                        {t('presentationEditor.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PresentationEditor;
