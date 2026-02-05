# Media Quality Tracker

[![GitHub](https://img.shields.io/github/license/Lou-i3/media-quality-tracker)](https://github.com/Lou-i3/media-quality-tracker/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)

A Next.js web application for tracking media file quality, playback compatibility, and maintenance status across a Plex media library.

## Features

- **Library Scanner** - Scan TV show directories to discover and catalog media files
- **Plex-style Parsing** - Automatically parse `Show Name (Year)/Season 01/S01E05.mkv` naming
- **Quality Tracking** - Track codec, resolution, bitrate, HDR, audio formats
- **Status Management** - Mark files as TO_CHECK, GOOD, BAD, or DELETED
- **Real-time Progress** - Live scan progress with Server-Sent Events
- **TV Show Management** - Full CRUD operations with search, filter, and grid/table views
- **Sidebar Navigation** - Easy navigation between Dashboard, TV Shows, Scans, and Settings
- **Dark Mode** - Full dark mode UI with system preference support

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
│   ├── tv-shows/
│   │   ├── page.tsx                # TV Shows list (grid/table)
│   │   ├── toolbar.tsx             # Search, filter, view toggle
│   │   ├── show-dialog.tsx         # Create/Edit TV show dialog
│   │   └── [id]/                   # Show → Season → Episode pages
│   └── api/
│       ├── tv-shows/               # TV Shows CRUD
│       │   ├── route.ts            # POST: create
│       │   └── [id]/route.ts       # PATCH: update, DELETE: delete
│       └── scan/                   # Scanner API routes
│           ├── route.ts            # POST: start, GET: list
│           └── [id]/
│               ├── route.ts        # GET: status
│               ├── cancel/         # POST: cancel scan
│               └── progress/       # GET: SSE stream
├── lib/
│   ├── prisma.ts                   # Prisma client
│   └── scanner/                    # Scanner service
│       ├── config.ts               # Environment config
│       ├── filesystem.ts           # File discovery
│       ├── parser.ts               # Filename parsing
│       ├── database.ts             # DB operations
│       ├── progress.ts             # Progress tracking
│       └── scan.ts                 # Orchestrator
├── components/
│   ├── sidebar.tsx                 # Navigation sidebar
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

### Scanner

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/scan` | Start a new scan |
| `GET` | `/api/scan` | List recent scans |
| `GET` | `/api/scan/[id]` | Get scan status |
| `POST` | `/api/scan/[id]/cancel` | Cancel running scan |
| `GET` | `/api/scan/[id]/progress` | SSE progress stream |

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
| `TVShow` | TV series (title, year, external IDs) |
| `Season` | Season within a show |
| `Episode` | Episode within a season |
| `EpisodeFile` | Media file with quality metadata |
| `ScanHistory` | Scan operation logs |
| `CompatibilityTest` | Playback test results |

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

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Database**: SQLite with Prisma ORM
- **UI**: shadcn/ui (Radix + Tailwind CSS)
- **Deployment**: Docker with multi-stage build

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
- [x] Plex-style filename parsing
- [x] shadcn/ui components
- [x] Docker deployment
- [x] Sidebar navigation
- [x] TV Shows CRUD (create, edit, delete)
- [x] Search & filter toolbar
- [x] Grid/Table view toggle
- [ ] ffprobe metadata extraction
- [ ] Movies support
- [ ] Plex database sync
- [ ] Bulk status operations
- [ ] Sonarr/Radarr integration

## License

MIT
