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

---

### Design System

This section defines **strict rules** for layout, responsiveness, data display, and UX patterns. All new pages and components must follow these rules.

#### 1. Breakpoints & Approach

- **Mobile-first CSS**: Base Tailwind classes target mobile, `md:` adds desktop overrides
- **Primary breakpoint**: `md:` (768px) — used for nearly all responsive changes
- **Secondary breakpoints**: `sm:` (640px, rare — only for flex direction on detail pages), `lg:` (1024px, rare — only for h1 typography)
- Never introduce new breakpoint patterns without strong justification

#### 2. Page Width & Layout

**All pages use `maxWidth="wide"`** — content fills available space, no max-width constraint.

```tsx
// Every page follows this structure
<PageContainer maxWidth="wide">
  <PageHeader title="..." breadcrumbs={[...]} />
  <div className="space-y-6 md:space-y-8">
    {/* Page content */}
  </div>
</PageContainer>
```

**Core Layout Components:**
- **PageContainer** (`src/components/layout/page-container.tsx`): Wraps all page content, provides `px-4 py-4 md:px-8 md:py-6`
- **AppBar** (`src/components/app-bar.tsx`): Fixed `top-0 left-0 right-0 z-50 h-12`
  - Mobile: sidebar trigger + logo + app name (`text-sm`) + UserMenu
  - Desktop: + GitHub link + version badge (`hidden md:block`)
- **PageHeader** (`src/components/page-header.tsx`): Title + optional description + optional action + optional breadcrumbs
- **PageBreadcrumbs** (`src/components/page-breadcrumbs.tsx`): Home icon → parent links → current page

**Root Layout Structure:**
```tsx
<SidebarProvider className="flex-col">
  <AppBar />
  <div className="flex flex-1 pt-12">       {/* pt-12 offsets AppBar height */}
    <AppSidebar />
    <SidebarInset className="p-4 md:p-6">   {/* Base padding */}
      {children}
    </SidebarInset>
  </div>
</SidebarProvider>
```

**Padding chain:** SidebarInset `p-4 md:p-6` + PageContainer `px-4 py-4 md:px-8 md:py-6` = total page padding.

#### 3. Mobile Grid Rules

**On mobile, all content stacks to 1 column.** No exceptions for content cards.

```typescript
// CORRECT — stacks on mobile
grid-cols-1 md:grid-cols-2     // 2-col desktop
grid-cols-1 md:grid-cols-3     // 3-col desktop
grid-cols-2 md:grid-cols-4     // Exception: compact stat cards only (small, fixed-height)

// WRONG — never do multi-column content on mobile
grid-cols-2                    // Never for content cards
grid-cols-1 sm:grid-cols-2     // Don't use sm: for grids
```

**Flex stacking on mobile:**
```typescript
flex-col md:flex-row           // Section headers with actions
flex-col sm:flex-row           // Detail pages (poster + content) — sm: OK here only
flex flex-wrap gap-2           // Buttons/badges wrap naturally on all sizes
```

#### 4. Spacing Scale (Strict)

```typescript
// Container padding (PageContainer — do not override)
px-4 py-4 md:px-8 md:py-6

// Section spacing (between major sections)
mb-4 md:mb-6                  // Small
mb-6 md:mb-8                  // Medium (most common)
mb-8 md:mb-12                 // Large

// Grid/card gaps
gap-4 md:gap-6                // Standard (only pattern to use)

// Vertical stacks
space-y-4 md:space-y-6        // Normal stacking
space-y-6 md:space-y-8        // Loose stacking

// Card content padding
p-4 md:p-6                    // Standard card padding
```

#### 5. Typography Scale (Strict)

```typescript
text-2xl md:text-3xl lg:text-4xl   // h1 — page titles (PageHeader)
text-xl md:text-2xl                // h2 — section titles
text-lg md:text-xl                 // h3 — subsection titles
text-sm md:text-base               // Body text, descriptions
text-xs md:text-sm                 // Metadata, timestamps, captions
```

#### 6. Data Display Rules

**When to use which component:**

