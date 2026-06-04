import type { Express } from "express";
import QRCode from "qrcode";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import type { WhatsAppClient } from "../whatsapp.js";
import { MEDIA_PATH } from "../whatsapp.js";

const safeName = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

export function setupRestRoutes(app: Express, wa: WhatsAppClient) {
  app.get("/api/status", (_req, res) => {
    res.json(wa.getStatus());
  });

  app.get("/api/qr/image", async (_req, res) => {
    const status = wa.getStatus();
    if (status.state !== "qr" || !status.qr) {
      res.status(404).json({ error: "No QR available" });
      return;
    }
    try {
      const buffer = await QRCode.toBuffer(status.qr, { width: 320, margin: 2 });
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-store");
      res.send(buffer);
    } catch {
      res.status(500).json({ error: "QR render failed" });
    }
  });

  app.get("/api/chats", (_req, res) => res.json(wa.getChats()));
  app.get("/api/contacts", (_req, res) => res.json(wa.getContacts()));

  app.get("/api/chats/:id/messages", async (req, res) => {
    const chatId = decodeURIComponent(req.params.id);
    const before = req.query.before as string | undefined;
    res.json(await wa.fetchMessages(chatId, before));
  });

  // Lazily download + disk-cache media, then serve the bytes.
  app.get("/media/:chatId/:id", async (req, res) => {
    const chatId = decodeURIComponent(req.params.chatId);
    const id = req.params.id;
    const cacheFile = join(MEDIA_PATH, `${safeName(chatId)}_${safeName(id)}.bin`);

    try {
      let buffer: Buffer | null = existsSync(cacheFile) ? readFileSync(cacheFile) : null;
      if (!buffer) {
        buffer = await wa.downloadMedia(chatId, id);
        if (buffer) writeFileSync(cacheFile, buffer);
      }
      if (!buffer) {
        res.status(404).json({ error: "Media unavailable" });
        return;
      }
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.send(buffer);
    } catch (e) {
      console.error("[REST] media error:", e);
      res.status(500).json({ error: "Media download failed" });
    }
  });

  app.post("/api/logout", async (_req, res) => {
    await wa.logout();
    res.json({ ok: true });
  });
}
