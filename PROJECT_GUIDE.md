# ReadEasy — Project Guide

A complete reference for the ReadEasy app: what it is, what's inside it, how every feature works, and how to run, modify, or deploy it.

---

## 1. What ReadEasy is

ReadEasy is a **mobile-first web reader for PDF books**, built primarily for readers in India who want a calm, distraction-free way to read both **Hindi (Devanagari)** and **English** PDFs on their phone.

It runs entirely in the browser — no accounts, no sign-up, no cloud storage of your books. PDFs you upload stay on your device. Optional AI features (chapter summary, paragraph explanation, vocabulary helper, automatic book detection) call a small backend that talks to Google Gemini on your behalf.

**Design feel:** quiet, warm, paper-like. Serif typography, soft sepia accents, generous spacing. Inspired by the feeling of reading a paperback in low evening light.

---

## 2. Core features

### Library & uploads
- Upload any PDF up to 50 MB (Hindi or English).
- Library shows the cover thumbnail (auto-generated from the first page), title, author, and last-read page.
- "Continue Reading" section surfaces the most recently opened book.
- All metadata persists locally — close the tab and your library is still there.

### Reader
- Page-by-page reading with swipe (touch) and arrow-key (desktop) navigation.
- Three themes: **Light**, **Dark**, **Sepia** — picked once, remembered forever.
- Four font/scale sizes: small, medium, large, x-large.
- Tap the page once to summon top + bottom chrome; auto-hides after 3 seconds.
- Progress bar across the top shows how far through the book you are.

### Focus / Lock mode
A distraction-free reading lock for long sessions:
- Goes fullscreen (hides the browser address bar and OS notification banners on most mobile browsers).
- Acquires a **Screen Wake Lock** so your phone never dims or sleeps mid-paragraph.
- Hides every chrome element: top bar, bottom nav, AI button, highlights button.
- Disables tap-to-toggle so you can't accidentally summon controls.
- Leaves a small page indicator (e.g. "12 / 240") at the bottom and a tiny dismiss button in the top-right corner.
- Re-grabs the wake lock automatically if you switch tabs and come back.

### AI features (powered by Google Gemini)
All AI calls go through the backend — your browser never sees an API key.

- **Chapter / page summarize** — extracts the current page's text and returns a concise plain-language summary.
- **Paragraph explain** — paste or pick text and get a clear, simple explanation. Useful for dense passages.
- **Vocabulary helper** — for any word, get part of speech, plain-English meaning, an example sentence, and (when the word is in Devanagari) the Hindi → English translation.
- **Automatic book detection** — when you open a brand-new upload, the first page's text is sent to Gemini, which infers the title, author, genre, and language. The library is updated automatically. Falls back gracefully when the first page is image-only.

### Highlights & notes
- Tap the highlighter button while reading to capture a highlight on the current page.
- Pick a color tag: amber, green, blue, pink, or plain.
- Add an optional note text beside the highlight.
- The notes drawer lists every highlight across the book with a page badge — tap a badge to jump straight to that page.
- All highlights and notes are stored locally per book.

### Open Library discovery
- Once a book has a known title, a "similar books" panel can be opened.
- Pulls real recommendations from the public Open Library API (no key required).
- Each recommendation shows cover, title, author, and a "Find PDF" button that searches Google for a free copy.