| Context | Component | Features |
|---------|-----------|----------|
| User-facing list pages (TV Shows, Issues) | **Card view + Table toggle** | Default to cards (mobile-friendly), offer table toggle |
| Dashboard sections | **Cards only** | Stat cards, chart cards, list cards — no table view |
| Admin/data-heavy pages (Scans, Tasks) | **DataTable only** | Sorting, filtering, column visibility toggle |

**DataTable rules:**
- Always wrap in `<div className="overflow-x-auto">` for mobile horizontal scroll
- Include column visibility toggle (`ColumnVisibilityToggle`) on data-heavy tables
- Use `DataTableColumnHeader` for sortable columns
- Column definitions live in a separate file (e.g., `tv-show-columns.tsx`)

**Card view rules:**
- Cards use `p-4 md:p-6` internal padding
- Grid: `grid-cols-1 md:grid-cols-2` (or `md:grid-cols-3` for compact cards)
- Detail cards: `flex-col sm:flex-row` for poster + content layout

**Data Components:**
- **DataTable** (`src/components/ui/data-table.tsx`): TanStack Table v8, client-side sorting, column visibility, custom cell renderers
  - Column definitions in separate files (e.g., `tv-show-columns.tsx`)
  - `onTableReady` callback exposes table instance for advanced features
- **DataTableColumnHeader** (`src/components/ui/data-table-column-header.tsx`): Sortable headers — unsorted (↕), ascending (↑), descending (↓)
- **BadgeSelector** (`src/components/badge-selector.tsx`): Status badge selection with optimistic updates, optional cascade confirmation

#### 7. Mobile Navigation & Visibility

**Sidebar:**
- Desktop: Collapsible menu (16rem width)
- Mobile: Sheet/drawer overlay (18rem), auto-closes on route change via `useEffect` watching `pathname` + `isMobile`
- All sections in `SidebarContent` (no `SidebarFooter`):
  1. Navigation — Dashboard, TV Shows, Scans (admin), Issues, Integrations (admin), Tasks (admin)
  2. Settings — admin only, separated by `SidebarSeparator`
  3. GitHub + Version — mobile only (`{isMobile && (...)}`)

**Visibility patterns:**
```typescript
hidden md:block           // Desktop only (AppBar GitHub link, version badge)
hidden md:flex            // Desktop only flex container
{isMobile && (...)}       // Mobile only (sidebar footer items)
```

**Text overflow (always handle):**
```typescript
truncate                  // Single-line ellipsis (titles, links)
line-clamp-2              // Max 2 lines (descriptions)
min-w-0                   // Required on flex parent for truncation to work
shrink-0                  // Prevent shrinking (images, icons, badges)
```

**Image sizing:**
```typescript
mx-auto sm:mx-0           // Center on mobile, left-align on desktop
```

#### 8. Page Patterns (Reference)

**Standard page:**
```tsx
<PageContainer maxWidth="wide">
  <PageHeader title="Page Title" breadcrumbs={[{ label: 'Page Title' }]}
    action={<Button>Action</Button>} />
  <div className="space-y-6 md:space-y-8">
    <Card>{/* Section */}</Card>
  </div>
</PageContainer>
```

**Sticky header page (TV Shows, Issues):**
```tsx
<PageContainer maxWidth="wide">
  <div className="sticky top-12 z-10 bg-background -mt-4 md:-mt-6 pt-4 md:pt-6 pb-4 md:pb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b mb-6 md:mb-8">
    <PageHeader title="..." breadcrumbs={[...]} />
    <Toolbar />
  </div>
  <div className="space-y-6 md:space-y-8">{/* Content */}</div>
</PageContainer>
```

Key: `sticky top-12` (not `top-0`) because AppBar is `h-12`. Negative margins extend to full width.

**Subpage breadcrumbs:**
```tsx
<PageHeader title="TMDB" breadcrumbs={[
  { label: 'Integrations', href: '/integrations' },
  { label: 'TMDB' },
]} />
```

**Detail page (standalone breadcrumbs):**
```tsx
<PageBreadcrumbs items={[
  { label: 'TV Shows', href: '/tv-shows' },
  { label: show.title },
]} />
```

