# Project Structure

```
scripts/
└── generate-openapi.mjs            # Build-time OpenAPI spec generator

src/
├── proxy.ts                        # Auth route protection (cookie check, no DB)
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── manifest.ts                 # PWA web app manifest
│   ├── apple-icon.png              # Apple touch icon (180x180)
│   ├── layout.tsx                  # Root layout with sidebar + providers
│   ├── api-docs/
│   │   ├── page.tsx                # API documentation page
│   │   └── api-docs-client.tsx     # Swagger UI client component
│   ├── login/
│   │   ├── page.tsx                # Login page
│   │   └── plex-login-button.tsx   # Plex OAuth button component
│   ├── files/
│   │   ├── page.tsx                # Files browser (card/table, infinite scroll)
│   │   ├── file-columns.tsx        # DataTable column definitions
│   │   └── files-toolbar.tsx       # Search, filter, column visibility, view toggle
│   ├── playback-tests/
│   │   ├── page.tsx                # Playback tests browser (card/table, infinite scroll)
│   │   ├── playback-test-columns.tsx # DataTable column definitions
│   │   └── playback-tests-toolbar.tsx # Search, filter, column visibility, view toggle
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
│   │   ├── show-dialog.tsx         # Create/Edit TV show dialog
│   │   └── [id]/
│   │       ├── page.tsx            # Show detail with expandable seasons
│   │       ├── seasons-list.tsx    # Accordion seasons with episode tables
│   │       ├── episode-columns.tsx # Episode DataTable column definitions
│   │       ├── episode-dialog.tsx  # Create/Edit episode dialog
│   │       ├── tmdb-section.tsx    # TMDB integration controls
│   │       ├── tmdb-help-dialog.tsx # TMDB features help
│   │       └── episodes/
│   │           └── [episodeId]/
│   │               ├── page.tsx              # Episode detail (files + issues)
│   │               ├── episode-detail-status-badges.tsx  # Status controls
│   │               ├── episode-playback-tests.tsx # Inline playback test management
│   │               ├── episode-issues-list.tsx # Issue sidebar component
│   │               ├── file-rescan-button.tsx # Re-check file on disk button
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
│       ├── files/                   # File management API
│       │   ├── route.ts            # GET: list with filters & pagination
│       │   └── [id]/
│       │       ├── route.ts        # PATCH: update quality/action
│       │       ├── analyze/route.ts # POST: FFprobe analysis
│       │       └── rescan/route.ts  # POST: re-check file on disk
│       ├── episodes/[id]/
│       │   └── files/route.ts      # GET: files for an episode
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
├── hooks/
│   └── use-infinite-scroll.ts     # Shared infinite scroll hook (offset-based pagination)
├── components/
│   ├── app-sidebar.tsx             # Collapsible navigation sidebar (role-aware)
│   ├── page-header.tsx             # Reusable page header with title/description/action
│   ├── version-badge.tsx           # Version display with update indicator
│   ├── badge-selector.tsx          # Unified status badge selector with cascade support
│   ├── task-progress.tsx           # Real-time task progress display
│   ├── tmdb-match-dialog.tsx       # Search & match show to TMDB
│   ├── tmdb-import-dialog.tsx      # Import seasons/episodes from TMDB
│   ├── playback-test-dialog.tsx    # Record/edit playback tests per episode
│   ├── column-visibility-toggle.tsx # Shared column visibility dropdown
│   ├── view-toggle.tsx             # Card/table view toggle
│   ├── files/
│   │   ├── media-info-section.tsx  # Media info display + analyze button
│   │   └── analyze-media-button.tsx # FFprobe analyze trigger button
│   ├── playback-tests/
│   │   └── edit-test-dialog.tsx    # Shared edit playback test dialog
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
