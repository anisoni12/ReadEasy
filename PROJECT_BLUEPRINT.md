# ReadEasy - Complete Project Blueprint

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File-by-File Breakdown](#file-by-file-breakdown)
4. [Issues Found and Fixed](#issues-found-and-fixed)
5. [Why These Issues Occurred](#why-these-issues-occurred)
6. [Development Setup](#development-setup)

---

## Project Overview

**ReadEasy** is a mobile-first, distraction-free PDF reader application with AI-powered features. It runs entirely in the browser with no backend storage required for user data.

### Key Features
- **PDF Reading**: Upload and read PDFs with page navigation
- **AI Integration**: Summarize, explain, get vocabulary help, and auto-detect book metadata using Google Gemini AI
- **Local Persistence**: All PDFs, thumbnails, notes, and reading progress stored locally (IndexedDB + localStorage)
- **Calm UI**: Sepia-themed, distraction-free reading experience with focus mode
- **Notes & Highlights**: Take notes and highlight passages
- **Book Discovery**: Find similar books via Open Library API

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Express 5 + TypeScript (for AI API proxy)
- **AI**: Google Gemini 2.0/2.5 Flash
- **PDF Rendering**: PDF.js
- **Storage**: IndexedDB (via idb-keyval) + localStorage
- **Routing**: Wouter (lightweight React router)
- **State Management**: React hooks + TanStack Query
- **Package Manager**: pnpm (monorepo workspace)

---

## Architecture

### Monorepo Structure
```
ReadEasy/
├── artifacts/
│   ├── readeasy/          # Frontend React application
│   └── api-server/        # Backend Express server (AI proxy)
├── lib/
│   ├── api-client-react/  # Auto-generated API client for React
│   ├── api-spec/          # OpenAPI specification
│   ├── api-zod/           # Zod schemas for API validation
│   └── integrations-gemini-ai/  # Gemini AI integration library
├── scripts/               # Build and utility scripts
├── package.json           # Root package (workspace config)
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── tsconfig.json          # Root TypeScript config
```

### Data Flow
1. **PDF Upload**: User uploads PDF → `generatePdfThumbnail()` → `savePdfBytes()` (IndexedDB) → metadata in localStorage
2. **Reading**: `getPdfBytes()` → PDF.js renders page → user reads
3. **AI Features**: Frontend sends text to backend → Backend calls Gemini API → Returns response
4. **Progress**: Every page change → `updateBookProgress()` → localStorage
5. **Notes**: User adds note → `useNotes()` hook → localStorage

---

## File-by-File Breakdown

### Root Configuration Files

#### `package.json`
**Purpose**: Root package.json defining the monorepo workspace and shared scripts.

**Key Sections**:
- `packageManager: "pnpm@10.33.2"` - Ensures consistent pnpm version
- `scripts.dev` - Runs both frontend and backend dev servers concurrently
- `scripts.build` - Typechecks and builds all packages
- `scripts.typecheck` - Runs TypeScript checks across all packages

**Why Important**: This is the entry point for all workspace operations. It ensures all packages are built and typechecked together.

---

#### `pnpm-workspace.yaml`
**Purpose**: Defines which directories are workspace packages.

**Current Configuration**:
```yaml
packages:
  - artifacts/*
  - lib/*
  - scripts
```

**Why Important**: This tells pnpm which packages to install and link together. Previously included `lib/integrations/*` which was redundant (removed during cleanup).

---

#### `tsconfig.json`
**Purpose**: Root TypeScript configuration with project references.

**Current References**:
- `lib/api-client-react`
- `lib/api-zod`
- `lib/integrations-gemini-ai`

**Previously Had**: `lib/db` (removed - package was deleted)

**Why Important**: Enables incremental TypeScript builds across the monorepo. Project references allow TypeScript to check dependencies between packages.

---

### Frontend: `artifacts/readeasy/`

#### `package.json`
**Purpose**: Frontend application dependencies and scripts.

**Key Dependencies**:
- `react`, `react-dom` - UI framework
- `vite` - Build tool and dev server
- `wouter` - Lightweight routing
- `pdfjs-dist` - PDF rendering
- `idb-keyval` - IndexedDB wrapper
- `@tanstack/react-query` - Data fetching/caching
- `@radix-ui/*` - UI component primitives
- `tailwindcss` - Styling
- `next-themes` - Theme management (partially used)

**Scripts**:
- `dev` - Starts Vite dev server on port 5173
- `build` - Production build
- `typecheck` - TypeScript validation

---

#### `vite.config.ts`
**Purpose**: Vite configuration for the frontend.

**Key Settings**:
- **Port**: 5173
- **Host**: 0.0.0.0 (accessible from network)
- **Proxy**: `/api` → `http://localhost:8080` (backend)
- **Alias**: `@` → `src/` directory
- **Dedupe**: React and react-dom (prevents duplicate instances)

**Why Important**: This configures how the frontend builds and runs. The proxy is critical for API calls to work during development.

---

#### `index.html`
**Purpose**: HTML entry point for the React application.

**Key Features**:
- **Inline Script**: Applies persisted theme before first paint to prevent "flash of unstyled content"
- **Font Imports**: Libre Baskerville (serif for reading), Noto Sans Devanagari (Hindi), Outfit (UI)
- **Root Div**: `<div id="root">` where React mounts

**Why Important**: The inline theme script was added to fix a UX issue where the wrong theme would briefly show on page load.

---

#### `src/main.tsx`
**Purpose**: Application entry point.

**What It Does**:
1. Creates React root
2. Sets up TanStack Query client
3. Configures API base URL from environment variable
4. Renders App component

**Why Important**: This is where the app initializes. The API base URL configuration is critical for AI features to work.

---

#### `src/App.tsx`
**Purpose**: Root component with routing setup.

**What It Does**:
- Sets up Wouter router
- Provides TanStack Query context
- Provides Radix UI Tooltip context
- Defines routes:
  - `/` → Home page
  - `/read/:bookId` → Reader page
  - Fallback → NotFound page

**Why Important**: This is the top-level component that wraps everything with necessary providers.

---

#### `src/pages/home.tsx`
**Purpose**: Home page showing library and upload interface.

**Key Functions**:
- `handleFileSelect()`: Processes uploaded PDF, generates thumbnail, saves to IndexedDB, navigates to reader
- `BookCard`: Displays book with cover, progress, delete option

**Data Flow**:
1. User drops/selects PDF
2. `generatePdfThumbnail()` creates cover image
3. `addBook()` saves PDF bytes to IndexedDB, metadata to localStorage
4. Navigate to `/read/{id}`

**Why Important**: This is the main entry point for users. It handles the initial PDF processing and storage.

**Recent Changes**:
- Removed duplicate AI book detection (now only runs in Reader)
- Integrated `useThumbnail` hook for lazy loading covers
- Fixed Tailwind class warnings (`min-h-dvh`, `shrink-0`)

---

#### `src/pages/reader.tsx`
**Purpose**: Main PDF reading interface with AI features.

**Key State**:
- `pdfDoc`: Loaded PDF document
- `currentPage`: Current page number
- `totalPages`: Total page count
- `showChrome`: UI visibility (auto-hides)
- `isFocused`: Focus mode state
- `isAIPanelOpen`, `isDiscoveryOpen`, `isNotesOpen`: Panel states

**Key Effects**:
1. **PDF Loading**: Loads PDF from IndexedDB with cancellation support
2. **Text Extraction**: Extracts text from current page for AI features
3. **Book Detection**: One-shot AI metadata detection on first open (page 1, unknown author)
4. **Progress Saving**: Saves reading progress on page change
5. **Auto-hide Chrome**: Hides UI after 3 seconds of inactivity
6. **Keyboard Navigation**: Arrow keys for page turning
7. **Touch Gestures**: Swipe left/right for page turning

**Key Functions**:
- `toggleChrome()`: Shows/hides UI
- `handleTouchStart/End()`: Swipe detection
- `cycleFontSize()`: Cycles through font sizes

**UI Components**:
- Top chrome: Back button, title, theme/font controls, discovery button
- Main area: PDF renderer
- Focus mode controls: Exit button, font picker
- Companion menu: Notes and AI buttons
- Bottom chrome: Page navigation, progress indicator

**Why Important**: This is the core of the application. It handles PDF rendering, user interactions, and integrates all AI features.

**Recent Changes**:
- Added cancellation logic to prevent memory leaks
- Fixed event types (`MouseEvent`, `TouchEvent` imports)
- Consolidated UI buttons into "Companion Menu"
- Made discovery panel opt-in (no auto-open)
- Fixed Tailwind class warnings

---

#### `src/hooks/use-books.ts`
**Purpose**: Manages book library state and persistence.

**Key Functions**:
- `useThumbnail()`: Lazy-loads book cover from IndexedDB
- `addBook()`: Saves PDF bytes and thumbnail to IndexedDB, metadata to localStorage
- `updateBookProgress()`: Updates last page read (with redundant write check)
- `updateBookMetadata()`: Updates title/author/etc.
- `deleteBook()`: Removes PDF from IndexedDB and metadata from localStorage
- `getBook()`: Retrieves a single book by ID

**Storage Strategy**:
- **IndexedDB**: PDF bytes (`pdf:{id}`), thumbnails (`thumb:{id}`)
- **localStorage**: Book metadata array (`readeasy:books`)

**Why Important**: This hook is the single source of truth for book data. It handles the split storage strategy (large binary data in IndexedDB, metadata in localStorage).

**Recent Changes**:
- Added thumbnail storage to IndexedDB (was in localStorage, causing quota issues)
- Added redundant write check in `updateBookProgress` for performance
- Deprecated `coverImage` field on Book interface (migration path)

---

#### `src/hooks/use-theme.ts`
**Purpose**: Manages theme and font size state.

**Themes**: `light`, `dark`, `sepia` (default)
**Font Sizes**: `small`, `medium`, `large`, `xlarge`

**Key Functions**:
- `readInitialTheme()`: Reads from localStorage or system preference
- `readInitialFontSize()`: Reads from localStorage
- `cycleTheme()`: Cycles through themes
- `changeFontSize()`: Sets font size

**Why Important**: This hook ensures the theme is loaded correctly on mount to prevent flashes. The sepia default aligns with the app's calm reading focus.

**Recent Changes**:
- Implemented lazy initial state to prevent theme flash
- Added inline script in index.html for pre-render theme application

---

#### `src/hooks/use-notes.ts`
**Purpose**: Manages notes/highlights for a book.

**Storage**: localStorage (`readeasy:notes`)

**Key Functions**:
- `addNote()`: Creates new note
- `deleteNote()`: Removes note
- `updateNote()`: Updates note text/color
- `deleteAllForBook()`: Removes all notes for a book

**Cross-tab Sync**: Uses `storage` event listener to sync notes across tabs.

**Why Important**: Enables users to take notes and highlights while reading. Cross-tab sync ensures consistency.

---

#### `src/hooks/use-discovery.ts`
**Purpose**: Fetches book recommendations from Open Library API.

**Key Functions**:
- `discoverBooks()`: Searches Open Library by title

**Why Important**: Provides the "Similar Books" feature for book discovery.

---

#### `src/hooks/use-focus-mode.ts`
**Purpose**: Manages focus mode state (distraction-free reading).

**What It Does**:
- Hides all chrome except minimal controls
- Shows subtle page indicator
- Provides exit button

**Why Important**: Focus mode is a key USP of the app - providing a calm, distraction-free reading experience.

---

#### `src/lib/idb.ts`
**Purpose**: IndexedDB utilities using idb-keyval.

**Key Functions**:
- `savePdfBytes()`: Saves PDF with `pdf:{id}` prefix
- `getPdfBytes()`: Retrieves PDF with backward compatibility
- `deletePdfBytes()`: Deletes PDF and associated thumbnail
- `saveThumbnail()`: Saves thumbnail with `thumb:{id}` prefix
- `getThumbnail()`: Retrieves thumbnail

**Why Important**: IndexedDB handles large binary data (PDFs) that would exceed localStorage quotas. The prefix system prevents key collisions.

**Recent Changes**:
- Added separate prefixes for PDFs and thumbnails
- Added thumbnail save/retrieve functions
- Backward compatibility for old key format

---

#### `src/lib/pdf-utils.ts`
**Purpose**: PDF.js utilities for text extraction and thumbnail generation.

**Key Functions**:
- `extractTextFromPage()`: Extracts text from a single page
- `extractTextFromRange()`: Extracts text from a page range
- `generatePdfThumbnail()`: Creates JPEG thumbnail from first page

**Why Important**: These utilities power the AI features (text extraction) and the library UI (thumbnails). The PDF.js worker is configured here.

---

#### `src/components/Reader/pdf-renderer.tsx`
**Purpose**: Renders a single PDF page using PDF.js canvas.

**What It Does**:
- Loads page from PDF document
- Renders to canvas with appropriate scale
- Handles loading/error states

**Why Important**: This is the actual PDF rendering component. It's optimized for performance with proper cleanup.

---

#### `src/components/Reader/ai-panel.tsx`
**Purpose**: AI assistant panel for summarize, explain, and vocabulary features.

**Features**:
- Summarize current page or selection
- Explain difficult passages
- Get vocabulary definitions
- Hindi/English language support

**Why Important**: This is the main AI interaction point. It provides intelligent reading assistance.

---

#### `src/components/Reader/notes-panel.tsx`
**Purpose**: Notes and highlights management panel.

**Features**:
- Create notes with highlights
- Color-coded notes
- Jump to note location
- Delete notes

**Why Important**: Enables active reading with note-taking capabilities.

**Recent Changes**:
- Fixed Tailwind class warnings (`min-h-16`, `shrink-0`)

---

#### `src/components/Reader/discovery-panel.tsx`
**Purpose**: Displays similar book recommendations from Open Library.

**Features**:
- Shows book covers and titles
- "Find PDF" button to search Google
- Loading and error states

**Why Important**: Provides book discovery feature. Now opt-in (user must click Compass icon) to avoid distraction.

---

#### `src/components/Upload/dropzone.tsx`
**Purpose**: File upload dropzone for PDFs.

**Features**:
- Drag and drop support
- File type validation
- Upload progress indication

**Why Important**: This is the primary way users add books to their library.

---

### Backend: `artifacts/api-server/`

#### `package.json`
**Purpose**: Backend dependencies and scripts.

**Key Dependencies**:
- `express` - Web framework
- `cors` - CORS middleware
- `pino` - Logging
- `zod` - Schema validation
- `@workspace/api-zod` - Shared API schemas
- `@workspace/integrations-gemini-ai` - Gemini AI client

**Scripts**:
- `dev` - Builds and starts server in development mode
- `build` - Bundles with esbuild
- `start` - Starts production server
- `typecheck` - TypeScript validation

**Recent Changes**:
- Removed unused dependencies: `@workspace/db`, `cookie-parser`, `drizzle-orm`

---

#### `src/app.ts`
**Purpose**: Express application setup and middleware.

**Middleware Stack**:
1. `pino-http` - Request/response logging
2. `cors` - Cross-origin resource sharing
3. `express.json()` - JSON body parsing
4. `express.urlencoded()` - URL-encoded body parsing

**Error Handling**:
- Zod validation errors → 400 with issues
- Other errors → 500 with message

**Why Important**: This is the backend entry point. It sets up all middleware and error handling.

---

#### `src/routes/ai.ts`
**Purpose**: AI endpoints for summarize, explain, vocabulary, and book detection.

**Endpoints**:
- `POST /api/ai/summarize` - Summarize text
- `POST /api/ai/explain` - Explain text simply
- `POST /api/ai/vocabulary` - Get word definition
- `POST /api/ai/detect-book` - Detect book title/author from text

**AI Models Used**:
- `gemini-2.0-flash` - Default model (fast, cost-effective)
- `gemini-2.5-flash` - Smart model for complex tasks (vocabulary, detection)

**Features**:
- Text truncation at 60,000 characters
- JSON response parsing
- Fallback to default model if smart model quota exceeded
- Hindi/English language support

**Why Important**: These endpoints power all AI features in the frontend. The fallback logic ensures reliability.

---

#### `src/lib/logger.ts`
**Purpose**: Pino logger configuration.

**Features**:
- Log level from environment
- Redacts sensitive headers (authorization, cookie)
- Pretty output in development
- Structured logs in production

**Why Important**: Proper logging is essential for debugging and monitoring.

---

### Shared Libraries: `lib/`

#### `lib/api-zod/`
**Purpose**: Zod schemas for API request/response validation.

**What It Does**:
- Defines TypeScript types for API contracts
- Validates incoming requests
- Ensures type safety between frontend and backend

**Why Important**: This shared library ensures frontend and backend agree on API contracts. It's generated from the OpenAPI spec.

---

#### `lib/api-client-react/`
**Purpose**: Auto-generated React hooks for API calls.

**What It Does**:
- Generates typed React Query hooks from OpenAPI spec
- Provides `setBaseUrl()` for API configuration
- Provides `setAuthTokenGetter()` for auth (future use)

**Why Important**: This eliminates manual API client code. Type safety is guaranteed from the OpenAPI spec.

---

#### `lib/api-spec/`
**Purpose**: OpenAPI specification for the API.

**What It Does**:
- Defines API endpoints, request/response schemas
- Source of truth for API client generation
- Used by Orval to generate React hooks

**Why Important**: This is the single source of truth for the API contract. Changes here propagate to both frontend and backend.

---

#### `lib/integrations-gemini-ai/`
**Purpose**: Google Gemini AI integration library.

**What It Does**:
- Wraps Google's Generative AI SDK
- Provides configured client instance
- Handles authentication via environment variables

**Why Important**: This abstracts the AI provider details. The backend doesn't need to know about Gemini-specific APIs.

---

## Issues Found and Fixed

### 1. Stale References to Deleted Modules

**Issue**: Multiple files referenced packages that no longer existed:
- `lib/db` (deleted database package)
- `@workspace/db` (workspace reference)
- `mockup-sandbox` (old sandbox package)
- `gemini_ai_integrations` (old naming)

**Where Found**:
- Root `tsconfig.json` - referenced `lib/db`
- `artifacts/api-server/tsconfig.json` - referenced `lib/db`
- `pnpm-workspace.yaml` - had `lib/integrations/*` (redundant)
- `pnpm-lock.yaml` - stale importer entries
- `artifacts/api-server/package.json` - unused dependencies

**Fix Applied**:
- Removed `lib/db` from all tsconfig project references
- Removed `lib/integrations/*` from pnpm-workspace.yaml
- Removed unused dependencies from api-server/package.json
- Cleaned pnpm-lock.yaml of stale entries

**Why This Occurred**:
These were leftovers from a previous refactoring where the database module was removed and the integrations structure was simplified. The cleanup wasn't complete, leaving broken references.

---

### 2. TypeScript Type Errors in reader.tsx

**Issue**: Implicit `any` types and incorrect React namespace usage.

**Errors**:
- `React.MouseEvent` and `React.TouchEvent` - incorrect namespace
- Event parameters had implicit `any` types
- `const sizes` array instead of using `FONT_SIZES` constant

**Where Found**:
- `artifacts/readeasy/src/pages/reader.tsx`

**Fix Applied**:
- Imported `MouseEvent` and `TouchEvent` types directly from 'react'
- Used imported types instead of `React.*` namespace
- Used `FONT_SIZES` constant instead of creating new array

**Why This Occurred**:
The code was written before strict TypeScript checking was enabled. The React namespace usage is an older pattern that's no longer recommended.

---

### 3. Tailwind CSS Warnings

**Issue**: Deprecated Tailwind class syntax.

**Warnings**:
- `min-h-[100dvh]` should be `min-h-dvh`
- `flex-shrink-0` should be `shrink-0`
- `min-h-[64px]` should be `min-h-16`

**Where Found**:
- `artifacts/readeasy/src/pages/home.tsx`
- `artifacts/readeasy/src/pages/reader.tsx`
- `artifacts/readeasy/src/components/Reader/notes-panel.tsx`

**Fix Applied**:
- Replaced all deprecated classes with modern equivalents

**Why This Occurred**:
Tailwind CSS v3.4+ introduced shorthand utilities. The code was written with older syntax that still works but triggers warnings.

---

### 4. localStorage Quota Issues

**Issue**: Thumbnails stored in localStorage causing quota exceeded errors.

**Where Found**:
- `artifacts/readeasy/src/hooks/use-books.ts`
- `artifacts/readeasy/src/lib/idb.ts`

**Fix Applied**:
- Moved thumbnail storage to IndexedDB with `thumb:{id}` prefix
- Added `saveThumbnail()` and `getThumbnail()` functions
- Deprecated `coverImage` field on Book interface
- Added `useThumbnail()` hook for lazy loading

**Why This Occurred**:
localStorage has a 5-10MB limit. Storing base64-encoded thumbnails (which are large) quickly exceeded this limit. IndexedDB has much larger storage (hundreds of MB to GB).

---

### 5. Theme Flash on Page Load

**Issue**: Wrong theme briefly shown before React app mounts.

**Where Found**:
- `artifacts/readeasy/index.html`
- `artifacts/readeasy/src/hooks/use-theme.ts`

**Fix Applied**:
- Added inline script in index.html to apply theme before first paint
- Implemented lazy initial state in `useTheme()` hook
- Theme now read from localStorage or system preference before mount

**Why This Occurred**:
React hooks run after the initial HTML render. Without the inline script, the page would render with default styles before the theme could be applied, causing a visual flash.

---

### 6. Duplicate AI Book Detection

**Issue**: Book metadata detection ran twice (once in Home, once in Reader).

**Where Found**:
- `artifacts/readeasy/src/pages/home.tsx`

**Fix Applied**:
- Removed AI detection from Home page
- Now only runs once in Reader on first open (page 1, unknown author)
- Added `detectionAttemptedRef` to prevent re-runs

**Why This Occurred**:
During development, detection was added to both pages for testing. It wasn't cleaned up, causing redundant API calls and potential race conditions.

---

### 7. Race Conditions in PDF Loading

**Issue**: PDF loading could continue after component unmount, causing memory leaks.

**Where Found**:
- `artifacts/readeasy/src/pages/reader.tsx`

**Fix Applied**:
- Added cancellation flags to all async operations
- Proper cleanup in useEffect return functions
- Call `doc.destroy()` to release native PDF.js resources

**Why This Occurred**:
React useEffect cleanup is often overlooked. Without proper cancellation, async operations could continue after unmount, leading to memory leaks and state updates on unmounted components.

---

### 8. UI Clutter in Reader

**Issue**: Too many floating buttons distracted from reading.

**Where Found**:
- `artifacts/readeasy/src/pages/reader.tsx`

**Fix Applied**:
- Consolidated AI and Notes buttons into "Companion Menu"
- Made Discovery panel opt-in (Compass icon in top bar)
- Removed auto-open of Discovery panel
- Simplified focus mode controls

**Why This Occurred**:
Features were added incrementally without considering the overall UX. The accumulated buttons created visual clutter that contradicted the app's "calm, distraction-free" USP.

---

### 9. Missing pnpm Installation

**Issue**: `pnpm` command not found on PATH.

**Where Found**:
- Terminal/Command prompt

**Fix Applied**:
- Enabled corepack: `corepack enable`
- Prepared pnpm: `corepack prepare pnpm@10.33.2 --activate`
- Ran `pnpm install` to install dependencies

**Why This Occurred**:
The project requires pnpm for workspace management, but it wasn't installed on the system. Corepack (Node.js package manager manager) needed to be enabled first.

---

### 10. Missing .env File

**Issue**: No `.env` file for environment variables.

**Where Found**:
- Project root

**Fix Applied**:
- Copied `.env.example` to `.env`
- User needs to add Gemini API key

**Why This Occurred**:
The `.env` file is gitignored (security best practice). It needs to be created manually from the example.

---

## Why These Issues Occurred

### Root Causes

1. **Incomplete Refactoring**: The database module removal and integrations restructuring left stale references across config files.

2. **Incremental Development**: Features were added over time without comprehensive cleanup, leading to duplicate code (AI detection) and UI clutter.

3. **Missing Strict TypeScript**: Type errors accumulated before strict checking was enabled, allowing implicit `any` types to persist.

4. **Outdated Patterns**: Code used older React and Tailwind patterns that still work but trigger warnings in newer versions.

5. **Storage Limitations**: The initial design used localStorage for everything, not accounting for the size of PDF thumbnails.

6. **Missing Cleanup**: useEffect cleanup functions were often overlooked, leading to potential memory leaks.

7. **Environment Setup**: The project requires specific tooling (pnpm, corepack) that wasn't documented or set up initially.

8. **UX Drift**: As features were added, the original "calm, distraction-free" USP was diluted by accumulated UI elements.

---

## Development Setup

### Prerequisites
- Node.js v24.15.0+
- pnpm (via corepack)

### Installation Steps

1. **Enable corepack and install pnpm**:
   ```cmd
   corepack enable
   corepack prepare pnpm@10.33.2 --activate
   ```

2. **Install dependencies**:
   ```cmd
   cd d:\Projects\ReadEasy
   pnpm install
   ```

3. **Configure environment**:
   ```cmd
   copy .env.example .env
   ```
   Then edit `.env` and add:
   ```
   AI_INTEGRATIONS_GEMINI_API_KEY=your_api_key_here
   AI_INTEGRATIONS_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
   ```

4. **Start development servers**:
   ```cmd
   pnpm run dev
   ```
   Or use the batch file:
   ```cmd
   start-project.bat
   ```

### Services
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080

### Build Commands
- `pnpm run build` - Build all packages
- `pnpm run typecheck` - Type check all packages
- `pnpm run dev` - Start both dev servers

---

## Summary

ReadEasy is a well-architected monorepo with clear separation between frontend, backend, and shared libraries. The issues found were primarily:
1. Leftovers from refactoring (stale references)
2. Incremental development debt (duplicate code, UI clutter)
3. Outdated patterns (TypeScript, Tailwind)
4. Missing environment setup (pnpm, .env)

All issues have been resolved. The project now:
- Has no stale module references
- Passes TypeScript strict checks
- Uses modern Tailwind syntax
- Stores large data in IndexedDB
- Has a clean, distraction-free UI
- Is properly set up for development

The blueprint above provides a complete understanding of every file, its purpose, and how the system works together.
