# Media Quality Tracker

[![GitHub](https://img.shields.io/github/license/Lou-i3/media-quality-tracker)](https://github.com/Lou-i3/media-quality-tracker/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Vibe Coded](https://img.shields.io/badge/vibe%20coded-Claude-blueviolet)](https://claude.ai)

A Next.js web application for tracking media file quality, playback compatibility, and maintenance status across a Plex media library.

## Features

- **Library Scanner** - Scan TV show directories to discover and catalog media files
- **Batch Processing** - Optimized database operations for fast scanning of large libraries
- **Plex-style Parsing** - Automatically parse `Show Name (Year)/Season 01/S01E05.mkv` naming
- **Smart Show Detection** - Extracts show names from folder structure for reliable matching
- **Folder-based Matching** - Preserves original folder names to prevent duplicates when titles are customized
- **Quality Tracking** - Track codec, resolution, bitrate, HDR, audio formats
- **Status Management** - Mark files as TO_CHECK, GOOD, BAD, or DELETED
- **Real-time Progress** - Live scan progress with percentage and file count
- **TV Show Management** - Full CRUD operations with search, filter, and grid/table views
- **TMDB Integration** - Enrich shows with posters, descriptions, ratings, and air dates from The Movie Database
  - Auto-match shows by title and year with confidence scoring
  - Manual search and match for unmatched shows
  - Bulk refresh metadata for all matched shows
  - Display posters, backdrops, genres, and ratings on show pages
- **Settings** - Configurable date format (EU/US/ISO) stored in database
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
    image: ghcr.io/lou-i3/media-quality-tracker:latest
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
│   ├── settings/
│   │   └── page.tsx                # Settings page
│   ├── integrations/
│   │   ├── page.tsx                # Integrations hub
│   │   └── tmdb/page.tsx           # TMDB integration config & status
│   ├── tv-shows/
│   │   ├── page.tsx                # TV Shows list (grid/table)
│   │   ├── toolbar.tsx             # Search, filter, view toggle
│   │   ├── show-dialog.tsx         # Create/Edit TV show dialog
│   │   └── [id]/                   # Show → Season → Episode pages
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
│           ├── status/route.ts     # Integration status
│           ├── bulk-match/route.ts # Auto-match all unmatched
│           ├── bulk-refresh/route.ts # Refresh all metadata
│           └── refresh/[showId]/   # Refresh single show
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
│   └── tmdb/                       # TMDB integration service
│       ├── config.ts               # API configuration
│       ├── types.ts                # TMDB API types
│       ├── client.ts               # HTTP client with rate limiting
│       ├── service.ts              # Match, sync, refresh operations
│       └── images.ts               # Poster/backdrop URL helpers
├── components/
│   ├── app-sidebar.tsx             # Collapsible navigation sidebar
│   ├── tmdb-match-dialog.tsx       # Search & match show to TMDB
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
| `PATCH` | `/api/tv-shows/[id]` | Update a TV show |
| `DELETE` | `/api/tv-shows/[id]` | Delete a TV show |

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

### TMDB Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tmdb/search?q=title&year=2020` | Search TMDB for shows |
| `GET` | `/api/tmdb/status` | Get integration status (matched/unmatched counts) |
| `POST` | `/api/tmdb/match` | Match a show to TMDB ID |
| `POST` | `/api/tmdb/bulk-match` | Auto-match all unmatched shows |
| `POST` | `/api/tmdb/bulk-refresh` | Refresh metadata for all matched shows |
| `POST` | `/api/tmdb/refresh/[showId]` | Refresh metadata for a single show |

### Start Scan Request

```json
{
  "scanType": "full",
  "skipMetadata": true
}
```

## Database Schema

| Model | Description |
|-------|-------------|
| `TVShow` | TV series (title, year, folderName, TMDB metadata) |
| `Season` | Season within a show (TMDB poster, overview, air date) |
| `Episode` | Episode within a season (TMDB still, overview, runtime) |
| `EpisodeFile` | Media file with quality metadata |
| `ScanHistory` | Scan operation logs |
| `CompatibilityTest` | Playback test results |
| `Settings` | Application settings (date format, etc.) |

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

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, standalone output)
- **Database**: SQLite with Prisma ORM
- **UI**: shadcn/ui (Radix + Tailwind CSS)
- **Deployment**: Docker with multi-stage build (~420MB image)

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm start            # Start production server

npx prisma studio    # Open DB viewer
npx prisma migrate dev   # Run migrations
npx prisma generate  # Generate client
```

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
- [ ] ffprobe metadata extraction
- [ ] Movies support
- [ ] Plex database sync
- [ ] Bulk status operations
- [ ] Sonarr/Radarr integration

## Disclaimer

This project is vibe coded with [Claude](https://claude.ai).

## License

MIT
