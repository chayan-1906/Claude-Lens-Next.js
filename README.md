<div align="center">

# 🔍 Claude Lens

### Browse and chat with your Claude Code sessions — on your Mac

[![Version](https://img.shields.io/badge/version-1.1.0-6C5CE7?style=for-the-badge)](https://github.com/chayan-1906/Claude-Lens-Next.js/releases/tag/v1.1.0)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**Browse • Chat • Search — a polished macOS app for your Claude Code sessions**

[⬇ Download](https://github.com/chayan-1906/Claude-Lens-Next.js/releases/tag/v1.1.0) · [🐛 Report Bug](https://github.com/chayan-1906/Claude-Lens-Next.js/issues) · [✨ Request Feature](https://github.com/chayan-1906/Claude-Lens-Next.js/issues)

---

<img src="https://raw.githubusercontent.com/chayan-1906/Claude-Lens-Next.js/master/public/assets/logo.png" alt="Claude Lens logo" width="120" />

*The web UI half of Claude Lens — pairs with the [Express backend →](https://github.com/chayan-1906/Claude-Lens-Node.js)*

</div>

## 🎯 Overview

**Claude Lens** wraps your local **Claude Code** CLI in a polished web UI that runs on your Mac. It is two things at once:

- 🗂️ **A searchable archive** of every past Claude Code session — projects, messages, tasks, and memories — rendered as clean markdown with syntax highlighting.
- 💬 **A live chat client** — start and resume real Claude Code sessions from a browser window, with streaming responses, tool approvals, image uploads, and voice input.

The best part: **no Anthropic API key required.** Claude Lens drives *your own* Claude Pro/Max subscription by spawning the `claude` CLI locally — you already pay for Claude, and Claude Lens is just the interface. Everything runs on your own machine and your own MongoDB; nothing is exposed to the public internet.

> This repository is the **Next.js frontend**. It talks to a companion **[Express backend](https://github.com/chayan-1906/Claude-Lens-Node.js)** over REST + WebSocket. The two are packaged together into a single macOS `.dmg` app — no Node.js install needed on the target Mac.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 💬 **Live chat over WebSocket** | Stream real Claude Code responses right in the browser, rendered smoothly token-by-token |
| 🔀 **Model & thinking control** | Switch between Opus / Sonnet / Haiku, choose an effort level, and toggle extended thinking — mid-conversation |
| 🛡️ **Tool approvals** | Approve, *Allow All*, or deny each tool call from a pinned prompt — with an optional reason and a diff preview |
| 🎨 **14 themes × light/dark** | 28 hand-tuned palettes (Carbon, Ocean, Synthwave, Matrix, Midnight…) applied instantly with no flash |
| 🔍 **Full-text search** | Search across messages, sessions, tasks, and memories — scoped to a session, a project, or everything |
| 🎙️ **Voice input** | Speak your prompt — transcribed by Groq Whisper and tidied up before sending *(needs a Groq key)* |
| 🔊 **Read aloud** | Have Claude's replies spoken back with natural neural voices, including live read-along while streaming |
| 🖼️ **Attachments** | Drag-drop or paste images and files — auto-resized and stored in Cloudflare R2 |
| 🔌 **IDE bridge** | See your connected IDE's status and the file you're editing, live |
| 📄 **PDF & ZIP export** | Export any session to PDF (optionally with thinking/tools), or back up whole projects to ZIP and re-import |
| 🗂️ **Session browser** | Browse projects, sessions, tasks, and memories with markdown + syntax highlighting; rename or delete |

---

## 📸 Screenshots

> 📸 *Screenshots coming soon. The shots below show Claude Lens with **no private conversation data** — the onboarding screen, the theme system, and the approval/search UI.*

<!-- Paste your image URLs into the empty src="" slots below -->

|                                 New-chat screen                                 |                                Theme gallery                                 |
|:-------------------------------------------------------------------------------:|:----------------------------------------------------------------------------:|
| <img width="480" alt="New chat — project picker and capability rows" src="" /> |    <img width="480" alt="14 color schemes × light and dark" src="" />       |
|                              **Tool approval prompt**                            |                              **Global search**                               |
| <img width="480" alt="Approve, Allow All, or Deny a tool call" src="" />        | <img width="480" alt="Search across messages, sessions, tasks, memories" src="" /> |

---

## 🏗️ Architecture

Everything runs locally on macOS. MongoDB and Cloudflare R2 are the only remote pieces.

```
                              ┌──────────────────── your Mac ────────────────────-┐
                              │                                                   │
   ┌───────────┐   HTTP       │   ┌───────────────────────────┐                   │
   │  Browser  │ ─────────────┼──▶│  Next.js  (this repo)     │                   │
   │   (UI)    │              │   │  :3000 dev · :20262 app   │                   │
   └─────┬─────┘              │   └─────────────┬─────────────┘                   │
         │                    │      server actions (HTTP, server-side)           │
         │  WebSocket  /ws    │                 │                                 │
         │                    │                 ▼                                 │
         │                    │   ┌───────────────────────────┐   spawns          │
         └────────────────────┼──▶│  Express backend  :20261  │ ──────────▶  claude CLI
                              │   │  (Claude-Lens-Node.js)    │           (your subscription)
                              │   └──────┬─────────────┬──────┘                   │
                              │  mongoose│             │ S3 API                   │
                              └──────────┼─────────────┼──────────────────────────┘
                                         ▼             ▼
                                      MongoDB     Cloudflare R2
```

- **Frontend (this repo)** — a Next.js 16 App Router app (`output: 'standalone'`). The browser loads the UI over HTTP; every archive read/write goes through **server actions that call the backend's REST API server-side** — the browser never hits the REST API directly. Live chat runs over a **WebSocket the browser opens straight to the backend**.
- **Backend ([companion repo](https://github.com/chayan-1906/Claude-Lens-Node.js))** — an Express + `ws` server on port `20261`. It spawns the `claude` CLI, streams its `stream-json` output back over the WebSocket, syncs session history into MongoDB, and stores attachments in Cloudflare R2.
- **Packaging** — both halves ship together inside a macOS `.dmg` (`.app`) with a portable Node runtime, so end users don't need to install anything.

---

## 🛠️ Tech Stack

### ⚛️ Framework & Runtime

| Technology | Purpose |
|------------|---------|
| **Next.js 16.2.6** | App Router, Server Actions, `output: 'standalone'` |
| **React 19.2.3** | UI, with the **React Compiler** enabled |
| **TypeScript 5.9.3** | Strict, fully-typed API + component layer |
| **Cache Components** | Next 16 `use cache` with tag + time-based revalidation |

### 🎨 Styling & Content

| Technology | Purpose |
|------------|---------|
| **Tailwind CSS v4** | Config-less PostCSS setup; 14-theme system via CSS variables |
| **react-icons** | Icon set across the whole UI |
| **react-markdown + remark-gfm** | GitHub-flavored markdown rendering |
| **rehype-highlight + highlight.js** | Code block syntax highlighting |

### 🧩 Utilities & Tooling

| Technology | Purpose |
|------------|---------|
| **clsx + tailwind-merge** | Conditional class composition |
| **JSZip** | Client-side ZIP read/normalize for project import |
| **ESLint 9** (`eslint-config-next`) | Linting |
| **next-devtools-mcp** | Next.js DevTools MCP for AI-assisted development |

### 🟢 Backend Companion

| Technology | Purpose |
|------------|---------|
| **Express 5 · ws · Mongoose 9** | REST + WebSocket API that spawns the `claude` CLI → [Claude-Lens-Node.js](https://github.com/chayan-1906/Claude-Lens-Node.js) |

---

## 🚀 Getting Started

### Option 1 — Download the macOS app

1. Grab the latest **`.dmg`** from [Releases](https://github.com/chayan-1906/Claude-Lens-Next.js/releases/tag/v1.1.0)
2. Drag **Claude Lens** into Applications and launch it
3. On first run, enter your **MongoDB URI** in the setup screen

> No Node.js required — the app bundles the backend, a portable Node runtime, and the standalone frontend.

### Option 2 — Run from source

**Prerequisites**

- **Node.js** 20+
- The **[Claude Lens backend](https://github.com/chayan-1906/Claude-Lens-Node.js)** running locally (port `20261`)
- A **MongoDB** connection string (Atlas or self-hosted)
- **Cloudflare R2** credentials — required for live chat (the message box stays disabled until R2 is configured)
- *(Optional)* A **Groq API key** — only needed for voice-to-text input

**Installation**

1. **Clone the repository**

   ```bash
   git clone https://github.com/chayan-1906/Claude-Lens-Next.js.git
   cd Claude-Lens-Next.js
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   ```env
   # Base URL of the Claude Lens backend (server-side REST calls)
   BACKEND_URL=http://localhost:20261

   # WebSocket URL of the backend (used in the browser)
   NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:20261/ws
   ```

4. **Start the dev server**

   ```bash
   npm run dev
   ```

5. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000).

On first load you'll hit the **`/setup`** screen — connect your MongoDB and you're in.

---

## ⚙️ First-Run Setup

The `/setup` screen (proxy-gated by a cookie until configured) wires up everything the app needs:

- 🗄️ **MongoDB connections** — add multiple named databases and switch between them
- ☁️ **Cloudflare R2** — **required for chat**; stores image and file attachments
- 🔀 **Path mappings** — alias the same project across machines to one canonical path
- 🎙️ **Groq API key** — *optional*; enables voice-to-text
- 👤 **Claude account** — pick which `~/.claude*` config the CLI should use
- 🔊 **Voice & speed** — default text-to-speech voice for read-aloud

---

## 🗂️ Project Structure

```
project/
├── public/assets/logo.png
├── src/
│   ├── app/
│   │   ├── (app)/                      # Gated route group (sidebar + theme provider)
│   │   │   ├── page.tsx                # Projects home
│   │   │   ├── c/[sessionId]/          # Chat session view (and /c/new)
│   │   │   ├── m/[projectDir]/         # Memory viewer
│   │   │   └── t/[sessionId]/[taskId]/ # Task detail
│   │   ├── api/tts/route.ts            # Text-to-speech proxy → backend
│   │   ├── setup/page.tsx              # First-run setup (outside the gate)
│   │   ├── globals.css                 # Tailwind v4 + 14-theme tokens
│   │   └── layout.tsx
│   ├── actions/                        # Server actions → backend REST API
│   ├── components/                     # 50+ UI components (chat, sidebar, modals…)
│   ├── hooks/                          # useClaudeChat, useTextToSpeech, useVoiceInput…
│   ├── types/                          # Typed API shapes & enums
│   ├── utils/                          # apis.ts, ApiResponse.ts, formatting helpers
│   ├── config/config.ts                # Environment variables
│   └── proxy.ts                        # Setup gate (Next 16 middleware entrypoint)
├── next.config.ts                      # standalone + React Compiler + Cache Components
└── package.json
```

---

## 🔑 Core Features in Depth

### 💬 Live chat & streaming
A single `useClaudeChat` hook owns the WebSocket connection — heartbeat, exponential-backoff reconnect, streaming buffer, and a tool-approval queue. Responses render token-by-token; auto-scroll follows new content but pauses the moment you scroll up to read.

### 🛡️ Tool approvals
When Claude wants to run a tool, a card pins above the input: **Approve**, **Allow All** (persisted to the project's `settings.local.json`), or **Deny** with a reason. Edits and writes show a full diff; Bash shows the exact command; MCP tools show their JSON input.

### 🎨 Theming
14 color schemes × light/dark = 28 palettes, driven entirely by CSS custom properties on `<html>`. Switching a theme is a `data-*` swap — no re-render, and no flash of unstyled content (the active theme is set synchronously before first paint).

### 🔍 Search
Search messages, sessions, tasks, and memories with a live two-pane modal — scoped to the current session, the current project, or globally — with highlighted snippets and instant preview.

### 🎙️ Voice & 🔊 read-aloud
Speak a prompt and it's transcribed by Groq Whisper and cleaned up before sending. Any assistant reply can be read back with natural neural voices, including live read-along as the response streams.

### 📄 Export & 📦 import
Export a session to PDF (optionally including thinking blocks and tool calls), download a whole project as a ZIP backup, or import a ZIP — remapping the project path if you're restoring on a different machine.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

---

## 🔒 Design Notes

- 🏠 **Local-first** — no public tunnel, no cloud relay. The frontend talks only to a backend on your own machine.
- 🔑 **Your subscription is the runtime** — the backend spawns the `claude` CLI; there is **no Anthropic SDK or API key** anywhere in the codebase.
- 🧩 **Pure consumer** — all data access flows through the backend REST/WebSocket API via typed server actions.
- ⚡ **Bleeding-edge stack** — Next 16 + React 19 + React Compiler + Tailwind v4, with no state library (just React and one well-tuned hook).

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

<div align="center">

**Padmanabha Das**

[![GitHub](https://img.shields.io/badge/GitHub-chayan--1906-181717?style=for-the-badge&logo=github)](https://github.com/chayan-1906)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Padmanabha_Das-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/padmanabha-das-59bb2019b)
[![Email](https://img.shields.io/badge/Email-Contact-EA4335?style=for-the-badge&logo=gmail)](mailto:padmanabhadas9647@gmail.com)

</div>

---

<div align="center">

**Built with ❤️ using Next.js, React, and your own Claude subscription**

⭐ **Star this repo if you found it helpful!** ⭐

*Your sessions. Your Mac. Zero API keys.*

</div>
