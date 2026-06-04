import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { waClient } from "./whatsapp.js";
import { setupRestRoutes } from "./handlers/rest.js";
import type { ClientMessage } from "./types.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

const app = express();
app.use(express.json({ limit: "32mb" }));

const server = createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set<WebSocket>();

function broadcast(event: string, data: unknown) {
  const payload = JSON.stringify({ event, data });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

// Relay WhatsApp store events to every connected app.
for (const event of [
  "connection:update",
  "messages:upsert",
  "messages:status",
  "chats:upsert",
  "chats:delete",
  "contacts:upsert",
  "presence:update",
] as const) {
  waClient.on(event, (data) => broadcast(event, data));
}

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[WS] client connected (${clients.size})`);

  // Bootstrap the new client with current state.
  ws.send(JSON.stringify({ event: "connection:update", data: waClient.getStatus() }));
  ws.send(JSON.stringify({ event: "chats:upsert", data: waClient.getChats() }));
  ws.send(JSON.stringify({ event: "contacts:upsert", data: waClient.getContacts() }));

  ws.on("message", async (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const respond = (data: unknown) => {
      if (msg.id && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: `response:${msg.id}`, data }));
      }
    };
    const d = msg.data as any;

    try {
      switch (msg.event) {
        case "message:send":
          respond(await waClient.sendText(d.chatId, d.text, d.quotedMessageId));
          break;
        case "message:send-image":
          respond(
            await waClient.sendImage(
              d.chatId,
              Buffer.from(d.imageBase64, "base64"),
              d.caption,
              d.mimeType,
            ),
          );
          break;
        case "message:send-voice":
          respond(await waClient.sendVoice(d.chatId, Buffer.from(d.audioBase64, "base64")));
          break;
        case "chat:fetch-messages":
          respond(await waClient.fetchMessages(d.chatId, d.before));
          break;
        case "message:read":
          await waClient.markAsRead(d.chatId, d.messageIds);
          respond({ ok: true });
          break;
        case "presence:set":
          await waClient.sendPresence(d.chatId, d.type);
          break;
        case "presence:subscribe":
          await waClient.subscribePresence(d.chatId);
          break;
        case "contact:resolve":
          respond(await waClient.resolveNumber(d.number));
          break;
        case "contact:profile-pic":
          respond({ jid: d.jid, url: await waClient.getProfilePicUrl(d.jid) });
          break;
        default:
          console.log(`[WS] unknown event: ${msg.event}`);
      }
    } catch (e) {
      console.error(`[WS] handler error (${msg.event}):`, e);
      respond({ error: String(e) });
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[WS] client disconnected (${clients.size})`);
  });
});

setupRestRoutes(app, waClient);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] http://0.0.0.0:${PORT}`);
  waClient.connect().catch((e) => console.error("[WA] connect failed:", e));
});
