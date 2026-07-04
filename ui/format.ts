export function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.round(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    return formatTime(seconds);
}
