# Curatr App

[![GitHub](https://img.shields.io/github/license/Lou-i3/curatr-app)](https://github.com/Lou-i3/curatr-app/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Self-Hosted](https://img.shields.io/badge/Self--Hosted-Docker-blue)](https://docs.docker.com/)
[![Vibe Coded](https://img.shields.io/badge/vibe%20coded-Claude-blueviolet)](https://claude.ai)

A **self-hosted** web application for tracking media file quality, playback compatibility, and maintenance status across your Plex media library. Deploy on your own server with Docker and keep full control of your data.

## Features

- **Library Scanner** - Scan TV show directories to discover and catalog media files
- **Single-Show Scan** - Scan files for individual shows without rescanning the entire library
- **Batch Processing** - Optimized database operations for fast scanning of large libraries
- **Plex-style Parsing** - Automatically parse `Show Name (Year)/Season 01/S01E05.mkv` naming
- **Smart Show Detection** - Extracts show names from folder structure for reliable matching
- **Folder-based Matching** - Preserves original folder names to prevent duplicates when titles are customized
- **Quality Tracking** - Track codec, resolution, bitrate, HDR, audio formats
- **Two-Dimensional Status System** - Separate monitoring intent from quality state
  - Monitor Status: Wanted/Unwanted with cascade updates to children
  - Quality Status: Computed from files (Unverified/OK/Broken/Missing)
  - Clickable status badges with dropdown selectors
- **Real-time Progress** - Live scan progress with percentage and file count
- **TV Show Management** - Full CRUD operations with search, filter, and grid/table views
  - Expandable seasons with inline episode tables (no page navigation)
  - Column visibility toggle in table view (show/hide columns)
  - Edit poster/backdrop paths directly in show dialog
  - Personal notes displayed with styled background
- **TMDB Integration** - Enrich shows with posters, descriptions, ratings, and air dates from The Movie Database
  - Dedicated TMDB section on show pages with match status, sync controls, and help dialog
  - Auto-match shows by title and year with confidence scoring
  - Manual search and match with TMDB ID display in results
  - Library completeness tracking with progress bars for shows, seasons, and episodes
  - Separated matching from syncing for better control over metadata operations
  - Bulk actions: Auto-match unmatched, Refresh missing metadata, Refresh all
  - Library overview with filterable show list (All/Unmatched/Needs Sync/Fully Synced)
  - Import seasons & episodes from TMDB with selective import and status options
  - Graceful handling when TMDB is not configured
- **Background Task System** - Non-blocking operations with real-time progress
  - Tasks run in worker threads (TMDB operations) to keep UI responsive
  - Real-time SSE progress updates with toast notifications on completion
  - Cancel running tasks anytime
  - Queue system with configurable max parallel tasks (1-10)
  - Sidebar indicator shows running task count
  - Dedicated /tasks page for task management
  - 1-hour task retention for review after completion
- **FFprobe Media Analysis** - Extract detailed media information from files
  - Video: codec, resolution, bit depth (8/10/12-bit), frame rate, HDR type (HDR10, Dolby Vision, HLG)
  - Audio: codec, channels, sample rate, language per track
  - Subtitles: format, language, forced flag per track
  - Analyze button on episode file pages
  - Dedicated integration page with setup instructions and statistics
  - User-configured via FFPROBE_PATH environment variable
- **Plex Authentication** - Optional multi-user access with Plex account login
  - Two modes: `AUTH_MODE=none` (default, single-user) or `AUTH_MODE=plex` (multi-user)
  - Plex OAuth PIN-based login flow with server access verification
  - Role-based access control: server owner = admin, shared users = regular users
  - Admin: full control (editing, scanning, settings, issue management)
  - Users: browse library, report issues, view their own submissions
  - Cookie-based sessions (30-day expiry, server-side validation)
  - User management in Settings (promote/demote, activate/deactivate)
  - Integration page at `/integrations/plex` with setup guide and connectivity status
- **Issue Reporting** - Track and manage quality issues across your library
  - Quick report from episode pages or from the issues page via show search
  - Issue types: Playback, Quality, Audio, Subtitle, Content, Other
  - Status workflow: Open → Acknowledged → In Progress → Resolved / Closed
  - Optional context: device platform, audio/subtitle language, description
  - Admin inline status changes, resolution notes, and issue editing
  - Sidebar badge shows active issue count with polling
  - Works in both auth modes (no-auth: issues attributed to built-in admin user)
- **Playback Testing** - Record and track playback compatibility across platforms
  - Configurable platforms (TV, Web Player, Mobile, custom)
  - Mark platforms as required for quality verification
  - Auto-compute file quality: VERIFIED when all required platforms pass
  - Test history with notes and timestamps
  - Add/edit/delete tests from episode list or detail pages
- **Settings** - Configurable date format (EU/US/ISO), max parallel tasks, playback platforms, and user management (when auth enabled)
- **Responsive Sidebar** - Collapsible navigation (Cmd/Ctrl+B), mobile drawer, version display
- **PWA Support** - Installable as a Progressive Web App on phones (iOS/Android) and desktop
- **Dark Mode** - Full dark mode UI with system preference support
- **Custom Theme** - Nunito font, green accent colors, consistent design

## Self-Hosted

Curatr is designed to run on your own hardware - no cloud services or subscriptions required. Your media library data stays entirely on your server.

- **Full Privacy**: All data stored locally in SQLite
- **No Account Required**: No sign-ups, no external services (TMDB integration is optional)
- **Docker Ready**: Single container deployment with volume mounts for your media
- **Resource Friendly**: Lightweight Next.js app with ~420MB Docker image

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (creates SQLite database)
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker (Production)

```bash
# Build and run
docker compose up --build
```

## Environment Variables

### Required

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | - | SQLite database path (e.g., `file:./prisma/dev.db`) |
| `TV_SHOWS_PATH` | - | Path to TV shows directory* |
| `MOVIES_PATH` | - | Path to movies directory* |

*At least one of `TV_SHOWS_PATH` or `MOVIES_PATH` is required.

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_MODE` | `none` | Authentication mode: `none` (single-user) or `plex` (multi-user with Plex login) |
| `PLEX_URL` | - | Plex server URL (e.g., `http://192.168.1.100:32400`). Required when `AUTH_MODE=plex` |
| `PLEX_TOKEN` | - | Plex authentication token. Required when `AUTH_MODE=plex` |

### Integrations

| Variable | Default | Description |
|----------|---------|-------------|
| `TMDB_API_KEY` | - | TMDB API Read Access Token for metadata ([get one here](https://www.themoviedb.org/settings/api)) |
| `FFPROBE_PATH` | - | Path to ffprobe binary for media analysis (not set = disabled) |
| `FFPROBE_TIMEOUT` | `30000` | FFprobe execution timeout in milliseconds |
| `PLEX_DB_PATH` | - | Path to Plex database for future sync (not yet implemented) |

### Scanner Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `SCAN_CONCURRENCY` | `4` | Number of parallel file operations during scan |
| `SCAN_BATCH_SIZE` | `100` | Number of files to process per database batch |

### Task System

| Variable | Default | Description |
|----------|---------|-------------|
| `TASK_RETENTION_MS` | `3600000` | How long to keep completed tasks in memory (1 hour) |

### Docker Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `TZ` | `UTC` | Timezone (e.g., `Europe/Paris`, `America/New_York`) |
| `PUID` | `1000` | User ID for file permissions |
| `PGID` | `1000` | Group ID for file permissions |

### FFprobe Installation Paths

| Platform | Path |
|----------|------|
| Linux | `/usr/bin/ffprobe` |
| macOS (Homebrew, Apple Silicon) | `/opt/homebrew/bin/ffprobe` |
| macOS (Homebrew, Intel) | `/usr/local/bin/ffprobe` |
| Docker (after `apk add ffmpeg`) | `/usr/bin/ffprobe` |
| Docker (static binary mount) | `/ffprobe/ffprobe` |

> **Docker / NAS users**: FFprobe is not included in the Docker image. See the [FFprobe Docker Setup Guide](docs/ffprobe-docker-setup.md) for instructions on using a static binary with volume mounts — works on Synology, QNAP, Unraid, and other NAS devices.

### Example .env

```bash
DATABASE_URL="file:./prisma/dev.db"
TV_SHOWS_PATH="/media/TV Shows"
TMDB_API_KEY="your-read-access-token"
FFPROBE_PATH="/opt/homebrew/bin/ffprobe"

# Optional: Enable multi-user Plex authentication
# AUTH_MODE="plex"
# PLEX_URL="http://192.168.1.100:32400"
# PLEX_TOKEN="your-plex-token"
```

### Example docker-compose.yml

```yaml
services:
  app:
    image: ghcr.io/lou-i3/curatr-app:latest
    ports:
      - "3000:3000"
    environment:
      - TZ=Europe/Paris
      - PUID=1000
      - PGID=1000
      - DATABASE_URL=file:/app/data/media-tracker.db
      - TV_SHOWS_PATH=/media/TV Shows
      - TMDB_API_KEY=your-read-access-token
      # - FFPROBE_PATH=/usr/bin/ffprobe  # Requires extending image with ffmpeg
    volumes:
      - ./data:/app/data
      - /path/to/media:/media:ro
```

## Project Structure

```
src/
├── proxy.ts                        # Auth route protection (cookie check, no DB)
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── manifest.ts                 # PWA web app manifest
│   ├── apple-icon.png              # Apple touch icon (180x180)
│   ├── layout.tsx                  # Root layout with sidebar + providers
│   ├── login/
│   │   ├── page.tsx                # Login page
│   │   └── plex-login-button.tsx   # Plex OAuth button component
│   ├── scans/
│   │   └── page.tsx                # Scanner UI
│   ├── tasks/
│   │   └── page.tsx                # Background tasks management
│   ├── issues/
│   │   ├── page.tsx                # Issues list with filters & admin actions
│   │   └── issue-columns.tsx       # DataTable column definitions
│   ├── settings/
│   │   ├── page.tsx                # Settings page
│   │   ├── platform-settings.tsx   # Platform management component
│   │   ├── user-management.tsx     # User management (admin, plex mode)
│   │   └── user-columns.tsx        # User DataTable column definitions
│   ├── changelog/
│   │   └── page.tsx                # Changelog (GitHub releases)
│   ├── integrations/
│   │   ├── page.tsx                # Integrations hub
│   │   ├── tmdb/
│   │   │   ├── page.tsx            # TMDB integration config & status
│   │   │   └── tmdb-integration-help-dialog.tsx # Help documentation
│   │   ├── ffprobe/
│   │   │   ├── page.tsx            # FFprobe integration config & status
│   │   │   └── ffprobe-help-dialog.tsx # Help documentation
│   │   └── plex/
│   │       └── page.tsx            # Plex Auth integration & setup guide
│   ├── tv-shows/
│   │   ├── page.tsx                # TV Shows list (grid/table)
│   │   ├── toolbar.tsx             # Search, filter, view toggle
│   │   ├── column-visibility-toggle.tsx  # Show/hide columns in table view
│   │   ├── show-dialog.tsx         # Create/Edit TV show dialog
│   │   └── [id]/
│   │       ├── page.tsx            # Show detail with expandable seasons
│   │       ├── seasons-list.tsx    # Accordion seasons with episode tables
│   │       ├── tmdb-section.tsx    # TMDB integration controls
│   │       ├── tmdb-help-dialog.tsx # TMDB features help
│   │       └── episodes/
│   │           └── [episodeId]/
│   │               ├── page.tsx              # Episode detail (files + issues)
│   │               ├── episode-detail-status-badges.tsx  # Status controls
│   │               ├── episode-issues-list.tsx # Issue sidebar component
│   │               └── file-status-badges.tsx # File quality/action badges
│   └── api/
│       ├── settings/route.ts       # Settings API
│       ├── auth/                   # Authentication API
│       │   ├── session/route.ts    # GET: current user session
│       │   ├── status/route.ts     # GET: auth config & Plex server status
│       │   ├── logout/route.ts     # POST: logout
│       │   └── plex/
│       │       ├── pin/route.ts    # POST: create Plex auth PIN
│       │       └── callback/route.ts # POST: complete Plex auth
│       ├── issues/                 # Issue management API
│       │   ├── route.ts            # GET: list, POST: create
│       │   ├── [id]/route.ts       # GET, PATCH, DELETE
│       │   └── counts/route.ts     # GET: counts by status
│       ├── users/                  # User management API (admin)
│       │   ├── route.ts            # GET: list users
│       │   └── [id]/route.ts       # PATCH: update role/active
│       ├── tv-shows/               # TV Shows CRUD
│       │   ├── route.ts            # POST: create
│       │   └── [id]/
│       │       ├── route.ts        # PATCH: update, DELETE: delete
│       │       └── episodes/route.ts # GET: seasons & episodes (lightweight)
│       ├── scan/                   # Scanner API routes
│       │   ├── route.ts            # POST: start, GET: list
│       │   └── [id]/
│       │       ├── route.ts        # GET: status
│       │       ├── cancel/         # POST: cancel scan
│       │       └── progress/       # GET: SSE stream
│       ├── platforms/              # Platform management
│       │   ├── route.ts            # GET: list, POST: create
│       │   └── [id]/route.ts       # PATCH: update, DELETE: delete
│       ├── playback-tests/         # Playback test management
│       │   ├── route.ts            # GET: list, POST: create
│       │   └── [id]/route.ts       # GET, PATCH, DELETE
│       └── tmdb/                   # TMDB integration API
│           ├── search/route.ts     # Search TMDB
│           ├── match/route.ts      # Match show to TMDB
│           ├── status/route.ts     # Enhanced integration status
│           ├── bulk-match/route.ts # Auto-match all unmatched
│           ├── refresh-missing/route.ts # Sync shows needing metadata
│           ├── bulk-refresh/route.ts # Refresh all metadata
│           ├── refresh/[showId]/   # Refresh single show
│           ├── import-preview/[showId]/ # Preview import data
│           └── import/route.ts     # Import seasons/episodes
├── lib/
│   ├── prisma.ts                   # Prisma client
│   ├── auth.ts                     # Session management, requireAuth/requireAdmin
│   ├── issue-utils.ts              # Issue type/status labels and badge variants
│   ├── settings.ts                 # Settings utilities (server)
│   ├── settings-shared.ts          # Settings types (client-safe)
│   ├── format.ts                   # Formatting utilities
│   ├── status.ts                   # Status badge helpers
│   ├── playback-status.ts          # Playback test quality computation
│   ├── plex/                       # Plex integration
│   │   ├── auth.ts                 # Plex OAuth PIN flow
│   │   ├── client.ts               # Shared Plex API HTTP client
│   │   └── types.ts                # Plex API type definitions
│   ├── scanner/                    # Scanner service
│   │   ├── config.ts               # Environment config
│   │   ├── filesystem.ts           # File discovery
│   │   ├── parser.ts               # Filename parsing
│   │   ├── database.ts             # DB operations (batch processing)
│   │   ├── progress.ts             # Progress tracking
│   │   └── scan.ts                 # Orchestrator
│   ├── tasks/                      # Background task system
│   │   ├── types.ts                # Task types and interfaces
│   │   ├── progress.ts             # Task tracker and queue
│   │   ├── worker-manager.ts       # Worker thread spawning
│   │   ├── task-worker.ts          # Worker source (TypeScript)
│   │   ├── task-worker.js          # Worker compiled (gitignored)
│   │   └── index.ts                # Barrel export
│   ├── contexts/
│   │   ├── auth-context.tsx        # Auth state provider + useAuth hook
│   │   ├── task-context.tsx        # Task state & notifications (client)
│   │   └── issue-context.tsx       # Issue counts provider + hooks
│   ├── tmdb/                       # TMDB integration service
│   │   ├── config.ts               # API configuration
│   │   ├── types.ts                # TMDB API types
│   │   ├── client.ts               # HTTP client with rate limiting
│   │   ├── service.ts              # Match, sync, refresh operations
│   │   └── images.ts               # Poster/backdrop URL helpers
│   └── ffprobe/                    # FFprobe media analysis
│       ├── config.ts               # Path/timeout configuration
│       ├── types.ts                # FFprobe output types
│       ├── extract.ts              # Core extraction logic
│       ├── service.ts              # Analysis operations
│       └── index.ts                # Barrel export
├── components/
│   ├── app-sidebar.tsx             # Collapsible navigation sidebar (role-aware)
│   ├── page-header.tsx             # Reusable page header with title/description/action
│   ├── version-badge.tsx           # Version display with update indicator
│   ├── badge-selector.tsx          # Unified status badge selector with cascade support
│   ├── task-progress.tsx           # Real-time task progress display
│   ├── tmdb-match-dialog.tsx       # Search & match show to TMDB
│   ├── tmdb-import-dialog.tsx      # Import seasons/episodes from TMDB
│   ├── playback-test-dialog.tsx    # Record/edit playback tests per episode
│   ├── issues/                     # Issue reporting components
│   │   ├── issue-report-dialog.tsx       # Report from episode page
│   │   ├── issue-report-search-dialog.tsx # Report via show search
│   │   └── issue-edit-dialog.tsx         # View/edit issue details
│   └── ui/                         # shadcn/ui components
└── generated/
    └── prisma/                     # Generated Prisma types

prisma/
├── schema.prisma                   # Database schema
└── migrations/                     # Migration history
```

## API Routes

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/session` | Get current user session info |
| `GET` | `/api/auth/status` | Get auth config and Plex server connectivity |
| `POST` | `/api/auth/plex/pin` | Create a Plex auth PIN for OAuth flow |
| `POST` | `/api/auth/plex/callback` | Complete Plex OAuth (exchange PIN for session) |
| `POST` | `/api/auth/logout` | Logout (delete session, clear cookie) |

### Issues

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/issues` | List issues (filter by status, type, episodeId, showId) |
| `POST` | `/api/issues` | Create a new issue |
| `GET` | `/api/issues/[id]` | Get single issue with relations |
| `PATCH` | `/api/issues/[id]` | Update issue (status, resolution, details) |
| `DELETE` | `/api/issues/[id]` | Delete issue (reporter own open, or admin any) |
| `GET` | `/api/issues/counts` | Get issue counts by status (for sidebar badge) |

### Users (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `PATCH` | `/api/users/[id]` | Update user role or active status |

### TV Shows

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/tv-shows` | Create a new TV show |
| `PATCH` | `/api/tv-shows/[id]` | Update a TV show (supports `cascade` for monitorStatus) |
| `DELETE` | `/api/tv-shows/[id]` | Delete a TV show |

### Seasons & Episodes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/api/seasons/[id]` | Update a season (supports `cascade` for monitorStatus) |
| `PATCH` | `/api/episodes/[id]` | Update an episode |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/api/files/[id]` | Update file quality/action |
| `POST` | `/api/files/[id]/analyze` | Analyze file with FFprobe |
| `GET` | `/api/episodes/[id]/files` | Get episode files with playback tests |

### FFprobe Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ffprobe/status` | Get FFprobe availability and analysis statistics |

### Platforms

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/platforms` | List all platforms |
| `POST` | `/api/platforms` | Create new platform |
| `PATCH` | `/api/platforms/[id]` | Update platform |
| `DELETE` | `/api/platforms/[id]` | Delete platform |

### Playback Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/playback-tests` | List tests (filter by fileId) |
| `POST` | `/api/playback-tests` | Create new test |
| `PATCH` | `/api/playback-tests/[id]` | Update test |
| `DELETE` | `/api/playback-tests/[id]` | Delete test |

### Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/settings` | Get current settings |
| `PATCH` | `/api/settings` | Update settings |

### Scanner

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Start a new scan |
| `GET` | `/api/scan` | List recent scans |
| `GET` | `/api/scan/[id]` | Get scan status |
| `POST` | `/api/scan/[id]/cancel` | Cancel running scan |
| `GET` | `/api/scan/[id]/progress` | SSE progress stream |
| `POST` | `/api/tv-shows/[id]/sync` | Sync files for a single show |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | List all active and recent tasks |
| `GET` | `/api/tasks/[taskId]` | Get task status |
| `GET` | `/api/tasks/[taskId]/progress` | SSE progress stream |
| `POST` | `/api/tasks/[taskId]/cancel` | Cancel running task |

### TMDB Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tmdb/search?q=title&year=2020` | Search TMDB for shows |
| `GET` | `/api/tmdb/status` | Get integration status (shows/seasons/episodes counts) |
| `POST` | `/api/tmdb/match` | Match a show to TMDB ID (syncSeasons: false by default) |
| `POST` | `/api/tmdb/bulk-match` | Auto-match all unmatched shows (match only, no season sync) |
| `POST` | `/api/tmdb/refresh-missing` | Sync metadata for shows that need it |
| `POST` | `/api/tmdb/bulk-refresh` | Refresh all metadata for all matched shows |
| `POST` | `/api/tmdb/refresh/[showId]` | Refresh metadata for a single show |
| `GET` | `/api/tmdb/import-preview/[showId]` | Preview seasons/episodes available for import |
| `POST` | `/api/tmdb/import` | Import selected seasons/episodes from TMDB |

### Start Scan Request

```json
{
  "scanType": "full",
  "skipMetadata": true
}
```

## Database Schema

| Model | Key Fields | Description |
|-------|------------|-------------|
| `TVShow` | `title`, `year`, `folderName`, `monitorStatus`, TMDB fields | TV series with monitoring intent |
| `Season` | `seasonNumber`, `name`, `monitorStatus`, TMDB fields | Season within a show |
| `Episode` | `episodeNumber`, `title`, `monitorStatus`, TMDB fields | Episode within a season |
| `EpisodeFile` | `filepath`, `quality`, `action`, codec/resolution fields | Media file with quality state |
| `Platform` | `name`, `isRequired`, `sortOrder` | Playback test platforms |
| `PlaybackTest` | `platformId`, `status`, `testedAt`, `notes` | Playback test results per file |
| `MediaTrack` | `trackType`, `codec`, `language`, `channels` | Per-track media info from FFprobe |
| `ScanHistory` | `scanType`, `status`, file counts | Scan operation logs |
| `Settings` | `dateFormat`, `maxParallelTasks` | Application settings |
| `User` | `plexId`, `username`, `role`, `isActive` | User accounts (Plex or local admin) |
| `Session` | `userId`, `expiresAt` | Login sessions (cookie-backed) |
| `Issue` | `episodeId`, `userId`, `type`, `status`, `description` | Reported quality issues |

### Status Enums

```prisma
enum MonitorStatus { WANTED, UNWANTED }
enum FileQuality { UNVERIFIED, VERIFIED, OK, BROKEN }
enum FileAction { NOTHING, REDOWNLOAD, CONVERT, ORGANIZE, REPAIR }
enum PlaybackStatus { PASS, PARTIAL, FAIL }
enum UserRole { ADMIN, USER }
enum IssueType { PLAYBACK, QUALITY, AUDIO, SUBTITLE, CONTENT, OTHER }
enum IssueStatus { OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED }
```

## Filename Parsing

The scanner supports multiple naming conventions:

```
# Plex-style (recommended)
/TV Shows/Breaking Bad (2008)/Season 1/Breaking Bad - S01E01 - Pilot.mkv

# Standard SxxExx
Breaking.Bad.S01E01.720p.BluRay.mkv

# Alternative XxYY
Breaking Bad 1x01.mkv
```

## Status System

The application uses a two-dimensional status system that separates **user intent** from **computed state**.

### Monitor Status (User Intent)

Stored on shows, seasons, and episodes. Represents what the user wants to track.

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `WANTED` | User wants this content | Blue (default) |
| `UNWANTED` | User doesn't want this content | Gray (outline) |
| `PARTIAL` | Mixed children (display only, not stored) | Gray (secondary) |

**Cascade Updates**: When changing a show or season to `UNWANTED`, a dialog asks whether to apply to all children.

### Quality Status (Computed State)

Computed from children, never stored directly. Represents the current state of the content.

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `OK` | All files verified good | Green (default) |
| `UNVERIFIED` | Files exist but not verified | Yellow (warning) |
| `BROKEN` | At least one file has issues | Red (destructive) |
| `MISSING` | Wanted but no files exist | Gray (secondary) |

**Computation Logic** (worst status wins):
- Episode: Computed from its files
- Season: Worst quality among its episodes
- Show: Worst quality among its seasons

### File Quality

Stored on individual files. Can be auto-computed from playback tests.

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `UNVERIFIED` | Not yet tested | Yellow (warning) |
| `VERIFIED` | All required platform tests pass | Green (success) |
| `OK` | Reserved for future quality property checks | Green (success) |
| `BROKEN` | At least one required platform test fails | Red (destructive) |

**Auto-computation**: When playback tests are recorded, file quality is automatically updated based on required platforms.

### Playback Status

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `PASS` | Plays without issues | Green (success) |
| `PARTIAL` | Plays with conditions (e.g., needs transcoding) | Yellow (warning) |
| `FAIL` | Does not play | Red (destructive) |

### File Actions

| Action | Description |
|--------|-------------|
| `NOTHING` | No action needed |
| `REDOWNLOAD` | Should be re-downloaded |
| `CONVERT` | Needs format conversion |
| `ORGANIZE` | Needs file organization |
| `REPAIR` | Needs repair |

### UI Components

All status badges are clickable and open dropdowns to change values:

- **BadgeSelector**: Unified component for status selection with dropdown menus
  - Supports optimistic updates for immediate visual feedback
  - Optional cascade confirmation dialog for hierarchical entities (shows → seasons → episodes)
  - Works with any status type (monitor status, quality status, file actions, etc.)
  - Located at `src/components/badge-selector.tsx`

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, standalone output)
- **Database**: SQLite with Prisma ORM
- **UI**: shadcn/ui (Radix + Tailwind CSS)
- **Deployment**: Docker with multi-stage build (~420MB image)

## Development Commands

```bash
npm run dev          # Start dev server (compiles worker automatically)
npm run build        # Production build (compiles worker automatically)
npm run build:worker # Compile TypeScript worker to JS (esbuild)
npm start            # Start production server

npx prisma studio    # Open DB viewer
npx prisma migrate dev   # Run migrations
npx prisma generate  # Generate client
```

## Versioning & Releases

This project uses git tags to manage versions. When a version tag is pushed, GitHub Actions automatically:

1. **Builds a Docker image** tagged with the version number (e.g., `ghcr.io/lou-i3/curatr-app:1.0.0`)
2. **Creates a GitHub release** with auto-generated changelog from commits
3. **Deploys** to Portainer (if configured)

### Creating a Release

```bash
# Create and push a version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

The release notes are automatically generated from commit messages. You can edit them on GitHub after creation to add custom notes or a title.

### Pre-releases

For beta or alpha releases, include a suffix:

```bash
git tag -a v1.0.0-beta.1 -m "Beta release"
git push origin v1.0.0-beta.1
```

Pre-releases are marked as such on GitHub and get their own Docker tag.

### Changelog

View the [Changelog](/changelog) page in the app to see all releases. The version badge in the sidebar shows update availability.

## Roadmap

- [x] TV Show hierarchy browser
- [x] Library scanner with progress tracking
- [x] Batch processing for optimized scans
- [x] Plex-style filename parsing
- [x] Smart folder-based show detection
- [x] shadcn/ui components
- [x] Docker deployment
- [x] Collapsible sidebar with mobile drawer
- [x] TV Shows CRUD (create, edit, delete)
- [x] Search & filter toolbar
- [x] Grid/Table view toggle
- [x] Date format settings (EU/US/ISO)
- [x] TMDB integration (metadata, posters, auto-match)
- [x] Expandable seasons with inline episode tables
- [x] Import seasons & episodes from TMDB
- [x] Two-dimensional status system (monitor intent + quality state)
- [x] Clickable status badges with cascade updates
- [x] Single show files scan button + endpoint
- [x] Media files playback testing
- [x] FFprobe media analysis integration
- [x] Plex authentication (multi-user with role-based access)
- [x] Issue reporting system (report, track, resolve quality issues)
- [x] User management (admin controls for Plex users)
- [x] Plex Auth integration page with setup guide
- [x] Fix in app documentation for scanner and TMDB features to reflect real implementation
- [ ] Mobile responsive design improvements
- [x] Add manifest for PWA support
- [ ] Refactor codebase to store prisma client in the default location
- [ ] Check modules utilization and relevance and remove unused ones
- [ ] Transform API documentation into a swagger
- [ ] Movies support
- [ ] Plex database sync (read-only metadata enrichment)
- [ ] Bulk status operations
- [ ] Sonarr/Radarr integration
- [ ] Media request system (users request new content)
- [ ] Issue enhancements:
  - [ ] Issue comments/threads
  - [ ] Issue deduplication (group reports on same episode)
  - [ ] Issue analytics on dashboard
- [ ] Task system improvements:
  - [ ] Dismissible task dialogs with "you can close this" message
  - [ ] Task persistence in database (survive app restart)
  - [ ] Resume interrupted tasks after app crash/restart

## Disclaimer

This project is vibe coded with [Claude](https://claude.ai).

## License

MIT
