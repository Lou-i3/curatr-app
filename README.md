# Curatr App

[![GitHub](https://img.shields.io/github/license/Lou-i3/curatr-app)](https://github.com/Lou-i3/curatr-app/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Self-Hosted](https://img.shields.io/badge/Self--Hosted-Docker-blue)](https://docs.docker.com/)
[![Vibe Coded](https://img.shields.io/badge/vibe%20coded-Claude-blueviolet)](https://claude.ai)

A **self-hosted** quality management tool for Plex media libraries. Track file quality across your library, let your users report playback issues, test compatibility across devices, and keep on top of what needs upgrading — all from a single, clean interface. Deploy with Docker and keep full control of your data.

**For server admins**: dashboard with library health, quality breakdown, codec/resolution analytics, bulk operations, and integration with TMDB and FFprobe.
**For your users**: browse the library, report issues (audio, subtitles, playback, quality), and track their submissions.

## Disclaimer

This project is vibe coded with [Claude](https://claude.ai) and provided **as-is**, with no warranty or guarantee of any kind. Use it at your own risk — always **back up your data** before using any features that modify files or metadata.

We are not liable for any data loss, corruption, or unexpected behavior. Pull requests and issues are welcome, but this is a personal project maintained in our spare time — response times may vary.

---

## Table of Contents

- [Curatr App](#curatr-app)
  - [Disclaimer](#disclaimer)
  - [Table of Contents](#table-of-contents)
  - [Screenshots](#screenshots)
  - [Features](#features)
  - [Self-Hosted](#self-hosted)
  - [Quick Start](#quick-start)
    - [Development](#development)
    - [Docker (Production)](#docker-production)
  - [Configuration](#configuration)
  - [Tech Stack](#tech-stack)
  - [Development](#development-1)
  - [API Documentation](#api-documentation)
  - [Versioning \& Releases](#versioning--releases)
    - [Creating a Release](#creating-a-release)
    - [Pre-releases](#pre-releases)
  - [Roadmap](#roadmap)
    - [Core Features](#core-features)
    - [UI / UX](#ui--ux)
    - [Issue System](#issue-system)
    - [Integrations](#integrations)
    - [Task System](#task-system)
    - [Notifications](#notifications)
    - [Infrastructure](#infrastructure)
    - [Localization](#localization)
  - [Security](#security)
  - [Further Documentation](#further-documentation)
  - [License](#license)

---

## Screenshots

> **Coming soon** — Screenshots and a demo GIF of the dashboard, library view, issue reporting, and quality tracking will be added here.

---

## Features

- **Role-Aware Dashboard** - Personalized overview of your media library
  - Library health stats (shows, episodes, storage, health percentage)
  - Quick actions (browse, report issues, scan, manage tasks)
  - Issues overview with clickable status filter badges
  - Recent scan activity with status indicators
  - Quality breakdown donut chart (all users)
  - Admin sections: actions needed, file intelligence (codec/resolution/HDR), live task status, integration health
  - Personalized greeting with username
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
  - File statistics: total files on disk with size, total runtime, and missing files highlighted per show
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
- **Files Browser** - Browse and manage all episode files across the library
  - Card and table views with column visibility toggle
  - Filters: search, quality, action, file existence, analyzed status
  - Inline quality and action editing with badge selectors (admin)
  - Analyze (FFprobe) and rescan actions per file (admin)
  - Infinite scroll pagination (200 files per batch)
- **Playback Testing** - Record and track playback compatibility across platforms
  - Configurable platforms (TV, Web Player, Mobile, custom)
  - Mark platforms as required for quality verification
  - Auto-compute file quality: VERIFIED when all required platforms pass
  - Test history with notes and timestamps
  - Add/edit/delete tests from episode list or detail pages
  - Centralized playback tests page with card/table views
  - Status filter chips with server-computed counts
  - Search by show title or filename, filter by platform
  - Infinite scroll pagination (200 tests per batch)
- **Settings** - Configurable date format (EU/US/ISO), max parallel tasks, playback platforms, and user management (when auth enabled)
- **Responsive Design** - Desktop-first with full mobile adaptation
  - Mobile-first CSS with `md:` (768px) as primary breakpoint
  - Single-column stacking on mobile, multi-column grids on desktop
  - Card + table view toggle on list pages (TV Shows, Issues, Files, Playback Tests)
  - Horizontal scroll for data tables on small screens
  - Auto-closing sidebar drawer on mobile navigation
  - Responsive typography, spacing, and card padding throughout
- **Responsive Sidebar** - Collapsible navigation (Cmd/Ctrl+B), mobile drawer, version display
- **PWA Support** - Installable as a Progressive Web App on phones (iOS/Android) and desktop
- **API Documentation** - Interactive Swagger UI at `/api-docs` with search and collapsible categories, generated from JSDoc annotations
- **Dark Mode** - Full dark mode UI
- **Custom Theme** - Nunito font, green accent colors, consistent design

## Self-Hosted

Curatr is designed to run on your own hardware - no cloud services or subscriptions required. Your media library data stays entirely on your server.

- **Full Privacy**: All data stored locally in SQLite
- **No Account Required**: No sign-ups, no external services (TMDB integration is optional)
- **Docker Ready**: Single container deployment with volume mounts for your media
- **Resource Friendly**: Lightweight Next.js app with ~420MB Docker image

## Quick Start

### Development

**Prerequisites:** Node.js 24+ and npm 11+ ([install via nvm](https://github.com/nvm-sh/nvm))

> Don't forget to set your `.env` file from the `.env.example` template with the required environment variables before starting.

```bash
# Install dependencies (also runs prisma generate automatically)
npm install

# Run migrations (creates SQLite database)
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker (Production)

```bash
# Build and run
docker compose up
```

<details>
<summary><strong>Example docker-compose.yml</strong></summary>

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

</details>

## Configuration

All environment variables can be set in `.env` (development) or in your `docker-compose.yml` (production). See `.env.example` for a template.

| Category | Variable | Default | Description |
|----------|----------|---------|-------------|
| **Required** | `DATABASE_URL` | - | SQLite database path (e.g., `file:./prisma/dev.db`) |
| | `TV_SHOWS_PATH` | - | Path to TV shows directory* |
| | `MOVIES_PATH` | - | Path to movies directory* |
| **Auth** | `AUTH_MODE` | `none` | `none` (single-user) or `plex` (multi-user with Plex login) |
| | `PLEX_URL` | - | Plex server URL. Required when `AUTH_MODE=plex` |
| | `PLEX_TOKEN` | - | Plex authentication token. Required when `AUTH_MODE=plex` |
| **Integrations** | `TMDB_API_KEY` | - | TMDB API Read Access Token ([get one here](https://www.themoviedb.org/settings/api)) |
| | `FFPROBE_PATH` | - | Path to ffprobe binary (not set = disabled) |
| | `FFPROBE_TIMEOUT` | `30000` | FFprobe execution timeout in ms |
| | `PLEX_DB_PATH` | - | Path to Plex database (not yet implemented) |
| **Scanner** | `SCAN_CONCURRENCY` | `4` | Parallel file operations during scan |
| | `SCAN_BATCH_SIZE` | `100` | Files per database batch |
| **Tasks** | `TASK_RETENTION_MS` | `3600000` | Completed task retention (1 hour) |
| **Docker** | `TZ` | `UTC` | Timezone (e.g., `Europe/Paris`) |
| | `PUID` | `1000` | User ID for file permissions |
| | `PGID` | `1000` | Group ID for file permissions |

*At least one of `TV_SHOWS_PATH` or `MOVIES_PATH` is required.

<details>
<summary><strong>FFprobe installation paths</strong></summary>

| Platform | Path |
|----------|------|
| Linux | `/usr/bin/ffprobe` |
| macOS (Homebrew, Apple Silicon) | `/opt/homebrew/bin/ffprobe` |
| macOS (Homebrew, Intel) | `/usr/local/bin/ffprobe` |
| Docker (after `apk add ffmpeg`) | `/usr/bin/ffprobe` |
| Docker (static binary mount) | `/ffprobe/ffprobe` |

> **Docker / NAS users**: FFprobe is not included in the Docker image. See the [FFprobe Docker Setup Guide](docs/ffprobe-docker-setup.md) for instructions on using a static binary with volume mounts — works on Synology, QNAP, Unraid, and other NAS devices.

</details>

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, standalone output)
- **Database**: SQLite with Prisma ORM
- **UI**: shadcn/ui (Radix + Tailwind CSS)
- **Deployment**: Docker with multi-stage build (~420MB image)

## Development

```bash
npm run dev          # Start dev server (compiles worker + OpenAPI spec automatically)
npm run build        # Production build (compiles worker + OpenAPI spec automatically)
npm run build:worker # Compile TypeScript worker to JS (esbuild)
npm run build:openapi # Generate OpenAPI spec from @swagger JSDoc annotations
npm start            # Start production server

npx prisma studio    # Open DB viewer
npx prisma migrate dev   # Run migrations
npx prisma generate  # Generate client
```

## API Documentation

Interactive API documentation is available at `/api-docs` when the app is running.

The documentation includes all endpoints with request/response schemas, parameter descriptions, and authentication requirements. It is generated from JSDoc annotations in the route source files using OpenAPI 3.0.

The raw OpenAPI spec is available at `/openapi.json`.

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

## Roadmap

> 🔴 Top Priority · 🟡 Next Up · 🔵 Later · ⚪️ Idea · ⚫️ Dropped

### Core Features

- 🔴 Bulk status operations
- 🔴 Bulk FFprobe analyze (season, show, whole library)
- 🟡 Library statistics page (quality distribution, codec breakdown, resolution spread, storage by show)
- 🔵 Movies support
- ✅ Files browser (card/table views, filters, inline editing, infinite scroll)
- 🔵 Duplicate file detection (find duplicate episodes across the library)
- ✅ Playback tests page (centralized view with status chips, search, platform filter, infinite scroll)
- 🔵 Storage analytics (disk space usage breakdown by show/quality/codec)
- 🔵 Media request system (users request new content)

### UI / UX

- 🔴 Rethink displayed info in UI
- 🟡 Global search (search across shows, episodes, files, and issues)
- 🟡 Better logo/app icon for PWA
- 🟡 Add comprehensive filters to DataTables
- 🔵 Add light theme support
- ⚪️ Keyboard shortcuts (power-user navigation)
- 🔵 Persistent filters (remember filter/sort preferences per page)
- 🔵 User setting: prefer table or cards view (with option to prefer table except for mobile)
- 🔵 User setting: view active sessions and revoke all or single
- Make sure all buttons have confirmation popins if they trigger a significant action (e.g., rescanning, analyzing, deleting data)
- Enhance changelog to show "your version" and "latest version" tags

### Issue System

- 🟡 Issue comments/threads
- 🟡 Issue deduplication (group reports on same episode)
- 🟡 Issue analytics on dashboard
- 🟡 Transform issues to playback tests
- 🟡 Issue data enhancement by admin

### Integrations

- 🟡 Plex database sync (read-only metadata enrichment)
- 🔵 Plex users sync button (fetch all users from server)
- 🔵 Sonarr/Radarr integration
- 🔵 Tautulli integration (import playback history to inform quality decisions)
- 🔵 Jellyfin support (alternative media server)
- ⚪️ Webhook support (notify external services on events)

### Task System

- 🔵 Dismissible task dialogs with "you can close this" message
- 🔵 Task persistence in database (survive app restart)
- ⚪️ Resume interrupted tasks after crash/restart
- 🔵 Automated tasks (configurable schedule)

### Notifications

- 🔵 In-app notifications for issues/requests
- 🔵 Push notifications

### Infrastructure

- 🟡 Database backup/restore (export and import from the UI)
- 🟡 Health API endpoint (`/api/health` — app version, DB status, uptime)
- 🔵 Library model (multiple media libraries per type, library-scoped scanning and stats)
- 🔵 Multi-architecture Docker images (amd64 + arm64)
- 🔵 Refactor Prisma client to default location
- 🔵 Audit module utilization, remove unused (from package.json)
- 🔵 Refactor DB documentation to DBML
- 🔵 Create docs site
- 🔵 Activity/audit log (track who did what and when)
- 🔵 API key authentication (programmatic access for scripts/automation)

### Localization

- 🔵 Multi-language support (FR/EN) for issues/requests/dashboard

## Security

Curatr includes security hardening out of the box:

- **Security headers**: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Cookie security**: HttpOnly, SameSite=Lax, Secure (auto-detected via HTTPS)
- **Rate limiting**: Auth endpoints are rate-limited to prevent brute-force attacks
- **Session management**: Cryptographically secure tokens, server-side validation, automatic expired session cleanup
- **Role-based access**: All mutation API routes require admin role

For full details on the security model, HTTPS recommendations, and how to audit dependencies, see the [Security documentation](docs/security.md).

## Further Documentation

- [Project Structure](docs/project-structure.md)
- [Status System](docs/status-system.md)
- [Database Schema](docs/database-schema.md)
- [FFprobe Docker Setup](docs/ffprobe-docker-setup.md)
- [Security](docs/security.md)

## License

MIT
