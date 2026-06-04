// Time / date formatting helpers (timestamps are unix seconds).

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function isSameDay(a: number, b: number): boolean {
    if (!a || !b) return false;
    return startOfDay(new Date(a * 1000)) === startOfDay(new Date(b * 1000));
}

/** Short time, e.g. "14:05". */
export function formatTime(ts: number): string {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
}

/** Relative label for the chat list, e.g. "14:05", "Yesterday", "Mon", "12/03". */
export function formatChatTimestamp(ts: number): string {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    const now = new Date();
    const dayMs = 86_400_000;
    const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / dayMs);

    if (diffDays === 0) return formatTime(ts);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
    const dd = d.getDate().toString().padStart(2, "0");
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${dd}/${mm}`;
}

/** Full date for the in-chat day separators. */
export function formatDateSeparator(ts: number): string {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    const now = new Date();
    const dayMs = 86_400_000;
    const diffDays = Math.floor((startOfDay(now) - startOfDay(d)) / dayMs);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

/** Duration in seconds -> "m:ss". */
export function formatDuration(seconds?: number): string {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${m}:${s}`;
}

/** One-line preview of a message for the chat list. */
export function messagePreview(msg: {
    type: string;
    text?: string;
    caption?: string;
} | null): string {
    if (!msg) return "";
    switch (msg.type) {
        case "text":
            return msg.text || "";
        case "image":
            return msg.caption ? `📷 ${msg.caption}` : "📷 Photo";
        case "video":
            return msg.caption ? `🎥 ${msg.caption}` : "🎥 Video";
        case "voice":
            return "🎤 Voice message";
        case "audio":
            return "🎵 Audio";
        case "document":
            return `📄 ${msg.caption || "Document"}`;
        case "sticker":
            return "🌟 Sticker";
        case "location":
            return "📍 Location";
        default:
            return "Message";
    }
}
