export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatMessageTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateSeparator(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export function isSameDay(ts1: number, ts2: number): boolean {
    const d1 = new Date(ts1 * 1000);
    const d2 = new Date(ts2 * 1000);
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

export function getMessagePreview(msg: { type: string; text?: string; caption?: string } | null): string {
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
            return msg.caption || "📄 Document";
        case "sticker":
            return "Sticker";
        default:
            return "";
    }
}

export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}