### Persistence
- **PDF bytes** are stored in the browser's IndexedDB (via `idb-keyval`) — large blobs go where they belong.
- **Metadata, theme, font size, last page, highlights, notes** are stored in `localStorage`.
- Nothing is ever uploaded to a server you don't control. AI calls send only the relevant snippet of text, never the whole PDF.

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS, shadcn/ui components, Radix primitives |
| Drawers / sheets | Vaul (mobile-style bottom sheets), Radix Sheet (side panels) |
| Icons | lucide-react |
| Animation | framer-motion |
| Routing | wouter (tiny SPA router) |
| PDF rendering | pdfjs-dist (Mozilla's PDF.js) |
| Local persistence | idb-keyval (PDFs) + localStorage (metadata) |
| Backend | Express 5 + TypeScript, Pino logging |
| API contract | OpenAPI spec → Orval-generated React Query hooks + Zod schemas |
| AI provider | Google Gemini (`gemini-2.5-flash`) via `@workspace/integrations-gemini-ai` |
| Validation | Zod |

---

## 4. Project layout

```
artifacts-monorepo/
├── artifacts/
│   ├── readeasy/                  # The web app (React + Vite)
│   │   ├── src/
│   │   │   ├── pages/             # home.tsx, reader.tsx
│   │   │   ├── components/Reader/ # pdf-renderer, ai-panel, discovery-panel, notes-panel
│   │   │   ├── components/ui/     # shadcn primitives (button, sheet, drawer, etc.)
│   │   │   ├── hooks/             # use-books, use-notes, use-focus-mode, use-discovery, use-theme
│   │   │   ├── lib/               # pdf-utils.ts, idb.ts, utils
│   │   │   └── index.css          # design tokens, themes
│   │   └── ...
│   ├── api-server/                # Express backend
│   │   └── src/routes/ai.ts       # /ai/summarize, /ai/explain, /ai/vocabulary, /ai/detect-book
│   └── mockup-sandbox/            # Internal — component preview server
├── lib/
│   ├── api-spec/                  # OpenAPI spec; Orval generates client + server types
│   ├── api-client-react/          # generated React Query hooks
│   └── integrations-gemini-ai/    # thin wrapper around the Gemini client
└── pnpm-workspace.yaml
```

---

## 5. How each part wires together

### Loading and rendering a PDF
1. User uploads a PDF on `home.tsx`.
2. The file is read as `ArrayBuffer`, stored in IndexedDB under a generated `bookId`, and a metadata record is written synchronously to `localStorage` (so navigation can never lose it).
3. App navigates to `/read/:bookId`.
4. `reader.tsx` reads the bytes back from IndexedDB, hands them to `pdfjs-dist` to produce a `pdfDoc`, and tracks `currentPage` in state.
5. `<PdfRenderer />` renders the requested page to a canvas at the chosen scale.

### AI flow (e.g. summarize)
1. The reader extracts the current page's text via `pdfjs-dist`.
2. The frontend calls a generated hook like `useAiSummarize({ data: { text } })`.
3. The hook hits `POST /api/ai/summarize`.
4. The Express handler validates the body with a Zod schema, builds a prompt, and calls Gemini through the workspace integration.
5. The response is parsed back into the schema and returned as JSON.
6. The hook gives the React component the typed result, which the AI drawer renders.

### Auto book detection (one-shot, safe)
- When you first open a freshly uploaded book on page 1, the reader extracts the page text.
- If the text is at least 20 characters, it's sent to `/api/ai/detect-book` exactly once per book (guarded by a ref).
- If the page is image-only and there's no extractable text, the call is skipped entirely and the title stays as "Untitled book" — no spurious 500s.
- On success, the library entry is updated with the detected title and author, and the discovery panel pops open with similar-book suggestions.

### Focus mode
- Calls `navigator.wakeLock.request('screen')` so the device doesn't sleep.
- Calls `document.documentElement.requestFullscreen()` for immersive mode.
- Adds a `visibilitychange` listener that re-acquires the wake lock if the tab becomes visible again (the OS auto-releases it when hidden).
- Exiting (X button or pressing Esc / leaving fullscreen) tears down both APIs cleanly.

### Highlights & notes
- `use-notes.ts` is a localStorage-backed hook keyed by `bookId`.
- Each note has: `id`, `page`, `color`, `highlight` text, optional `note` text, `createdAt`.
- The notes drawer is sorted by page and lets you jump back to any page in one tap.

---

## 6. Running the project locally

The project uses pnpm workspaces and runs through Replit workflows. You don't typically run `pnpm dev` from the root.

The three workflows:
- **`artifacts/api-server: API Server`** — `pnpm --filter @workspace/api-server run dev` (Express on a dynamically assigned port, mounted at `/api` through the proxy).
- **`artifacts/readeasy: web`** — `pnpm --filter @workspace/readeasy run dev` (Vite, mounted at `/`).
- **`artifacts/mockup-sandbox: Component Preview Server`** — internal preview; not user-facing.

Useful commands:
```bash
pnpm run typecheck         # full workspace type check (libs + apps)
pnpm --filter @workspace/api-spec run codegen   # regenerate API hooks/schemas after editing the OpenAPI spec
```

Environment / secrets the backend uses:
- The Gemini integration is provided via the `@workspace/integrations-gemini-ai` package — no manual API key handling in app code.
- `SESSION_SECRET` is present but not currently used by any route (placeholder for future auth-style features).

---

## 7. API surface

All routes are mounted under `/api`.

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/ai/summarize` | `{ text }` | `{ summary }` |
| POST | `/api/ai/explain` | `{ text, context? }` | `{ explanation }` |
| POST | `/api/ai/vocabulary` | `{ word, context? }` | `{ word, partOfSpeech, meaning, example, meaningHindi? }` |
| POST | `/api/ai/detect-book` | `{ text }` | `{ title, author, genre?, language? }` |

The OpenAPI spec lives at `lib/api-spec/openapi.yaml`. After editing it, run the codegen command above and both the React Query hooks and Zod validators stay in sync.

---

## 8. Build chronology — what was done, in order

1. **Bootstrap** — created the `readeasy` web artifact (React + Vite) and the `api-server` artifact (Express).
2. **Backend AI routes** — added `/ai/summarize`, `/ai/explain`, `/ai/vocabulary`, `/ai/detect-book` using the workspace Gemini integration and Zod for input/output validation. Defined the contract in OpenAPI and generated typed React hooks for the frontend.
3. **Reader UI (frontend foundation)** — built the home/library page, the reader page, PDF rendering with `pdfjs-dist`, light/dark/sepia themes, font-size cycling, page navigation, swipe support, and the AI drawer (Vaul) for summarize / explain / vocabulary.
4. **Discovery panel** — added an Open Library-backed "similar books" side panel that opens once a book's title is known.
5. **Persistence hardening** — fixed an early bug where books could disappear after upload by writing to localStorage **before** navigation, and by reading the book reactively from the store inside the reader.
6. **Highlights & notes** — added the `use-notes` hook, the highlighter button in the reader chrome, and a side drawer with color tags and per-page jump links.
7. **Focus / Lock mode** — added `use-focus-mode` (Wake Lock + Fullscreen APIs), the focus button in the top chrome, the discreet exit affordance, and a subtle page indicator. Removed the `max-w-md` cap on phones and tightened reader padding for a larger reading area.
8. **QA pass** — full workspace typecheck (clean), inspected server and browser logs, and fixed two real bugs surfaced there:
   - `detect-book` returned 500 when page 1 had no extractable text (image-only cover). Backend now returns a neutral default; frontend skips the call entirely if text is too short.
   - `detect-book` was being called multiple times per book due to effect re-runs. Added a one-shot ref guard plus an `AbortController`-style cancellation in the effect cleanup.
9. **GitHub** — connected the project to a GitHub repository so the entire codebase lives under version control on the user's account.

---

## 9. Known limitations & future ideas

- Book thumbnails are stored as data URLs inside `localStorage`. Fine for tens of books; if a user uploads hundreds, the thumbnail store should be moved to IndexedDB too.
- AI calls are not currently rate-limited per user. For a public deployment, add a simple rate limiter or per-IP quota.
- No full-text search across books yet — would need a per-book text index built on first open.
- No PWA / offline install yet. The app already works offline for already-loaded books, but a service worker + manifest would make it installable as a real home-screen app.
- No share / export of highlights — easy follow-up.

---

## 10. Deployment

The app is ready to publish from Replit. When deployed:
- The frontend is built to static assets and served from `/`.
- The Express API is served from `/api` through the same shared proxy, so no CORS or extra config is needed.
- Gemini is accessed through the workspace integration in production exactly as in development — no separate key setup.

That's the whole project — frontend, backend, AI, persistence, focus mode, highlights, discovery, and the cleanups along the way.
