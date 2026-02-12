# Claude Code Instructions

## Project Overview
Curatr App - A Next.js web application for tracking media file quality, playback compatibility, and maintenance status across a Plex media library.

**Tech Stack:**
- Next.js 16 (App Router, TypeScript, standalone output)
- SQLite with Prisma ORM (better-sqlite3 adapter)
- shadcn/ui (Radix + Tailwind CSS)
- Docker deployment

**Key Directories:**
- `src/app/` - Pages and API routes
- `src/lib/` - Shared utilities and services
- `src/components/` - React components
- `prisma/` - Database schema and migrations

---

## Communication Style

### Response Verbosity
- **Balanced**: Explain key decisions, skip obvious details
- Focus on the "why" for non-trivial choices
- Keep explanations concise but informative

### Autonomy & Confirmation
- **Always propose before implementing**: Present the plan/approach and wait for approval
- For multi-step tasks, outline all steps upfront
- Never make architectural decisions without confirmation
- Small fixes within an approved plan can proceed without re-confirmation

### Error Handling
- **Fix with explanation**: When errors occur, fix them but explain:
  - What went wrong
  - Why it happened
  - How it was fixed
  - How to prevent it in the future (if applicable)

---

## Questions to Always Ask

Before starting work, clarify these if not provided:

1. **Scope**: What exactly needs to change? What should NOT change?
2. **Location**: Which files/components are affected?
3. **Dependencies**: Are there related features that might be impacted?
4. **Testing**: How should changes be verified?
5. **Edge cases**: Any specific scenarios to handle?

When uncertain about implementation:
- Present options with pros/cons
- Ask for preference before proceeding
- Never guess on business logic or user-facing behavior

---

## Coding Style & Patterns

### Code Organization
- Follow existing file/folder structure patterns
- Keep related code together (co-location)
- Prefer editing existing files over creating new ones
- Use barrel exports (`index.ts`) for module public APIs

