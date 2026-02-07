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
- **Semantic color tokens**: Use Tailwind classes with token colors defined in `globals.css` (e.g., `text-destructive`, `bg-warning`, `border-success`) rather than fixed color classes (e.g., avoid `text-red-500`, `bg-yellow-500`)
- Check `src/components/ui/` for installed components; see [shadcn/ui docs](https://ui.shadcn.com/docs/components) for full list

**Component Gotchas:**
- **CollapsibleTrigger + SidebarMenuButton with tooltip**: Causes hydration errors due to complex nesting. Remove the `tooltip` prop from buttons inside `CollapsibleTrigger asChild`.

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

### Task System
- Located in `src/lib/tasks/`
- Unified system for all long-running operations (scans, TMDB operations)
- **Worker threads** for TMDB operations (keeps main thread responsive)
- Queue system with configurable max parallel tasks
- Task retention: 1 hour (configurable via `TASK_RETENTION_MS`)
- Task types: `scan`, `tmdb-bulk-match`, `tmdb-refresh-missing`, `tmdb-bulk-refresh`, `tmdb-import`

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

**Single-Show vs Bulk Tasks:**
- Bulk tasks (auto-match, refresh-missing, bulk-refresh) have NO custom title
- Single-show tasks have a custom title like `"TMDB Refresh: Show Name"`
- Use `t.title` to differentiate in UI (null = bulk, has value = single-show)

### API Routes
- RESTful conventions
- Error format: `{ error: "message" }`
- Success format varies by endpoint
- SSE for real-time updates (scan progress)

### Environment Variables
- Development: `.env` (gitignored)
- Template: `.env.example` (committed)
- Required: `DATABASE_URL`
- Scanner: `TV_SHOWS_PATH`, `MOVIES_PATH`
- TMDB: `TMDB_API_KEY`

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
