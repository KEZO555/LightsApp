// Singleton WebSocket client with auto-reconnect and request/response support.

type WSState = "disconnected" | "connecting" | "connected";
type Listener = (...args: any[]) => void;

class WebSocketClient {
    private ws: WebSocket | null = null;
    private url = "";
    private state: WSState = "disconnected";
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 50;
    private pending = new Map<string, { resolve: (d: any) => void; timer: ReturnType<typeof setTimeout> }>();
    private requestCounter = 0;
    private listeners = new Map<string, Set<Listener>>();

    on(event: string, fn: Listener) {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event)!.add(fn);
    }

    removeListener(event: string, fn: Listener) {
        this.listeners.get(event)?.delete(fn);
    }

    private emit(event: string, ...args: any[]) {
        this.listeners.get(event)?.forEach((fn) => {
            try {
                fn(...args);
            } catch (e) {
                console.warn("[WS] listener error:", e);
            }
        });
    }

    getState(): WSState {
        return this.state;
    }

    connect(url: string) {
        if (this.url === url && (this.state === "connected" || this.state === "connecting")) return;
        this.teardown();
        this.url = url;
        this.setState("connecting");

        try {
            this.ws = new WebSocket(url);
        } catch {
            this.setState("disconnected");
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            this.setState("connected");
        };

        this.ws.onmessage = (event) => {
            let msg: { event?: string; data?: unknown };
            try {
                msg = JSON.parse(event.data as string);
            } catch {
                return;
            }
            if (msg.event?.startsWith("response:")) {
                const id = msg.event.slice("response:".length);
                const p = this.pending.get(id);
                if (p) {
                    clearTimeout(p.timer);
                    this.pending.delete(id);
                    p.resolve(msg.data);
                }
            } else if (msg.event) {
                this.emit(msg.event, msg.data);
            }
        };

        this.ws.onclose = () => {
            this.setState("disconnected");
            this.scheduleReconnect();
        };

        this.ws.onerror = () => {
            /* onclose will follow */
        };
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnectAttempts = 0;
        this.url = "";
        this.teardown();
        this.setState("disconnected");
    }

    private teardown() {
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            try {
                this.ws.close();
            } catch {
                /* ignore */
            }
            this.ws = null;
        }
        for (const p of this.pending.values()) clearTimeout(p.timer);
        this.pending.clear();
    }

    private setState(state: WSState) {
        if (this.state === state) return;
        this.state = state;
        this.emit("state", state);
    }

    private scheduleReconnect() {
        if (!this.url || this.reconnectAttempts >= this.maxReconnectAttempts) return;
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 20000);
        this.reconnectTimer = setTimeout(() => this.connect(this.url), delay);
    }

    send(event: string, data: unknown) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ event, data }));
        }
    }

    request<T = unknown>(event: string, data: unknown, timeout = 15000): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (this.ws?.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket not connected"));
                return;
            }
            const id = `req_${++this.requestCounter}`;
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Request "${event}" timed out`));
            }, timeout);
            this.pending.set(id, { resolve, timer });
            this.ws.send(JSON.stringify({ event, data, id }));
        });
    }
}

export const wsClient = new WebSocketClient();
