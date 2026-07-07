import { useEffect, useRef, useState } from 'react';
import { noTryAsync } from 'no-try';
import { useSocket } from '@web-lib';
import { type Slide, updatePresentation } from '../api';

export const usePresentationEditor = (
    remoteSlides: Slide[] | null | undefined,
    presentationId: string,
) => {
    const conn = useSocket();
    const [error, setError] = useState<string | null>(null);
    const [orderedSlides, setOrderedSlides] = useState<Slide[]>(
        remoteSlides ?? [],
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [anchorId, setAnchorId] = useState<string | null>(null);
    const isPainting = useRef(false);
    const paintedAny = useRef(false);

    const clearSelection = () => {
        setSelectedIds(new Set());
        setAnchorId(null);
    };

    useEffect(() => {
        if (!remoteSlides) return;
        setOrderedSlides(prev =>
            JSON.stringify(prev) === JSON.stringify(remoteSlides)
                ? prev
                : remoteSlides,
        );
        const validIds = new Set(remoteSlides.map(s => s.id));
        setSelectedIds(prev => {
            const next = new Set([...prev].filter(id => validIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
        setAnchorId(prev => (prev && validIds.has(prev) ? prev : null));
    }, [remoteSlides]);

    useEffect(() => {
        if (selectedIds.size === 0) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedIds(new Set());
                setAnchorId(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedIds.size]);

    const persistSlides = async (slides: Slide[]) => {
        setError(null);
        const [err] = await noTryAsync(() =>
            updatePresentation(conn, presentationId, { slides }),
        );
        if (err) {
            console.error(err);
            setError((err as any)?.message ?? 'Failed to save slides');
        }
    };

    const addToSelection = (slideId: string) => {
        paintedAny.current = true;
        setSelectedIds(prev =>
            prev.has(slideId) ? prev : new Set(prev).add(slideId),
        );
    };

    const handleSelectSlide = (slideId: string, e: React.MouseEvent) => {
        if (e.shiftKey && anchorId) {
            const anchorIdx = orderedSlides.findIndex(s => s.id === anchorId);
            const targetIdx = orderedSlides.findIndex(s => s.id === slideId);
            if (anchorIdx !== -1 && targetIdx !== -1) {
                const [from, to] =
                    anchorIdx < targetIdx
                        ? [anchorIdx, targetIdx]
                        : [targetIdx, anchorIdx];
                setSelectedIds(
                    new Set(orderedSlides.slice(from, to + 1).map(s => s.id)),
                );
                return;
            }
        }
        if (e.metaKey || e.ctrlKey) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(slideId)) next.delete(slideId);
                else next.add(slideId);
                return next;
            });
            setAnchorId(slideId);
            return;
        }
        setSelectedIds(new Set([slideId]));
        setAnchorId(slideId);
    };

    const deleteSelected = () => {
        persistSlides(orderedSlides.filter(s => !selectedIds.has(s.id)));
        clearSelection();
    };

    const handleDeleteSlide = (slideId: string) => {
        persistSlides(orderedSlides.filter(s => s.id !== slideId));
    };

    return {
        orderedSlides,
        setOrderedSlides,
        selectedIds,
        setSelectedIds,
        anchorId,
        setAnchorId,
        error,
        setError,
        clearSelection,
        isPainting,
        paintedAny,
        persistSlides,
        addToSelection,
        handleSelectSlide,
        deleteSelected,
        handleDeleteSlide,
    };
};

export const useDragAndDrop = () => {
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    const handleDragStart = (dragId: string) => {
        setActiveDragId(dragId);
    };

    const handleDragCancel = () => {
        setActiveDragId(null);
    };

    const handleDragEnd = () => {
        setActiveDragId(null);
    };

    return {
        activeDragId,
        handleDragStart,
        handleDragEnd,
        handleDragCancel,
    };
};

export const useDialogState = () => {
    const [renameOpen, setRenameOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editing, setEditing] = useState<Slide | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

    const dialogOpen =
        renameOpen ||
        addOpen ||
        !!editing ||
        confirmDelete ||
        confirmBulkDelete;

    return {
        renameOpen,
        setRenameOpen,
        addOpen,
        setAddOpen,
        editing,
        setEditing,
        confirmDelete,
        setConfirmDelete,
        confirmBulkDelete,
        setConfirmBulkDelete,
        dialogOpen,
    };
};
