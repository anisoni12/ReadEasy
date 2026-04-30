# ReadEasy — Setup Guide

Quick instructions for setting up ReadEasy after cloning it from GitHub.

---

## 1. Prerequisites

You need:

- **Node.js 20 or newer** — https://nodejs.org
- **pnpm** (the package manager this project uses) — install once with:
  ```bash
  npm install -g pnpm
  ```

That's it. No database, no Docker, no other system dependencies.

---

## 2. Get the code

```bash
git clone https://github.com/anisoni12/ReadEasy.git
cd ReadEasy
```

---

## 3. Install dependencies

From the project root, run:

```bash
pnpm install
```

This single command installs every package for every part of the project (the web app, the API server, the shared libraries). The whole list is already declared in the various `package.json` files — you don't need to install anything by hand.

If you're curious what the major pieces are:

| What | Why |
|---|---|
| `react`, `react-dom`, `vite`, `wouter` | The web app and its router |
| `tailwindcss`, `@radix-ui/*`, `lucide-react`, `framer-motion`, `vaul` | Styling, UI components, icons, animation, drawers |
| `pdfjs-dist` | Renders PDF pages in the browser |
| `idb-keyval` | Stores the PDF files in the browser's IndexedDB |
| `@tanstack/react-query` | Talks to the backend API |
| `express`, `pino`, `cors`, `cookie-parser` | The backend HTTP server |
| `@google/genai` | Calls the Gemini AI model from the backend |
| `zod` | Validates request and response shapes |
| `drizzle-orm` | (Included by the monorepo template; not used by ReadEasy itself.) |

---

## 4. Set up environment variables

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in any editor and fill in the values. The only ones you actually need to set are the two Gemini variables:
   - `AI_INTEGRATIONS_GEMINI_API_KEY` — get a free key at https://aistudio.google.com/apikey
   - `AI_INTEGRATIONS_GEMINI_BASE_URL` — set to `https://generativelanguage.googleapis.com`

   Everything else can stay blank. The app will run; AI features just won't work until those two are filled in.

---

## 5. Run the app locally

The project has two parts that need to run at the same time. Open two terminal windows.

**Terminal 1 — backend API:**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — web app:**
```bash
pnpm --filter @workspace/readeasy run dev
```

The web app's dev server will print a URL like `http://localhost:5173` (the exact port may vary). Open that in your browser and you're in.

> **Note:** When running outside Replit, the web app expects the API at `/api`. If your local setup serves them on different ports, you'll need to add a small dev proxy to your `vite.config.ts`. On Replit this is handled automatically by the shared proxy.

---

## 6. Useful commands

```bash
# Type-check the entire project (every app + every shared library)
pnpm run typecheck

# Build the web app for production
pnpm --filter @workspace/readeasy run build

# Build the API server for production
pnpm --filter @workspace/api-server run build
```

---

## 7. Where things live

```
ReadEasy/
├── artifacts/
│   ├── readeasy/      # The web app (React + Vite)
│   └── api-server/    # The backend (Express)
├── lib/               # Shared code (API spec, generated client, Gemini wrapper)
├── .env.example       # Environment variable template (copy to .env)
├── PROJECT_GUIDE.md   # Detailed feature + architecture guide
└── SETUP.md           # This file
```

---

## 8. Troubleshooting

- **"AI_INTEGRATIONS_GEMINI_API_KEY must be set"** when starting the API server — you forgot to copy `.env.example` to `.env` or didn't fill in the Gemini values.
- **AI features return 500** — your Gemini key is invalid or the base URL is wrong. Double-check both values in `.env`.
- **PDF won't render** — make sure your browser is up to date. PDF.js needs a recent browser.
- **Library disappears after upload** — clear your browser's site data for `localhost` and try again. The app uses IndexedDB and localStorage, both of which can be wiped by browser privacy tools.

If anything else breaks, check the `PROJECT_GUIDE.md` for a deeper explanation of how each part works.
