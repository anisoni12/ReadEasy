# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

- **readeasy** (web, `/`) — Mobile-first PDF reader for Hindi & English. PDF.js rendering with swipe navigation, light/dark/sepia themes, font sizing. AI features (chapter summary, paragraph explain, vocabulary helper, book detection) via Gemini through `/api/ai/*`. Open Library recommendations. PDF bytes stored in IndexedDB (`idb-keyval`), metadata in localStorage. No accounts, no DB.
- **api-server** (api, `/api`) — Hosts `/api/ai/{summarize,explain,vocabulary,detect-book}` using `@workspace/integrations-gemini-ai` (Gemini 2.5 Flash). Esbuild bundles `@google/genai` (do not externalize).

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
