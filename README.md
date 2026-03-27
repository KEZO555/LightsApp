<p align="center">
  <img src="assets/images/icon.png" alt="LightsApp Icon" width="80">
</p>

<h1 align="center">LightsApp</h1>
<p align="center"><strong>WhatsApp client for Light Phone 3</strong></p>
<p align="center">Minimal • E-ink Optimized • Private</p>

<p align="center">
  <img src="assets/images/screenshots/hero.png" alt="LightsApp Hero" width="600">
</p>

---

## Screenshots

<p align="center">
  <img src="assets/images/screenshots/chat_list.png" alt="Chat List" width="200">
  &nbsp;&nbsp;
  <img src="assets/images/screenshots/chat_conversation.png" alt="Chat Conversation" width="200">
  &nbsp;&nbsp;
  <img src="assets/images/screenshots/qr_setup.png" alt="QR Setup" width="200">
  &nbsp;&nbsp;
  <img src="assets/images/screenshots/settings.png" alt="Settings" width="200">
</p>

## Features

- 💬 **Full WhatsApp messaging** — Send and receive text, images, and voice messages
- 👥 **Group chats** — View and participate in group conversations
- 🔗 **QR code linking** — Connect to WhatsApp via QR scan (WhatsApp Web protocol)
- 🖤 **E-ink optimized** — High contrast black & white UI designed for the Light Phone 3 display
- ⚡ **Lightweight** — Minimal resource usage, fast on low-powered hardware
- 🔔 **Notifications** — Stay notified of new messages
- 🔄 **Invert colors** — Toggle between dark and light modes
- 🔒 **Private** — Messages stay on your device; connects through your own server

## How It Works

LightsApp connects to a self-hosted WhatsApp Web bridge server via WebSocket. The server handles the WhatsApp Web protocol, and the app provides a minimal UI optimized for the Light Phone 3's e-ink display.

**Architecture:**
```
Light Phone 3 (LightsApp) ←→ WebSocket ←→ Bridge Server ←→ WhatsApp Web
```

## Installation

### Download APK
1. Go to [Releases](https://github.com/KEZO555/LightsApp/releases) and download the latest `.apk`
2. Transfer to your Light Phone 3
3. Install and open

### Build from Source

```bash
# Install dependencies
bun install

# Build and run (dev)
bunx expo run:android

# Build release APK
eas build -p android --profile production --local
```

## Setup

1. **Set up a WhatsApp Web bridge server** (e.g. using [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) or similar)
2. Open LightsApp → **Settings** → Enter your server URL
3. Go to **QR Setup** and scan the QR code with WhatsApp on your main phone
4. Start chatting!

## Commands

```bash
bunx expo run:android       # Build and run (dev)
eas build -p android --profile production --local  # Build APK locally
bun run sync-version        # Sync version across files
bun run generate-icon       # Generate icon from app name
```

## Tech Stack

- [Expo](https://expo.dev) + [React Native](https://reactnative.dev)
- [Expo Router](https://docs.expo.dev/router/introduction/) for navigation
- WebSocket for real-time communication
- Built on the [light-template](https://github.com/vandamd/light-template) for LightOS

## Detailed Docs

See [CLAUDE.md](./CLAUDE.md) for complete component reference, patterns, and examples.

---

<p align="center">Built for the <a href="https://www.thelightphone.com/">Light Phone 3</a></p>