**Breadcrumb rules:**
- Dashboard (`/`) has NO breadcrumbs — it IS home
- All other pages: `breadcrumbs={[{ label: 'Page Name' }]}`
- Subpages: parent as link + current as text
- Detail pages with custom layouts: use `<PageBreadcrumbs>` standalone

#### 9. Dialogs

```typescript
max-w-2xl max-h-[80vh]    // Constrained to viewport, scrolls internally
```

**Gotchas:**
- **CollapsibleTrigger + SidebarMenuButton**: Remove `tooltip` prop from buttons inside `CollapsibleTrigger asChild` to avoid hydration errors
- **BreadcrumbSeparator**: Must be sibling of `BreadcrumbItem` (both `<li>`), never nested inside it
- **Radix Dialog + fixed elements**: Sheet sets `pointer-events: none` on `<body>`. Fix with `pointer-events-auto` on the fixed element and `onPointerDown stopPropagation`

#### 10. UX Rules

**Empty states:**
- Always show a meaningful message when no data exists (never a blank area)
- Include a call-to-action when possible (e.g., "No issues reported yet", "FFprobe not configured — Set up integration")
- Use `text-sm text-muted-foreground` centered in the card

**Loading states:**
- Use `<Skeleton>` components matching the shape of expected content
- Show loading indicators for any operation that takes > 200ms
- Skeleton count should match typical data (e.g., 3 skeleton rows for a list)

**Toast notifications:**
- Use for success/error feedback on user actions (scan started, issue reported, etc.)
- Never use for passive state changes (data loading, polling updates)

**Refresh pattern:**
- Dashboard: single Refresh button on PageHeader using `router.refresh()`
- Individual cards/charts: only add refresh if they fetch their own data independently
- Contexts that poll (tasks, issues) handle their own refresh — don't add manual refresh for these

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

### Infinite Scroll Pattern
- Hook: `src/hooks/use-infinite-scroll.ts`
- Used by: Files page, Playback Tests page
- Manages offset-based pagination with IntersectionObserver sentinel
- Two refresh modes: `refetch()` (shows loading skeleton) and `refresh()` (silent, for post-action updates)
- Aborted fetches don't clear loading state (prevents empty flash on navigation)
- Pages build `apiQuery` from URL search params and pass to the hook
- `parseResponse` callback transforms API response into `{ data, total, meta? }`

```typescript
const { items, total, loading, loadingMore, hasMore, sentinelRef, refresh, refetch } =
  useInfiniteScroll<ItemType>({
    apiUrl: '/api/endpoint',
    apiQuery,            // serialized URLSearchParams string
    limit: 200,
    parseResponse: (json) => ({
      data: json.data as ItemType[],
      total: json.total as number,
    }),
  });
```

**Pages that should adopt `useInfiniteScroll`:**
- **TV Shows page** (`src/app/tv-shows/page.tsx`) — currently loads all shows at once via `fetch('/api/tv-shows?full=true')`, no pagination. High priority for large libraries.
- **Issues page** (`src/app/issues/page.tsx`) — currently loads all issues at once via `fetch('/api/issues')`. Moderate priority.
- **Scans page** (`src/app/scans/page.tsx`) — server component with `prisma.scanHistory.findMany({ take: 50 })` hard limit. Needs API endpoint + client migration. High priority.
- **Tasks page** — NOT suitable (ephemeral data, real-time polling, small dataset).

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
- All mutation API routes (POST/PATCH/DELETE) use `checkAdmin()`
- All GET API routes use `checkAuth()` (validates session exists and is not expired)
- Pattern for mutations: `const authError = await checkAdmin(); if (authError) return authError;`
- Pattern for reads: `const authError = await checkAuth(); if (authError) return authError;`
- Auth endpoints (`/api/auth/*`) are public — no auth checks

**Layout Gotcha**:
- `TaskProvider` and `IssueProvider` must be OUTSIDE the `showSidebar` conditional in root layout
- Otherwise prerendering fails because children render without context providers
- The sidebar conditional only controls `SidebarProvider` + `AppSidebar`, not the data contexts

