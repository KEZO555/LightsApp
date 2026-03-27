import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { waClient } from "./whatsapp.js";
import { setupRestRoutes } from "./handlers/rest.js";
import type { ClientMessage, ServerMessage } from "./types.js";

const PORT = parseInt(process.env.PORT || "3001");
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json({ limit: "50mb" }));

const clients = new Set<WebSocket>();

function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

// Forward WhatsApp events to all WebSocket clients
waClient.on("connection:update", (data) => broadcast("connection:update", data));
waClient.on("messages:upsert", (data) => broadcast("messages:upsert", data));
waClient.on("messages:status", (data) => broadcast("messages:status", data));
waClient.on("chats:upsert", (data) => broadcast("chats:upsert", data));
waClient.on("chats:delete", (data) => broadcast("chats:delete", data));
waClient.on("contacts:upsert", (data) => broadcast("contacts:upsert", data));
waClient.on("presence:update", (data) => broadcast("presence:update", data));

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total)`);

  // Send current state to new client
  ws.send(JSON.stringify({ event: "connection:update", data: waClient.getStatus() }));
  ws.send(JSON.stringify({ event: "chats:upsert", data: waClient.getChats() }));
  ws.send(JSON.stringify({ event: "contacts:upsert", data: waClient.getContacts() }));

  ws.on("message", async (raw) => {
    try {
      const msg: ClientMessage = JSON.parse(raw.toString());
      const respond = (data: unknown) => {
        if (msg.id) {
          ws.send(JSON.stringify({ event: `response:${msg.id}`, data }));
        }
      };

      switch (msg.event) {
        case "message:send": {
          const { chatId, text, quotedMessageId } = msg.data as any;
          if (text) {
            const sent = await waClient.sendTextMessage(chatId, text, quotedMessageId);
            respond(sent);
          }
          break;
        }
        case "message:send-image": {
          const { chatId, imageBase64, caption, mimeType } = msg.data as any;
          const buffer = Buffer.from(imageBase64, "base64");
          const sent = await waClient.sendImageMessage(chatId, buffer, caption, mimeType);
          respond(sent);
          break;
        }
        case "message:send-voice": {
          const { chatId, audioBase64 } = msg.data as any;
          const buffer = Buffer.from(audioBase64, "base64");
          const sent = await waClient.sendVoiceMessage(chatId, buffer);
          respond(sent);
          break;
        }
        case "message:read": {
          const { chatId, messageIds } = msg.data as any;
          await waClient.markAsRead(chatId, messageIds);
          respond({ ok: true });
          break;
        }
        case "typing:update": {
          const { chatId, type } = msg.data as any;
          if (type === "composing") await waClient.sendTyping(chatId);
          else if (type === "recording") await waClient.sendRecording(chatId);
          else await waClient.sendPaused(chatId);
          break;
        }
        case "chat:fetch-messages": {
          const { chatId, limit, before } = msg.data as any;
          const messages = await waClient.getMessagesForChat(chatId, limit, before);
          respond(messages);
          break;
        }
        case "contact:profile-pic": {
          const { jid } = msg.data as any;
          const url = await waClient.getProfilePicUrl(jid);
          respond({ jid, url });
          break;
        }
        case "group:metadata": {
          const { jid } = msg.data as any;
          const metadata = await waClient.getGroupMetadata(jid);
          respond(metadata);
          break;
        }
        default:
          console.log(`[WS] Unknown event: ${msg.event}`);
      }
    } catch (e) {
      console.error("[WS] Message handling error:", e);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (${clients.size} total)`);
  });
});

setupRestRoutes(app, waClient);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  waClient.connect().catch((e) => console.error("[WA] Connection failed:", e));
});
