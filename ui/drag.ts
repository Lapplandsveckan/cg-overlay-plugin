const RUNDOWN_ITEM_MIME = 'application/x-cg-rundown-item';

export function setRundownDragPayload(
    e: React.DragEvent,
    payload: { type: string; data?: unknown; title?: string },
) {
    e.dataTransfer.setData(RUNDOWN_ITEM_MIME, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
}