### Naming Conventions
- **Files**: kebab-case (`tmdb-client.ts`, `scan-history.tsx`)
- **Components**: PascalCase (`TVShowCard`, `ScanProgress`)
- **Functions/Variables**: camelCase (`searchShows`, `episodeCount`)
- **Types/Interfaces**: PascalCase (`TMDBSearchResult`, `ScanConfig`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants (`TMDB_API_BASE_URL`)

### Comments & Documentation
- **File headers**: Brief description of file purpose
- **Function comments**: Describe what it does, not how (for exported functions)
- **Inline comments**: Only for non-obvious logic, explain the "why"
- **Self-documenting code**: Prefer clear variable/function names over comments
- Use JSDoc format for exported functions:
  ```typescript
  /**
   * Searches TMDB for TV shows matching the query
   * @param query - Search term
   * @param year - Optional year filter
   */
  export async function searchShows(query: string, year?: number)
  ```

### TypeScript
- **Explicit types for function signatures** (parameters and returns)
- **Let TS infer** internal variables and expressions
- **Avoid `any`** - use `unknown` and narrow with type guards
- **Use `type` for object shapes**, `interface` for extendable contracts

### Error Handling
- Always handle errors appropriately for the context
- API routes: Return proper HTTP status codes with error messages
- Services: Throw descriptive errors, catch at boundaries
- Never silently swallow errors

### React Patterns (Next.js App Router)
- **Server Components** (default): Render on server, smaller JS bundles, direct DB access
- **Client Components** (`'use client'`): Only when needed for interactivity (onClick, useState, useEffect) or browser APIs
- Use Server Actions for mutations when appropriate
- Prefer `loading.tsx` and `error.tsx` for route-level states
- Co-locate related components in the same directory

### UI Components & Styling
- **Always prefer shadcn/ui components** when they fit the need (Button, Card, Dialog, Table, etc.)
- If a shadcn component fits but isn't installed yet, **add it** via `npx shadcn@latest add <component>`
- **Tailwind**: Use for shadcn components (maintain their existing patterns)
- **Custom CSS**: Always prefer using existing styles in `globals.css` when building UI elements
- **Semantic color tokens**: Use Tailwind classes with token colors defined in `globals.css` rather than fixed color classes (e.g., avoid `text-red-500`, `bg-yellow-500`)
  - **For text**: Always use `-foreground` variants: `text-success-foreground`, `text-warning-foreground`, `text-destructive-foreground`
  - **For backgrounds**: Use base colors: `bg-success`, `bg-warning`, `bg-destructive`
  - **For borders**: Use base colors: `border-success`, `border-warning`, `border-destructive`
- Check `src/components/ui/` for installed components; see [shadcn/ui docs](https://ui.shadcn.com/docs/components) for full list

**Layout System (Responsive, Desktop-First):**

This is a **web-first application** with desktop as the primary experience. All layouts adapt responsively to mobile/tablet using Tailwind's mobile-first breakpoints (`md:` = 768px).

**Core Components:**

- **PageContainer** (`src/components/layout/page-container.tsx`): Standardized wrapper for all page content
  - Provides consistent responsive padding: `px-4 py-4 md:px-8 md:py-6`
  - **All pages use `maxWidth="wide"`** — no max-width constraint, content fills available space
  - Other variants: `narrow` (max-w-3xl, centered), `default` (max-w-5xl, centered), `full` (alias for wide)
  - Only `narrow` and `default` apply `mx-auto` centering
  - Import: `import { PageContainer } from '@/components/layout';`

- **AppBar** (`src/components/app-bar.tsx`): Full-width fixed header bar
  - Spans the entire page above both sidebar and content
  - Fixed `top-0 left-0 right-0 z-50 h-12` (3rem)
  - Padding: `pl-4 pr-4 md:pr-6` — left fixed for sidebar icon alignment, right responsive
  - App name: `text-sm md:text-lg` — visible on all screen sizes with responsive sizing
  - Mobile: sidebar trigger + logo + app name + UserMenu
  - Desktop: sidebar trigger + logo + app name + GitHub link + version badge + UserMenu
  - Import: `import { AppBar } from '@/components/app-bar';`


- **PageHeader** (`src/components/page-header.tsx`): Responsive page header
  - Displays title with responsive typography: `text-2xl md:text-3xl lg:text-4xl`
  - Optional description: `text-sm md:text-base`
  - Optional action button (stacks on mobile, inline on desktop)
  - Optional `breadcrumbs` prop — renders `PageBreadcrumbs` above the title
  - No hardcoded margins — spacing controlled by parent
  - Import: `import { PageHeader } from '@/components/page-header';`

- **PageBreadcrumbs** (`src/components/page-breadcrumbs.tsx`): Breadcrumb trail for page content
  - Always starts with a Home icon linking to `/`
  - Last item renders as current page (plain text), others as links
  - Used inside PageHeader via `breadcrumbs` prop, or standalone for custom layouts
  - Import: `import { PageBreadcrumbs } from '@/components/page-breadcrumbs';`
**Responsive Spacing Patterns:**

Use these consistent spacing patterns throughout the app:

```typescript
// Container padding (set by PageContainer)
px-4 py-4 md:px-8 md:py-6

// Section spacing (bottom margin)
mb-4 md:mb-6      // Small spacing
mb-6 md:mb-8      // Medium spacing (most common)
mb-8 md:mb-12     // Large spacing

// Grid/card gaps
gap-4 md:gap-6    // Standard grid gap

// Vertical stacks
space-y-4 md:space-y-6   // Normal stacking
space-y-6 md:space-y-8   // Loose stacking
```

**Responsive Typography Patterns:**

```typescript
// Page titles (h1) — set by PageHeader
text-2xl md:text-3xl lg:text-4xl

// Section titles (h2)
text-xl md:text-2xl

// Subsection titles (h3)
text-lg md:text-xl

// Body text
text-sm md:text-base

// Metadata/timestamps
text-xs md:text-sm
```

**Root Layout Structure:**

```tsx
// src/app/layout.tsx
<SidebarProvider className="flex-col">
  <AppBar />                              {/* Fixed full-width header (z-50, h-12) */}
  <div className="flex flex-1 pt-12">    {/* pt-12 offsets the fixed AppBar height */}
    <AppSidebar />                        {/* Sidebar below AppBar (no header, auto-close on mobile) */}
    <SidebarInset className="p-4 md:p-6"> {/* Responsive base padding (SidebarInset renders as <main>) */}
      {children}
    </SidebarInset>
  </div>
</SidebarProvider>
```

**Padding chain:** SidebarInset provides `p-4 md:p-6` base padding, then PageContainer adds `px-4 py-4 md:px-8 md:py-6` for content spacing. This creates the total padding seen on each page.

**Standard Page Structure:**

```tsx
import { PageContainer } from '@/components/layout';
import { PageHeader } from '@/components/page-header';

export default function SomePage() {
  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Page Title"
        description="Optional description"
        breadcrumbs={[{ label: 'Page Title' }]}
        action={<Button>Action</Button>}
      />

      {/* Page content with consistent spacing */}
      <div className="space-y-6 md:space-y-8">
        <Card>{/* Section 1 */}</Card>
        <Card>{/* Section 2 */}</Card>
      </div>
    </PageContainer>
  );
}
```

**Subpage with nested breadcrumbs:**

```tsx
<PageHeader
  title="TMDB Integration"
  breadcrumbs={[
    { label: 'Integrations', href: '/integrations' },
    { label: 'TMDB' },
  ]}
/>
```

**Detail page with standalone breadcrumbs (no PageHeader):**

```tsx
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';

<PageContainer maxWidth="wide">
  <PageBreadcrumbs items={[
    { label: 'TV Shows', href: '/tv-shows' },
    { label: show.title },
  ]} />
  {/* Custom header layout */}
</PageContainer>
```

**Sticky Header Pattern (TV Shows, Issues):**

For pages with toolbars/filters that should remain visible on scroll:

```tsx
<PageContainer maxWidth="wide">
  {/* Sticky header — top-12 accounts for the fixed AppBar (h-12 = 3rem) */}
  {/* -mt-4 md:-mt-6 absorbs PageContainer's top padding so header sits flush */}
  <div className="sticky top-12 z-10 bg-background -mt-4 md:-mt-6 pt-4 md:pt-6 pb-4 md:pb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b mb-6 md:mb-8">
    <PageHeader title="TV Shows" breadcrumbs={[{ label: 'TV Shows' }]} />
    <Toolbar /> {/* Filters, search, view toggles, etc. */}
  </div>

  {/* Scrollable content */}
  <div className="space-y-6 md:space-y-8">
    <DataTable columns={columns} data={data} />
  </div>
</PageContainer>
```

**Key sticky header techniques:**
- `sticky top-12` — Always use `top-12` (not `top-0`) because the AppBar is fixed at the top with h-12
- `-mt-4 md:-mt-6` — Absorbs PageContainer's top padding so sticky header sits flush against AppBar
- `-mx-4 px-4 md:-mx-8 md:px-8` — Negative margins extend to full width while keeping content aligned
- `pt-4 md:pt-6 pb-4 md:pb-6` — Consistent vertical padding inside sticky wrapper
- `border-b` — Visual separator from scrollable content

**Wide Tables (Horizontal Scroll on Mobile):**

For pages with data tables that may overflow on small screens:

```tsx
<div className="overflow-x-auto">
  <DataTable columns={columns} data={data} />
</div>
```

Page scrolls vertically normally; table scrolls horizontally on mobile when needed.

**Sidebar Structure (AppSidebar):**

All sections live in `SidebarContent` (no `SidebarFooter`), grouped with separators:
1. **Navigation** — Dashboard, TV Shows, Scans (admin), Issues, Integrations (admin), Tasks (admin)
2. **Settings** — admin only, separated by `SidebarSeparator`
3. **GitHub + Version** — mobile only (`isMobile`), shows GitHub link and changelog/version (hidden in AppBar on mobile via `hidden md:block`)

**Data Components:**
- **DataTable** (`src/components/ui/data-table.tsx`): Generic reusable table component powered by TanStack Table v8
  - Supports client-side sorting, column visibility, and custom cell renderers
  - Use when you need sortable/filterable tables (e.g., TV shows, scan history)
  - Requires column definitions specific to your data model (e.g., `tv-show-columns.tsx`)
  - Exposes table instance via `onTableReady` callback for advanced features (column visibility toggle)
- **DataTableColumnHeader** (`src/components/ui/data-table-column-header.tsx`): Sortable column header with visual indicators
  - Use in column definitions: `header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />`
  - Shows sort state: unsorted (↕), ascending (↑), descending (↓)
- **BadgeSelector** (`src/components/badge-selector.tsx`): Unified component for status badge selection
  - Supports optimistic updates for immediate visual feedback
  - Optional cascade confirmation dialog via `cascadeOptions` prop for hierarchical updates
  - Works with any enum/status type (MonitorStatus, FileQuality, FileAction, etc.)

**Breadcrumb Notes:**
- Dashboard (`/`) has NO breadcrumbs — it IS home. The Home icon in PageBreadcrumbs already links there.
- All other top-level pages: `breadcrumbs={[{ label: 'Page Name' }]}` (renders as Home icon > Page Name)
- Subpages: include parent as link, e.g. `[{ label: 'Integrations', href: '/integrations' }, { label: 'TMDB' }]`
- Detail pages with custom layouts: use `<PageBreadcrumbs>` standalone instead of PageHeader's `breadcrumbs` prop

**Component Gotchas:**
- **CollapsibleTrigger + SidebarMenuButton with tooltip**: Causes hydration errors due to complex nesting. Remove the `tooltip` prop from buttons inside `CollapsibleTrigger asChild`.
- **BreadcrumbSeparator nesting**: `BreadcrumbSeparator` renders as `<li>`. It must be a sibling of `BreadcrumbItem` (also `<li>`), never nested inside it. Use `React.Fragment` to group them in loops.
- **Radix Dialog + fixed elements above Sheet**: Modal Radix Dialogs (Sheet) set `pointer-events: none` on `<body>`, blocking clicks on fixed elements even at higher z-index. Fix: add `pointer-events-auto` to the fixed element and `onPointerDown stopPropagation` on interactive children to prevent the Radix dismiss from racing with click handlers.

### UX Patterns
- **Toast notifications**: Use for success/error feedback on user actions
- **Loading indicators**: Show for any operation that takes > 200ms

---

## Testing & Verification

### When to Test
- **Critical paths**: Core business logic, data transformations
- **Integration points**: API routes, database operations
- Tests are advised by Claude, run by user with provided instructions

### Verification Steps
After implementing changes, always provide:
1. How to verify the change works (manual steps)
2. What to check for regressions
3. Commands to run (build, lint, etc.)

### Build Verification
Before considering work complete:
- Ensure the project builds: `npm run build`
- Check for TypeScript errors
- Verify affected features still work

---

## Documentation Requirements

### Code Documentation
- New files: Include header comment explaining purpose
- New functions (exported): JSDoc with description and params
- Complex logic: Inline comments explaining intent

### UI/UX Documentation (In-App Help)
Every feature interface should help users understand what's happening:
- **Explanatory text**: Brief descriptions of what a feature does
- **Help tooltips (?)**: For settings, options, or actions that need clarification
- **Context for operations**: Users should know:
  - What will happen when they click a button
  - What data will be affected
  - How things work (e.g., parsing rules, scan behavior)
- **Example**: Scan page should explain what directories are scanned, how files are parsed, what operations run

### README Updates
- New features: Add to Features section
- New API endpoints: Add to API section
- Configuration changes: Update relevant sections

### Plan Files
- For significant features, use plan mode to document approach
- Plans are stored in `~/.claude/plans/`

---

## Project-Specific Context

### Database
- SQLite with Prisma
- Migrations in `prisma/migrations/`
- Generated client in `src/generated/prisma/`
- Run `npx prisma migrate dev` for new migrations
- Run `npx prisma generate` after schema changes

### Scanner Service
- Located in `src/lib/scanner/`
- Follows async generator pattern for memory efficiency
- Uses batch processing for database operations
- Progress tracking via subscriber pattern
- Supports single-show scan via `targetShowId` and `targetFolderName` options
  - Only scans the specified show's folder
  - Only marks files as deleted within that show's scope
  - Uses task type `show-scan` (distinct from full `scan`)

### Task System
- Located in `src/lib/tasks/`
- Unified system for all long-running operations (scans, TMDB operations)
- **Worker threads** for TMDB operations (keeps main thread responsive)
- Queue system with configurable max parallel tasks
- Task retention: 1 hour (configurable via `TASK_RETENTION_MS`)
- Task types: `scan`, `show-scan`, `tmdb-bulk-match`, `tmdb-refresh-missing`, `tmdb-bulk-refresh`, `tmdb-import`, `ffprobe-analyze`

**Critical: Global Singleton Pattern**

Next.js can create different module instances for different API routes in dev mode. The task system uses `globalThis` with a Symbol key to share state across all routes:

```typescript
const STATE_KEY = Symbol.for('media-quality-tracker.taskState');

function getGlobalState(): TaskGlobalState {
  const g = globalThis as typeof globalThis & { [STATE_KEY]?: TaskGlobalState };
  if (!g[STATE_KEY]) {
    g[STATE_KEY] = { activeTasks: new Map(), /* ... */ };
  }
  return g[STATE_KEY];
}

export const activeTasks = getGlobalState().activeTasks;
```

**Worker Compilation:**
- Source: `src/lib/tasks/task-worker.ts` (TypeScript)
- Output: `src/lib/tasks/task-worker.js` (compiled, gitignored)
- Build: `npm run build:worker` (uses esbuild, runs automatically with dev/build)

```typescript
// Creating a background task
import { createTmdbTask, scheduleCleanup, queueTaskRun } from '@/lib/tasks';

const tracker = createTmdbTask('tmdb-bulk-refresh');
tracker.setTotal(count);

const status = tracker.getProgress().status;
if (status === 'pending') {
  queueTaskRun(tracker.getTaskId(), runTask);
} else {
  runTask().catch((err) => tracker.fail(err.message));
}
```

**Task Context (Client):**
```typescript
// Shared polling and toast notifications
import { useTasks, useTaskCounts } from '@/lib/contexts/task-context';

const { tasks, loading, refresh } = useTasks();
const { running, pending, total } = useTaskCounts();
```

**Client Contexts (Root Layout):**
Three client contexts wrap the app in root layout (order: AuthProvider → TaskProvider → IssueProvider):
- `AuthProvider` — fetches `/api/auth/session`, provides `useAuth()` hook
- `TaskProvider` — polls `/api/tasks`, provides `useTasks()` / `useTaskCounts()` hooks
- `IssueProvider` — polls `/api/issues/counts`, provides `useIssueCounts()` / `useIssueContext()` hooks

**Single-Show vs Bulk Tasks:**
- Bulk tasks (auto-match, refresh-missing, bulk-refresh) have NO custom title
- Single-show tasks have a custom title like `"TMDB Refresh: Show Name"` or `"Scan: Show Name"`
- Use `t.title` to differentiate in UI (null = bulk, has value = single-show)
- Use `t.type` to distinguish between different operations:
  - `show-scan` - Single-show file scan (scans only that show's folder)
  - `scan` - Full library scan
  - `tmdb-*` - TMDB metadata operations

### Authentication System
- Located in `src/lib/auth.ts` (session management) and `src/lib/plex/` (Plex OAuth)
- Two modes: `AUTH_MODE=none` (default, no login) and `AUTH_MODE=plex` (Plex OAuth with roles)
- Cookie-based sessions (HTTP-only, 30-day expiry) backed by Session table in DB
- Seeded "Local Admin" user (id=1, plexId="local") created on first boot for no-auth mode attribution
- Plex server owner auto-promoted to ADMIN; other Plex users get USER role

**Key Functions** (`src/lib/auth.ts`):
- `getSession()` — reads cookie, looks up Session + User in DB
- `requireAuth(request)` — returns user or throws 401
- `requireAdmin(request)` — returns admin user or throws 403
- `getAuthMode()` / `isAuthEnabled()` — reads AUTH_MODE env var
- `ensureLocalAdmin()` — upserts the seeded admin user

**Plex OAuth Flow** (`src/lib/plex/auth.ts`):
- PIN-based auth: create PIN → user authorizes on plex.tv → poll for token
- Validates user has access to configured Plex server before creating account
- Server owner detection for auto-admin promotion

**Auth Context** (`src/lib/contexts/auth-context.tsx`):
```typescript
import { useAuth } from '@/lib/contexts/auth-context';
const { user, isAdmin, isAuthenticated, authMode, loading, logout } = useAuth();
```
- During loading: `isAdmin` defaults to `true` to prevent UI flash (admin items don't disappear then reappear)
- In no-auth mode: `isAdmin=true`, `isAuthenticated=true` (backwards compatible)

**Proxy** (`src/proxy.ts`):
- Lightweight cookie check + redirect (no DB access — edge runtime limitations)
- Only active when `AUTH_MODE=plex`
- Passes through `/login`, `/api/auth/*`, static assets, and PWA assets (manifest, icons, screenshots)

**API Route Protection**:
- All mutation API routes (POST/PATCH/DELETE) use `requireAdmin()`
- GET routes accessible to all authenticated users
- Pattern: `const user = await requireAdmin(request);` as first line

**Layout Gotcha**:
- `TaskProvider` and `IssueProvider` must be OUTSIDE the `showSidebar` conditional in root layout
- Otherwise prerendering fails because children render without context providers
- The sidebar conditional only controls `SidebarProvider` + `AppSidebar`, not the data contexts

### Issue Reporting System
- Database models: `Issue` with `IssueType` and `IssueStatus` enums
- Works in both auth modes (no-auth: issues attributed to Local Admin user)
- `userId` on Issue is non-nullable — every issue always has a reporter

**Issue Context** (`src/lib/contexts/issue-context.tsx`):
```typescript
import { useIssueCounts } from '@/lib/contexts/issue-context';
const { active, total } = useIssueCounts(); // For sidebar badge

import { useIssueContext } from '@/lib/contexts/issue-context';
const { counts, refresh } = useIssueContext(); // For pages that modify issues
```

**Issue Components** (`src/components/issues/`):
- `IssueReportDialog` — report from episode page (knows episode context)
- `IssueReportSearchDialog` — report from anywhere (search show → pick episode → report)
- `IssueEditDialog` — view/edit issue details, change status (admin), add resolution

**Issue Utilities** (`src/lib/issue-utils.ts`):
- `ISSUE_TYPE_LABELS`, `ISSUE_STATUS_LABELS` — display mappings
- `getIssueTypeVariant()`, `getIssueStatusVariant()` — Badge variant helpers

### FFprobe Service
- Located in `src/lib/ffprobe/`
- Extracts detailed media info: video (codec, resolution, HDR, bit depth), audio (codec, channels, language), subtitles
- Stores per-track info in `MediaTrack` model, summary fields on `EpisodeFile`
- **Not bundled in Docker** - user configures via `FFPROBE_PATH` env var
- Integration page at `/integrations/ffprobe` with setup instructions
- Manual trigger only via "Analyze" button on episode file pages
- Uses task system for tracking (`ffprobe-analyze` task type)

### API Routes
- RESTful conventions
- Error format: `{ error: "message" }`
- Success format varies by endpoint
- SSE for real-time updates (scan progress)

### API Documentation (OpenAPI/Swagger)

Interactive API docs are served at `/api-docs` via Swagger UI, generated from `@swagger` JSDoc annotations in route files.

**How it works:**
1. Each API route file (`src/app/api/**/route.ts`) has a `@swagger` JSDoc block with OpenAPI YAML
2. `scripts/generate-openapi.mjs` runs at build time (`npm run build:openapi`), scans all route files, and outputs `public/openapi.json`
3. The `/api-docs` page renders the spec using `swagger-ui-react`
4. `build:openapi` runs automatically as part of `npm run dev` and `npm run build`

**Key files:**
- `scripts/generate-openapi.mjs` — Build script with base OpenAPI definition, shared schemas (Prisma enums), tags, and security schemes
- `src/app/api-docs/page.tsx` — Server component page
- `src/app/api-docs/api-docs-client.tsx` — Client component rendering Swagger UI (with search filter and collapsed categories)
- `src/app/globals.css` — Swagger UI theme overrides (scoped to `.swagger-ui-wrapper`)
- `public/openapi.json` — Generated spec (gitignored, build artifact)

**Adding docs to a new API route:**

Add a `@swagger` JSDoc block above the imports in the route file. Use `$ref` for shared schemas defined in the generate script:

```typescript
/**
 * Description of the route file
 *
 * @swagger
 * /api/your-route:
 *   get:
 *     summary: Short description
 *     description: Longer description of what this endpoint does.
 *     tags: [YourTag]
 *     parameters:
 *       - in: query
 *         name: param
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
```

**Shared schemas** (defined in `generate-openapi.mjs`): `Error`, `Success`, `MonitorStatus`, `FileQuality`, `Action`, `PlaybackStatus`, `ScanStatus`, `TrackType`, `UserRole`, `IssueType`, `IssueStatus`, `TaskStatus`

**Tags** (for grouping in Swagger UI): Auth, TV Shows, Seasons, Episodes, Files, Playback Tests, Platforms, Scanner, Tasks, TMDB, Issues, Users, Settings, FFprobe

**Important notes:**
- When adding a new Prisma enum, add it to the `schemas` object in `generate-openapi.mjs` too
- When adding a new API route group, add a tag entry in `generate-openapi.mjs`
- Mutation endpoints should include `security: [cookieAuth: []]`
- Run `npm run build:openapi` to regenerate after changes, then refresh `/api-docs`
- The `.mjs` extension is required because `swagger-jsdoc` is an ESM-only package

### Environment Variables
- Development: `.env` (gitignored)
- Template: `.env.example` (committed)
- Required: `DATABASE_URL`, plus at least one of `TV_SHOWS_PATH` or `MOVIES_PATH`
- Integrations: `TMDB_API_KEY`, `FFPROBE_PATH`, `FFPROBE_TIMEOUT`
- Authentication: `AUTH_MODE`, `PLEX_URL`, `PLEX_TOKEN`
- Scanner: `SCAN_CONCURRENCY`, `SCAN_BATCH_SIZE`
- Tasks: `TASK_RETENTION_MS`
- Docker: `TZ`, `PUID`, `PGID`

See `.env.example` and README.md for full documentation of all variables.

### Key Lib Utilities
Always use these utilities instead of native JS methods:

**Date Formatting** (never use `toLocaleDateString()`):
- `src/lib/format.ts` - `formatDate()`, `formatDateTime()` (async, for server components)
- `src/lib/settings-shared.ts` - `formatDateWithFormat()`, `formatDateTimeWithFormat()` (sync, for client components)

```typescript
// Server Component
import { getSettings } from '@/lib/settings';
import { formatDateWithFormat } from '@/lib/format';
const settings = await getSettings();
formatDateWithFormat(date, settings.dateFormat);

// Client Component
import { formatDateWithFormat, type DateFormat } from '@/lib/settings-shared';
const [dateFormat, setDateFormat] = useState<DateFormat>('EU');
// Fetch from /api/settings, then:
formatDateWithFormat(new Date(dateString), dateFormat);
```

**Other Utilities**:
- `src/lib/format.ts` - `formatFileSize()`, `formatDuration()`
- `src/lib/status.ts` - `getStatusVariant()` (for Badge variants)
- `src/lib/tmdb/images.ts` - `getPosterUrl()`, `getBackdropUrl()`, `getStillUrl()` (TMDB image URLs)
  - **Important**: In client components, import from `@/lib/tmdb/images` not `@/lib/tmdb` (barrel re-exports Prisma)

---

## Considerations

### Performance
- Use batch operations for bulk database work
- Consider memory for large file operations (async generators)
- Implement rate limiting for external APIs

### Docker
- Multi-stage build for small images (~420MB)
- Standalone Next.js output
- PUID/PGID for file permissions

### Security
- Never commit secrets
- Validate user input at API boundaries
- Use parameterized queries (Prisma handles this)
- **Plex database**: Read-only access only (never write)
- **Auth cookies**: HTTP-only, secure, SameSite=Lax
- **API mutations**: All require `requireAdmin()` — GET routes are read-only for any authenticated user
- **Plex token**: Server admin token, stable (does not rotate), stored in env var only
