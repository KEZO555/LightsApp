type WSState = "disconnected" | "connecting" | "connected";
type Listener = (...args: any[]) => void;

class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string = "";
    private state: WSState = "disconnected";
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 20;
    private pendingRequests = new Map<string, { resolve: (data: any) => void; timer: ReturnType<typeof setTimeout> }>();
    private requestCounter = 0;
    private listeners = new Map<string, Set<Listener>>();

    on(event: string, listener: Listener) {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event)!.add(listener);
    }

    removeListener(event: string, listener: Listener) {
        this.listeners.get(event)?.delete(listener);
    }

    private emit(event: string, ...args: any[]) {
        this.listeners.get(event)?.forEach((fn) => {
            try { fn(...args); } catch (e) { console.warn("[WS] Listener error:", e); }
        });
    }

    getState(): WSState {
        return this.state;
    }

    connect(url: string) {
        if (this.url === url && this.state === "connected") return;

        this.disconnect();
        this.url = url;
        this.state = "connecting";
        this.emit("state", this.state);

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.state = "connected";
                this.reconnectAttempts = 0;
                this.emit("state", this.state);
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data as string);
                    if (msg.event?.startsWith("response:")) {
                        const reqId = msg.event.replace("response:", "");
                        const pending = this.pendingRequests.get(reqId);
                        if (pending) {
                            clearTimeout(pending.timer);
                            this.pendingRequests.delete(reqId);
                            pending.resolve(msg.data);
                        }
                    } else {
                        this.emit(msg.event, msg.data);
                    }
                } catch (e) {
                    console.warn("[WS] Failed to parse message:", e);
                }
            };

            this.ws.onclose = () => {
                this.state = "disconnected";
                this.emit("state", this.state);
                this.scheduleReconnect();
            };

            this.ws.onerror = () => {};
        } catch (e) {
            this.state = "disconnected";
            this.emit("state", this.state);
            this.scheduleReconnect();
        }
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = 0;
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            this.ws.onopen = null;
            this.ws.close();
            this.ws = null;
        }
        for (const [, pending] of this.pendingRequests) {
            clearTimeout(pending.timer);
        }
        this.pendingRequests.clear();
        this.state = "disconnected";
        this.emit("state", this.state);
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.url) return;
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
        this.reconnectTimer = setTimeout(() => {
            this.connect(this.url);
        }, delay);
    }

    send(event: string, data: unknown) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event, data }));
        }
    }

    request<T = unknown>(event: string, data: unknown, timeout = 15000): Promise<T> {
        return new Promise((resolve, reject) => {
            const id = `req_${++this.requestCounter}`;
            const timer = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Request ${event} timed out`));
            }, timeout);

            this.pendingRequests.set(id, { resolve, timer });

            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ event, data, id }));
            } else {
                clearTimeout(timer);
                this.pendingRequests.delete(id);
                reject(new Error("WebSocket not connected"));
            }
        });
    }
}

export const wsClient = new WebSocketClient();
