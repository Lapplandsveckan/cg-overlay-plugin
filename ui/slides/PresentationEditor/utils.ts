import { arrayMove } from '@dnd-kit/sortable';
import { type Slide } from '../api';

export const calculateNewOrder = (
    slides: Slide[],
    activeId: string,
    overId: string,
    selectedIds: Set<string>,
): Slide[] => {
    if (selectedIds.has(activeId) && selectedIds.size > 1) {
        // Multiple slides selected - move as group
        const activeIndex = slides.findIndex(s => s.id === activeId);
        const overIndex = slides.findIndex(s => s.id === overId);
        if (activeIndex === -1 || overIndex === -1) return slides;

        const draggingUp = activeIndex > overIndex;
        const moving = slides.filter(s => selectedIds.has(s.id));
        const remaining = slides.filter(s => !selectedIds.has(s.id));

        const insertBefore = remaining.findIndex(s => {
            const idx = slides.indexOf(s);
            return draggingUp ? idx >= overIndex : idx > overIndex;
        });

        if (insertBefore === -1) {
            return [...remaining, ...moving];
        }

        return [
            ...remaining.slice(0, insertBefore),
            ...moving,
            ...remaining.slice(insertBefore),
        ];
    }

    // Single slide - use standard array move
    const oldIndex = slides.findIndex(s => s.id === activeId);
    const newIndex = slides.findIndex(s => s.id === overId);
    if (oldIndex === -1 || newIndex === -1) return slides;

    return arrayMove(slides, oldIndex, newIndex);
};