### Security Hardening
- Full documentation: `docs/security.md`

**Security Headers** (`next.config.ts`):
- All responses include: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`
- CSP allows `image.tmdb.org` (posters), `plex.tv`/`app.plex.tv` (OAuth), `'unsafe-inline'` (Tailwind)
- Dev mode adds `'unsafe-eval'` (React Fast Refresh) and `ws://localhost:*` (HMR)
- **No HSTS** — self-hosted app, users configure at reverse proxy level
- When modifying CSP, ensure new external domains are added to the appropriate directive

**Rate Limiting** (`src/lib/rate-limit.ts`):
- In-memory sliding-window rate limiter, no external dependencies
- Applied to `/api/auth/plex/pin` (10 req/min) and `/api/auth/plex/callback` (30 req/min)
- Uses `x-forwarded-for` → `x-real-ip` → `'unknown'` for client IP detection
- Returns 429 with `Retry-After` header when limit exceeded
- Auto-cleanup every 5 minutes to prevent memory leaks

```typescript
// Usage pattern for new rate-limited endpoints
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const limiter = createRateLimiter('endpoint-name', {
  maxRequests: 10,
  windowMs: 60 * 1000,
});

export async function POST(request: Request) {
  const { allowed, retryAfterMs } = limiter.check(getClientIp(request));
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((retryAfterMs || 60000) / 1000)) } }
    );
  }
  // ... handler logic
}
```

**Session Cleanup** (`src/lib/auth.ts`):
- `cleanupExpiredSessions()` deletes sessions past their `expiresAt`
- Called opportunistically during `createSession()`, throttled to once per hour
- Runs in background (fire-and-forget with `.catch(() => {})`)

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

### Dashboard
- Located in `src/app/dashboard/` (client components) + `src/app/page.tsx` (server data fetching)
- **Hybrid architecture**: Server component fetches all stats via ~12 parallel Prisma queries, passes serialized props to client orchestrator
- **Role-aware**: All users see library health, issues, quality breakdown; admins additionally see actions needed, file intelligence, system operations, integration health
- **Personalized greeting**: Uses session username (`Hi, {name}`) or falls back to "Dashboard"

**Key Files:**
- `src/app/page.tsx` — Server component with `getDashboardStats()`, pre-formats BigInt values
- `src/app/dashboard/dashboard-client.tsx` — Client orchestrator, role-gating via `useAuth()`, section layout
- `src/app/dashboard/sections/` — Individual section components:
  - `stat-card.tsx` — Reusable stat card with icon, value, subtitle, color variant
  - `library-health.tsx` — 4 stat cards (Shows, Episodes, Size, Health %)
  - `quick-actions.tsx` — Role-aware action buttons (browse, report issue, scan, tasks, etc.)
  - `issues-overview.tsx` — Issues with clickable status filter badges, fetches from `/api/issues`
  - `recent-activity.tsx` — Last 5 scan summaries with status icons
  - `quality-breakdown.tsx` — Donut chart (Recharts) for file quality distribution
  - `actions-needed.tsx` — Admin: horizontal bar chart for files needing action
  - `file-intelligence.tsx` — Admin: codec/resolution bar charts + HDR donut, FFprobe empty state
  - `system-operations.tsx` — Admin: live task status via `useTasks()` context
  - `integration-health.tsx` — Admin: TMDB + FFprobe status with progress bars

**Architecture Notes:**
- `totalSize` (BigInt from Prisma) must be pre-formatted on the server using `formatFileSize()` before passing to client — importing `@/lib/format` in a client component causes `Module not found: 'fs'` because of the settings → prisma chain
- Issues API (`GET /api/issues`) returns a flat array, not `{ issues: [...] }`
- Charts use shadcn chart component (`src/components/ui/chart.tsx`) built on Recharts
- Uses existing polling contexts (tasks, issues) — no additional polling added
- 2-column grid layout on desktop (`grid-cols-1 md:grid-cols-2`) for all sections
- `[MOVIES FUTURE]` markers in code show where movies support will plug in

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
