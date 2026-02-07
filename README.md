# Curatr App

[![GitHub](https://img.shields.io/github/license/Lou-i3/curatr-app)](https://github.com/Lou-i3/curatr-app/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Vibe Coded](https://img.shields.io/badge/vibe%20coded-Claude-blueviolet)](https://claude.ai)

A Next.js web application for tracking media file quality, playback compatibility, and maintenance status across a Plex media library.

## Features

- **Library Scanner** - Scan TV show directories to discover and catalog media files
- **Single-Show Sync** - Sync files for individual shows without rescanning the entire library
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
- **Settings** - Configurable date format (EU/US/ISO) and max parallel tasks
- **Responsive Sidebar** - Collapsible navigation (Cmd/Ctrl+B), mobile drawer, version display
- **Dark Mode** - Full dark mode UI with system preference support
- **Custom Theme** - Nunito font, green accent colors, consistent design

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

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | SQLite database path |
| `TV_SHOWS_PATH` | Yes* | - | Path to TV shows directory |
| `MOVIES_PATH` | Yes* | - | Path to movies directory |
| `TMDB_API_KEY` | No | - | TMDB API Read Access Token for metadata integration |
| `TZ` | No | `UTC` | Timezone for date display (e.g., `Europe/Paris`, `America/New_York`) |
| `PUID` | No | `1000` | User ID for file permissions |
| `PGID` | No | `1000` | Group ID for file permissions |
| `FFPROBE_PATH` | No | `/usr/bin/ffprobe` | Path to ffprobe binary |
| `SCAN_CONCURRENCY` | No | `4` | Parallel ffprobe processes |
| `TASK_RETENTION_MS` | No | `3600000` | Task retention time in ms (1 hour) |

*At least one of `TV_SHOWS_PATH` or `MOVIES_PATH` is required.

### Example .env

```bash
DATABASE_URL="file:./prisma/dev.db"
TV_SHOWS_PATH="/media/TV Shows"
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
    volumes:
      - ./data:/app/data
      - /path/to/media:/media:ro
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── layout.tsx                  # Root layout with sidebar
│   ├── scans/
│   │   └── page.tsx                # Scanner UI
│   ├── tasks/
│   │   └── page.tsx                # Background tasks management
│   ├── settings/
│   │   └── page.tsx                # Settings page
│   ├── changelog/
│   │   └── page.tsx                # Changelog (GitHub releases)
│   ├── integrations/
│   │   ├── page.tsx                # Integrations hub
│   │   └── tmdb/
│   │       ├── page.tsx            # TMDB integration config & status
│   │       └── tmdb-integration-help-dialog.tsx # Help documentation
│   ├── tv-shows/
│   │   ├── page.tsx                # TV Shows list (grid/table)
│   │   ├── toolbar.tsx             # Search, filter, view toggle
│   │   ├── show-dialog.tsx         # Create/Edit TV show dialog
│   │   └── [id]/
│   │       ├── page.tsx            # Show detail with expandable seasons
│   │       ├── seasons-list.tsx    # Accordion seasons with episode tables
│   │       ├── tmdb-section.tsx    # TMDB integration controls
│   │       ├── tmdb-help-dialog.tsx # TMDB features help
│   │       └── episodes/[episodeId]/ # Episode detail page
│   └── api/
│       ├── settings/route.ts       # Settings API
│       ├── tv-shows/               # TV Shows CRUD
│       │   ├── route.ts            # POST: create
│       │   └── [id]/route.ts       # PATCH: update, DELETE: delete
│       ├── scan/                   # Scanner API routes
│       │   ├── route.ts            # POST: start, GET: list
│       │   └── [id]/
│       │       ├── route.ts        # GET: status
│       │       ├── cancel/         # POST: cancel scan
│       │       └── progress/       # GET: SSE stream
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
│   ├── settings.ts                 # Settings utilities (server)
│   ├── settings-shared.ts          # Settings types (client-safe)
│   ├── format.ts                   # Formatting utilities
│   ├── status.ts                   # Status badge helpers
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
│   │   └── task-context.tsx        # Task state & notifications (client)
│   └── tmdb/                       # TMDB integration service
│       ├── config.ts               # API configuration
│       ├── types.ts                # TMDB API types
│       ├── client.ts               # HTTP client with rate limiting
│       ├── service.ts              # Match, sync, refresh operations
│       └── images.ts               # Poster/backdrop URL helpers
├── components/
│   ├── app-sidebar.tsx             # Collapsible navigation sidebar
│   ├── version-badge.tsx           # Version display with update indicator
│   ├── task-progress.tsx           # Real-time task progress display
│   ├── tmdb-match-dialog.tsx       # Search & match show to TMDB
│   ├── tmdb-import-dialog.tsx      # Import seasons/episodes from TMDB
│   └── ui/                         # shadcn/ui components
└── generated/
    └── prisma/                     # Generated Prisma types

prisma/
├── schema.prisma                   # Database schema
└── migrations/                     # Migration history
```

## API Routes

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

### Files & Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PATCH` | `/api/files/[id]` | Update file quality/action |
| `PATCH` | `/api/compatibility-tests/[id]` | Update test status |

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
| `CompatibilityTest` | `platform`, `status` | Playback test results per file |
| `ScanHistory` | `scanType`, `status`, file counts | Scan operation logs |
| `Settings` | `dateFormat` | Application settings |

### Status Enums

```prisma
enum MonitorStatus { WANTED, UNWANTED }
enum FileQuality { UNVERIFIED, OK, BROKEN }
enum FileAction { NOTHING, REDOWNLOAD, CONVERT, ORGANIZE, REPAIR }
enum TestStatus { NOT_TESTED, WORKS, PLAYABLE, FAILS }
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

Stored on individual files. User-verifiable state.

| Status | Description |
|--------|-------------|
| `UNVERIFIED` | Not yet checked |
| `OK` | File is good |
| `BROKEN` | File has issues |

### Test Status (Compatibility Tests)

| Status | Description |
|--------|-------------|
| `NOT_TESTED` | No test performed |
| `WORKS` | Plays without issues |
| `PLAYABLE` | Plays with conditions (e.g., needs transcoding) |
| `FAILS` | Does not play |

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

- **StatusSelect**: Generic status selector for any status type
- **MonitorStatusSelect**: Specialized selector with cascade confirmation dialog

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
- [x] Single show files sync button + endpoint
- [ ] ffprobe metadata extraction
- [ ] Movies support
- [ ] Plex database sync
- [ ] Bulk status operations
- [ ] Sonarr/Radarr integration
- [ ] Task system improvements:
  - [ ] Dismissible task dialogs with "you can close this" message
  - [ ] Task persistence in database (survive app restart)
  - [ ] Resume interrupted tasks after app crash/restart

## Disclaimer

This project is vibe coded with [Claude](https://claude.ai).

## License

MIT
