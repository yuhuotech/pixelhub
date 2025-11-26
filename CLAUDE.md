# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PixelHub** is a modern, multi-backend image hosting solution (图床) built with Next.js. It provides:
- Multiple cloud storage backends (Tencent COS, Alibaba OSS, GitHub, Gitee, Local)
- Multiple upload methods (drag-drop, paste, URL)
- Image management with timeline view, search, and soft-delete
- Dark mode support
- Password-based access control

## Tech Stack

- **Framework**: Next.js 16 with React 19 and TypeScript
- **Database**: Prisma ORM with SQLite (dev), PostgreSQL/MySQL (production)
- **Styling**: Tailwind CSS 4
- **Authentication**: JWT-based session (lib/auth.ts)
- **Cloud Storage**: COS SDK, OSS SDK, GitHub API, Gitee API
- **Animations**: Framer Motion
- **UI Components**: Lucide React icons, custom components

## Essential Commands

```bash
# Development
npm run dev              # Start dev server on port 3003
npm run lint            # Run ESLint

# Database
npx prisma db push     # Sync schema to database
npx prisma studio     # Open Prisma Studio (visual DB viewer)
npx prisma seed       # Run seed script (creates default admin user)

# Production
npm run build          # Build for production
npm start              # Start production server on port 3003
```

## Project Structure

### `/app` - Next.js App Router
- **`/app/layout.tsx`**: Root layout with ThemeProvider
- **`/app/page.tsx`**: Main gallery page (client component with upload, search, sidebar)
- **`/app/login/page.tsx`**: Authentication page
- **`/app/settings/page.tsx`**: Settings page
- **`/app/api/`**: API routes for image management, uploads, auth, configuration
  - `/auth/login`: Login endpoint
  - `/upload/{cos|oss|local|github|gitee}/route.ts`: Storage-specific upload handlers
  - `/upload/sign`: COS STS credentials
  - `/upload/oss-config`: OSS STS configuration
  - `/upload/url`: URL-based image download and upload
  - `/images`: Image CRUD operations
  - `/config`: Storage configuration endpoint
  - `/settings`: Settings management
- **`/app/file/[...path]/route.ts`**: Local file proxy for local storage

### `/components` - React Components
All are client components with 'use client' directive:
- **`gallery-grid.tsx`**: Main image grid with filtering (gallery/trash/date views)
- **`upload-modal.tsx`**: Modal dialog for file selection
- **`upload-zone.tsx`**: Drag-drop and file picker UI
- **`image-card.tsx`**: Individual image card with lightbox trigger
- **`lightbox.tsx`**: Full-screen image viewer
- **`sidebar.tsx`**: Navigation sidebar (date groups, trash, stats)
- **`top-nav.tsx`**: Top navigation bar with search and upload button
- **`paste-upload-toast.tsx`**: Toast for paste-to-upload (Ctrl+V/Cmd+V)
- **`theme-toggle.tsx`**: Dark mode switch
- **`theme-provider.tsx`**: next-themes integration

### `/lib` - Utilities
- **`auth.ts`**: JWT encryption/decryption, session management, cookie handling
- **`prisma.ts`**: Prisma client singleton
- **`settings.ts`**: Settings management helper
- **`utils.ts`**: Utility functions (classname merging with clsx, etc.)

### `/prisma` - Database
- **`schema.prisma`**: Database schema with User, Image, Settings models
- **`migrations/`**: Database migration history
- **`seed.ts`**: Seeds database with default admin user (username: admin, password: admin)

## Key Architecture Patterns

### Image Storage & Metadata
- All images stored in `Image` model with metadata (url, key, filename, size, width, height, mimeType, storageType)
- Different storage backends can be mixed (multitenancy per image)
- Soft-delete via `deletedAt` timestamp
- `publicPath` is a hashed path for public access links

### Authentication
- Session-based using JWT in cookies (24h expiration)
- Protected routes check session via `getSession()` in lib/auth.ts
- Login stores encrypted JWT in `session` cookie

