/**
 * Formats a date string into a human-readable relative time.
 * e.g. "2s ago", "5m ago", "3h ago", "2d ago", "Jan 15"
 */
function formatRelativeDate(dateString: string): string {
    const now: number = Date.now();
    const date: number = new Date(dateString).getTime();
    const diffMs: number = now - date;
    const diffSeconds: number = Math.floor(diffMs / 1000);
    const diffMinutes: number = Math.floor(diffSeconds / 60);
    const diffHours: number = Math.floor(diffMinutes / 60);
    const diffDays: number = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    const dateObj: Date = new Date(dateString);
    const month: string = dateObj.toLocaleString('en-US', {month: 'short'});
    const day: number = dateObj.getDate();

    if (dateObj.getFullYear() === new Date().getFullYear()) {
        return `${month} ${day}`;
    }

    return `${month} ${day}, ${dateObj.getFullYear()}`;
}

export {formatRelativeDate};
