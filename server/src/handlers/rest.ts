import type { Express } from "express";
import type { WhatsAppClient } from "../whatsapp.js";
import QRCode from "qrcode";

export function setupRestRoutes(app: Express, wa: WhatsAppClient) {
  app.get("/api/status", (_req, res) => {
    res.json(wa.getStatus());
  });

  app.get("/api/qr", async (_req, res) => {
    const status = wa.getStatus();
    if (status.state !== "qr" || !status.qr) {
      res.status(404).json({ error: "No QR code available" });
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(status.qr, { width: 300, margin: 2 });
      res.json({ qr: dataUrl });
    } catch (e) {
      res.status(500).json({ error: "Failed to generate QR" });
    }
  });

  app.get("/api/qr/image", async (_req, res) => {
    const status = wa.getStatus();
    if (status.state !== "qr" || !status.qr) {
      res.status(404).json({ error: "No QR code available" });
      return;
    }
    try {
      const buffer = await QRCode.toBuffer(status.qr, { width: 300, margin: 2 });
      res.setHeader("Content-Type", "image/png");
      res.send(buffer);
    } catch (e) {
      res.status(500).json({ error: "Failed to generate QR" });
    }
  });

  app.get("/api/chats", (_req, res) => {
    res.json(wa.getChats());
  });

  app.get("/api/chats/:id/messages", async (req, res) => {
    const chatId = decodeURIComponent(req.params.id);
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;
    const messages = await wa.getMessagesForChat(chatId, limit, before);
    res.json(messages);
  });

  app.get("/api/contacts", (_req, res) => {
    res.json(wa.getContacts());
  });

  app.get("/api/profile-pic/:jid", async (req, res) => {
    const jid = decodeURIComponent(req.params.jid);
    const url = await wa.getProfilePicUrl(jid);
    if (url) {
      res.json({ url });
    } else {
      res.status(404).json({ error: "No profile picture" });
    }
  });

  app.post("/api/logout", async (_req, res) => {
    await wa.logout();
    res.json({ ok: true });
  });

  app.get("/api/groups/:jid", async (req, res) => {
    const jid = decodeURIComponent(req.params.jid);
    const metadata = await wa.getGroupMetadata(jid);
    if (metadata) {
      res.json(metadata);
    } else {
      res.status(404).json({ error: "Group not found" });
    }
  });
}
