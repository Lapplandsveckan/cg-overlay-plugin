import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { type Slide, useImageThumbnails, useBackgroundImage } from '../api';
import { SlideCard, GroupDragPreview } from './SlideCard';
import { EmptyState } from './common';

interface PresentationEditorGridProps {
    slides: Slide[];
    selectedIds: Set<string>;
    activeDragId: string | null;
    onDragStart: (event: DragStartEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onDragCancel: () => void;
    onSelectSlide: (slideId: string, e: React.MouseEvent) => void;
    onPaintEnter: (slideId: string) => void;
    onEditSlide: (slide: Slide) => void;
    onDeleteSlide: (slideId: string) => void;
    onDeleteSelected: () => void;
    onAddSlides: () => void;
    isPainting: React.MutableRefObject<boolean>;
}

export const PresentationEditorGrid: React.FC<PresentationEditorGridProps> = ({
    slides,
    selectedIds,
    activeDragId,
    onDragStart,
    onDragEnd,
    onDragCancel,
    onSelectSlide,
    onPaintEnter,
    onEditSlide,
    onDeleteSlide,
    onDeleteSelected,
    onAddSlides,
    isPainting,
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const imageMediaIds = useMemo(
        () =>
            slides
                .filter(s => s.type === 'image' || s.type === 'video')
                .map(s => (s as any).mediaId),
        [slides],
    );
    const imageThumbnails = useImageThumbnails(imageMediaIds);
    const backgroundUrl = useBackgroundImage();

    const isGroupDrag =
        activeDragId !== null &&
        selectedIds.has(activeDragId) &&
        selectedIds.size > 1;

    const activeSlide = activeDragId
        ? slides.find(s => s.id === activeDragId)
        : null;

    const handleDragStart = (event: DragStartEvent) => {
        onDragStart(event);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        onDragEnd(event);
    };

    const handleDragCancel = () => {
        onDragCancel();
    };

    if (slides.length === 0) {
        return <EmptyState onAdd={onAddSlides} />;
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext
                items={slides.map(s => s.id)}
                strategy={rectSortingStrategy}
            >
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
                    {slides.map((slide, idx) => (
                        <SlideCard
                            key={slide.id}
                            slide={slide}
                            index={idx + 1}
                            backgroundUrl={backgroundUrl}
                            imageThumbnails={imageThumbnails}
                            selected={selectedIds.has(slide.id)}
                            selectionCount={selectedIds.size}
                            dimmed={
                                isGroupDrag &&
                                selectedIds.has(slide.id) &&
                                slide.id !== activeDragId
                            }
                            suppressTransform={
                                isGroupDrag && slide.id === activeDragId
                            }
                            onSelect={e => onSelectSlide(slide.id, e)}
                            onPaintEnter={() => {
                                if (isPainting.current) onPaintEnter(slide.id);
                            }}
                            onEdit={() => onEditSlide(slide)}
                            onDelete={() => onDeleteSlide(slide.id)}
                            onDeleteSelected={onDeleteSelected}
                        />
                    ))}
                </Box>
            </SortableContext>
            <DragOverlay>
                {isGroupDrag && activeSlide ? (
                    <GroupDragPreview
                        slide={activeSlide}
                        count={selectedIds.size}
                        backgroundUrl={backgroundUrl}
                        imageThumbnails={imageThumbnails}
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