### Storage Abstraction
Each storage type has dedicated API route:
- **COS** (Tencent): Client-side upload with STS credentials from `/api/upload/sign`
- **OSS** (Alibaba): Similar STS flow from `/api/upload/oss-config`
- **GitHub/Gitee**: Server-side upload via API
- **Local**: Server-side file write to `./uploads` (configurable via LOCAL_STORAGE_PATH env)

The main page (`page.tsx`) detects storage type via `/api/config` and routes uploads accordingly.

### Client-Server Interactions
- Main page is client component (`'use client'`) for interactivity (drag-drop, search, theme)
- API calls to backend routes for data mutations
- Configuration fetched at runtime from `/api/config`
- Refresh trigger pattern: increment `refreshTrigger` state to re-fetch images

## Environment Configuration

```env
# Core
DATABASE_URL="file:./dev.db"  # SQLite (dev), PostgreSQL (prod)
STORAGE_TYPE=local            # cos | oss | github | gitee | local
ACCESS_CODE=                  # Optional password for access control
SESSION_SECRET=secret         # Default used if not set

# Storage Backends (set only for STORAGE_TYPE in use)
COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION
OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_BUCKET / OSS_REGION / OSS_ENDPOINT
GITHUB_ACCESS_TOKEN / GITHUB_OWNER / GITHUB_REPO / GITHUB_BRANCH
GITEE_ACCESS_TOKEN / GITEE_OWNER / GITEE_REPO / GITEE_BRANCH
LOCAL_STORAGE_PATH=./uploads

# Database Seed
ADMIN_USERNAME=admin          # Default admin username
ADMIN_PASSWORD=admin          # Default admin password
```

## Common Development Tasks

### Adding a New API Route
1. Create file in `/app/api/[route]/route.ts`
2. Export `POST`, `GET`, etc. functions taking `Request` and returning `NextResponse`
3. Use Prisma client from `lib/prisma.ts` for DB access
4. Check session via `getSession()` if protected endpoint

### Adding a Component
1. Create `.tsx` file in `/components`
2. Use `'use client'` if it needs interactivity (state, events)
3. Keep server components for data fetching (if needed in future refactor)
4. Import and use in pages or other components

### Uploading Images
- Client: Form data POST to `/api/upload/{storage_type}`
- Server: Handle file (validate, process), save metadata to Image model
- Return: `{ url, key, publicPath, filename, size, mimeType }`
- Frontend saves to DB via `/api/images` POST with metadata

### Querying Images
- `/api/images` GET: Fetch with pagination, filtering by `storageType`, `searchQuery`, `viewMode` (gallery/trash)
- `GalleryGrid` handles grouping by date (year/month)
- Soft-delete filtering on backend (check `deletedAt IS NULL`)

## Database Schema Notes

- `User`: username (unique), hashed password
- `Image`: url, key, filename, size, dimensions, mimeType, storageType, soft-delete via deletedAt, publicPath for hashed URLs
- `Settings`: key-value store for app configuration (category: storage | general | security)

## Testing & Linting

```bash
npm run lint    # ESLint (config in eslint.config.mjs, extends Next.js + TypeScript rules)
# No test runner configured; consider adding Jest or Vitest for future test coverage
```

## Deployment Notes

- **Vercel**: Recommended. Auto-deploys from GitHub.
- **Docker**: Dockerfile provided. Set env vars for database and storage.
- **Traditional**: `npm run build && npm start`
- **Local Storage Limitation**: Not suitable for serverless (stateless); use cloud storage for production.
- **Port**: Default 3003 (configurable in npm scripts)

## Important Files to Be Aware Of

- `.env`: Environment variables (not in git, create from .env.example)
- `next.config.ts`: Webpack config (disables fs/net/tls in client bundle)
- `postcss.config.mjs`: Tailwind CSS pipeline
- `eslint.config.mjs`: ESLint configuration (extends Next.js defaults)
- `tsconfig.json`: TypeScript configuration with path aliases (`@/*` → src root)
