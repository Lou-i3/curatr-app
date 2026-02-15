# Roadmap → UI Changes Mapping

Every UI change inferred from the roadmap, organized by roadmap item then by page/component.

---

## Core Features

### Bulk Status Operations (🔴)

**TV Shows list** (`src/app/tv-shows/`)
- Add "Select" toggle button to toolbar (between column visibility and view toggle)
- Card view: checkbox overlay on each card when selection mode active
- Table view: checkbox column as first column in `tv-show-columns.tsx`
- Floating bulk action bar (sticky bottom) when items selected: selected count, "Set Monitor Status" dropdown, "Deselect All", "Cancel"

**Show detail — Seasons list** (`src/app/tv-shows/[id]/seasons-list.tsx`)
- "Select" toggle per season header
- Checkbox column on episode DataTable when active
- "Select all in season" checkbox on season card header
- Floating action bar: "Set Monitor Status", "Set Quality", "Set Action" for selected episodes/files

**Episode detail** (`src/app/tv-shows/[id]/episodes/[episodeId]/`)
- Checkboxes on each file card when >1 file exists
- Floating action bar: "Set Quality", "Set Action" for selected files

**Issues page** (`src/app/issues/`)
- Checkboxes in both card and table view
- Floating action bar: "Change Status" dropdown, "Delete Selected" (with confirmation)

**New shared components:**
- `BulkActionBar` — reusable sticky bottom bar
- `SelectionCheckbox` — reusable card/table checkbox
- Batch variant of `BadgeSelector` accepting multiple entity IDs

---

### Bulk FFprobe Analyze (🔴)

**Show detail** (`src/app/tv-shows/[id]/page.tsx`)
- "Analyze All" button in header action group (next to Scan, Edit)
- Disabled with tooltip when FFprobe not configured

**Seasons list** (`src/app/tv-shows/[id]/seasons-list.tsx`)
- "Analyze" button per season card header
- Spinner/disabled state when analysis running for that season

**Episode detail** (`src/app/tv-shows/[id]/episodes/[episodeId]/`)
- "Analyze All Files" button in Files section header when >1 file

**FFprobe integration page** (`src/app/integrations/ffprobe/`)
- New "Bulk Actions" card: "Analyze Unanalyzed" button (with count), "Re-analyze All" button
- Active task progress card (reuse TaskProgress pattern)
- Stats: X/Y files analyzed

**Dashboard — File Intelligence** (`src/app/dashboard/sections/file-intelligence.tsx`)
- When FFprobe configured but files unanalyzed: add "Analyze All" CTA alongside existing setup CTA

**Tasks page / Task context**
- New task type label for `ffprobe-bulk-analyze`

---

### Library Statistics Page (🟡)

**New page:** `/statistics`
- Quality distribution — donut chart + table (counts & percentages per quality status)
- Codec breakdown — horizontal bar chart + sortable table (codec, count, %, size), toggle count vs size
- Resolution spread — horizontal bar chart + table, HDR subsection (HDR10/DV/HLG/SDR)
- Storage by show — bar chart (top 20), DataTable (show name linked, total size, file count, avg size), "show all" toggle
- Audio/subtitle analytics — codec distribution, language distribution, subtitle availability

**Sidebar** (`src/components/app-sidebar.tsx`)
- Add "Statistics" entry (BarChart3 icon) after TV Shows

**Dashboard**
- "View Full Statistics" link at bottom of Quality Breakdown section
- Same link in File Intelligence section
- "Library Statistics" button in Quick Actions (admin)

---

### Movies Support (🔵)

**New pages:**
- `/movies` — list page (card/table toggle, toolbar: search, monitor filter, quality filter, add movie)
- `/movies/[id]` — detail page (poster + metadata, files section, issues sidebar, TMDB section, FFprobe button)

**Sidebar** — add "Movies" entry (Film icon) after TV Shows

**Dashboard — Library Health** — add Movies stat card

**Dashboard — Quick Actions** — add "Browse Movies" button

**Scans page** — scan type selector: "Full Library" / "TV Shows Only" / "Movies Only"

**TMDB integration** — movie stats section, movie bulk operations, library overview tab/toggle (Shows vs Movies)

**Integrations hub** — update stats to include movie counts

**New components:** `MovieDialog` (add/edit/delete), movie card, movie columns

---

### Files Tab (✅)

**Page:** `/files`
- Card + table views with infinite scroll (200 items/page)
- Filters: search, quality, action, file existence, analyzed status
- Card view: quality/action badge selectors (admin), FFprobe analyze, rescan buttons
- Table view: sortable DataTable with column visibility toggle
- "Scan Library" button in header (admin)

**Sidebar** — "Files" entry (FileVideo icon), admin-only

**Dashboard — Quick Actions** — "Browse Files" for admins

---

### Duplicate File Detection (🔵)

**New page:** `/files/duplicates` (or section within Files tab)
- DataTable grouped by episode (same show+season+episode with multiple files)
- Expandable rows showing individual file details
- Per-file actions: "Keep" (primary), "Remove" (mark for action)
- Summary card: "X episodes have duplicates, totaling Y GB"

**Show detail** — warning badge if show has duplicate files

**Episode detail** — "Duplicate" warning badge when multiple files exist

**Dashboard** — duplicates stat in Actions Needed section

---

### Playback Tests Page (✅)

**Page:** `/playback-tests`
- Card + table views with infinite scroll (200 items/page)
- Filters: search, platform, status
- Card view: inline edit/delete per test
- Table view: sortable DataTable with column visibility toggle
- Summary stats: total tests, pass/partial/fail rates

**Sidebar** — "Playback Tests" entry (MonitorCheck icon), admin

---

### Storage Analytics (🔵)

**Part of Statistics page** (or separate `/storage` page)
- Treemap chart: storage by show
- Stacked bar: storage by quality, by codec
- "Reclaimable space" section: files marked REDOWNLOAD + CONVERT with estimated savings
- Resolution breakdown by storage

---

## UI / UX

### Rethink Displayed Info (🔴)

**TV Show cards**
- Restructure: Title+Year+Rating → status badges → key stats
- Add quality health mini-bar (green/yellow/red proportional)
- Remove description from card (detail page only)

**TV Show table columns** (`tv-show-columns.tsx`)
- Add columns: Health %, dominant Codec, active Issue count
- Review default column visibility

**Show detail**
- Add quality health summary card (% verified, % broken, action distribution)
- Add file statistics summary (total size, codec breakdown)

**Episode detail**
- Restructure file cards: quality+action first, then media info, then tests
- Consider tabbed file details (Info | Media | Tests | Notes)

**Seasons list**
- Add file count and total size in collapsed season header
- Add mini quality bar per season

**Dashboard**
- Review information density, merge overlapping sections
- Add "action required" callouts

---

### Global Search (🟡)

**AppBar** (`src/components/app-bar.tsx`)
- Add search icon button (before GitHub link on desktop, visible on mobile too)

**New component:** `GlobalSearchDialog` (Command palette)
- `Cmd+K` / `Ctrl+K` keyboard trigger
- Search input: "Search shows, episodes, files, issues..."
- Grouped results: TV Shows (poster+title+year), Episodes (show+SxxExx), Files (filename+quality), Issues (type+status+episode)
- Debounced 300ms, loading skeletons, empty state

**New API:** `GET /api/search?q=...` — cross-model grouped results

**Root layout** — mount GlobalSearchDialog globally, register keyboard shortcut

---

### Better Logo/App Icon (🟡)

**AppBar** — replace logo image reference

**PWA manifest** (`src/app/manifest.ts`) — update icons at all sizes (192, 512, maskable)

**Public assets** — replace `logo.png`, `apple-icon.png`, `favicon.ico`

**Login page** — update any logo references

---

### Comprehensive DataTable Filters (🟡)

**TV Shows toolbar** (`src/app/tv-shows/toolbar.tsx`)
- Add "Filters" button opening popover: Quality Status, Year range, Has TMDB (Y/N), Genres (multi-select), Network Status
- Active filter count badge on button
- "Clear all filters" button

**Issues page**
- Add filters: Issue Type (multi-select), Platform, Reporter (Plex mode), Date range
- Integrate with existing status filter chips

**Scans history table**
- Add filters: Scan Type, Status, Date range

**New shared component:** `FilterPopover` / `TableFilters` — reusable filter panel generated from column definitions

---

### Light Theme (🔵)

**globals.css** — complete all light theme token values (`.light` class at line ~63)

**Settings page** — new "Theme" card: Dark / Light / System toggle

**AppBar** — theme toggle button (Sun/Moon icon) between version and user menu

**Root layout** — `ThemeProvider` context managing class on `<html>`, persisted to localStorage

**New components:** `ThemeProvider`, `ThemeToggle`

---

### DataTable for All Tables (🔵)

**Scans history** (`src/app/scans/scan-history-table.tsx`) — convert to DataTable + `scan-history-columns.tsx`

**Settings — User Management** — convert to DataTable + `user-columns.tsx`

**Settings — Platforms** — convert to DataTable if manual table

**Episode detail — Playback tests** — convert per-file test list to mini DataTable

---

### Keyboard Shortcuts (⚪)

**New components:** `KeyboardShortcutProvider` (root), `KeyboardShortcutHelpDialog`

**AppBar** — keyboard/`?` icon button to open help dialog

**Global shortcuts:** `Cmd+K` search, `Cmd+/` help, `G→D` dashboard, `G→T` shows, `G→I` issues, `G→S` scans, `G→K` tasks

**Page shortcuts:** `N` new item, `F`/`/` focus search, `J/K` row navigation, `Enter` open row

---

### Persistent Filters (🔵)

**TV Shows page** — persist search, monitor filter, view mode, sort, column visibility to `localStorage`

**Issues page** — persist status filter, view mode, sort

**TMDB integration** — persist active filter tab

**New hook:** `usePersistedFilters(key, defaults)` — wraps useState with localStorage

**Settings page** — "Reset all saved filters" button

---

## Issue System

### Issue Comments/Threads (🟡)

**Issue Edit Dialog** (`src/components/issues/issue-edit-dialog.tsx`)
- Expand to `max-w-2xl`
- Add "Comments" section: chronological list (avatar, username, timestamp, text), "Add comment" textarea + submit
- Scrollable within `max-h-[300px]`

**Episode issues list** — comment count badge per issue

**Issues page** — comment count in card view + table column

**New model:** `IssueComment` in Prisma schema

**New API:** `GET/POST /api/issues/[id]/comments`

---

### Issue Deduplication (🟡)

**Issues page**
- "Grouped" view toggle (alongside cards/table): groups by episode
- Duplicate count badge per grouped issue
- "Merge" button on groups (admin)

**Issue Report Dialog**
- Pre-submit check for existing issues on same episode
- Warning: "X existing issues on this episode" with link
- "Report anyway" or "View existing" options

**Episode issues list** — "Similar reports" indicator, "Merge" button (admin)

---

### Issue Analytics on Dashboard (🟡)

**New dashboard section:** `issue-analytics.tsx`
- Stat cards: total issues, avg resolution time, issues this week, most-reported show
- Bar chart: issues by type
- Trend line: issues over time
- Pie chart: issues by status

**Dashboard server component** — add Prisma queries for issue analytics

**Issues Overview section** — "View analytics" link

---

### Transform Issues to Playback Tests (🟡)

**Issue Edit Dialog** — "Create Playback Test" button (admin, PLAYBACK type only), pre-populates test from issue data

**Episode issues list** — "Create Test" action per playback issue (admin)

**Issues page** — "Create Test" in table actions column and card view for PLAYBACK issues

---

### Issue Data Enhancement by Admin (🟡)

**Issue Edit Dialog** — make fields editable for admins:
- Type: re-classify via selector
- Platform, audio language, subtitle language: editable
- Description: editable textarea
- New "Admin Notes" field (separate from resolution)
- Track "enhanced by" user + timestamp

---

## Integrations

### Plex Database Sync (🟡)

**New page:** `/integrations/plex-db`
- Setup: DB path input, test connection
- Status: last sync time, items matched
- Actions: "Sync Now", "Re-sync All"
- Matched files table

**Integrations hub** — change Plex DB Sync from `comingSoon: true` to active

**Sidebar** — add "Plex DB" to integrations submenu

**Episode detail** — enhanced Plex section: rating, view count, last played, "Sync from Plex" button

---

### Plex Users Sync (🔵)

**Plex Auth page** — "Sync Users from Plex" button, confirmation dialog listing users to add/update, progress indicator

**Settings — User Management** — "Sync from Plex" button (if Plex configured)

---

### Sonarr/Radarr (🔵)

**New pages:** `/integrations/sonarr`, `/integrations/radarr`
- Config form (URL, API key, test), status card, show mapping table, sync controls

**Integrations hub** — activate Sonarr, add Radarr card

**Sidebar** — add to integrations submenu

**Show detail** — "View in Sonarr" external link

---

### Tautulli (🔵)

**New page:** `/integrations/tautulli`
- Config (URL, API key, test), status, import controls, history preview

**Integrations hub** — add Tautulli card

**Sidebar** — add to integrations submenu

**Episode detail** — "Playback History" section (who watched, when, direct play vs transcode, device)

**Show detail** — watch statistics summary

---

### Jellyfin (🔵)

**New page:** `/integrations/jellyfin`
- Config (URL, API key), user sync, status

**Integrations hub** — add Jellyfin card

**Sidebar** — add to integrations submenu

**Login page** — Jellyfin sign-in option alongside Plex

---

### Webhooks (⚪)

**New page:** `/integrations/webhooks`
- Management table: URL, events, status, last triggered, failure count
- "Add Webhook" dialog: URL, event type checkboxes, secret field
- Per-webhook: Edit, Test, Delete, Toggle
- Recent delivery log

**Integrations hub** — add Webhooks card

---

## Task System

### Dismissible Task Dialogs (🔵)

**TaskProgress component** — "You can safely close this" message, "Dismiss" button (hides without cancelling), "Task running in background" toast on dismiss

**TMDB integration** — dismiss/minimize on active task progress card

**Scans page** — dismissible progress card, "Running in background" message

---

### Task Persistence (🔵)

**Tasks page** — "Recent Tasks" loads from DB, add pagination/"Load more", date range filter, visual distinction live vs historical

**New model:** `Task` in Prisma schema

---

### Resume Interrupted Tasks (⚪)

**Tasks page** — "Interrupted" status badge, "Resume" button on interrupted cards, banner: "X tasks were interrupted. Resume them?"

---

### Automated Tasks (🔵)

**New section** in Tasks page (or `/tasks/schedules`):
- Schedule table: type, schedule, last/next run, status, actions
- "Add Schedule" dialog: task type select, schedule builder (hourly/daily/weekly/cron), enable toggle
- Per-schedule: Edit, Delete, Toggle, "Run Now"

**Settings** — "Task Scheduling" enable/disable toggle or link

---

## Notifications

### In-App Notifications (🔵)

**AppBar** — bell icon button with unread count badge

**New component:** `NotificationPopover`
- Scrollable notification list (icon, title, description, timestamp, read/unread)
- "Mark all as read", "View all" link

**New page (optional):** `/notifications` — full DataTable history

**New context:** `NotificationProvider` — polls `/api/notifications`, unread count

**Root layout** — wrap with NotificationProvider

---

### Push Notifications (🔵)

**Settings page** — "Notifications" card: enable toggle, permission request, preference checkboxes (Issues/Tasks/Scans/System), test button

**New:** `public/sw.js` service worker

---

### Media Request System (🔵)

**New page:** `/requests`
- Card/table view: title, requester, date, status (Pending/Approved/Denied/Fulfilled), notes
- Admin: Approve, Deny, Mark Fulfilled actions
- User: Edit, Delete (while pending)

**Sidebar** — "Requests" entry (MessageSquarePlus icon), all users, pending count badge

**New dialog:** `MediaRequestDialog` — TMDB search, select seasons/episodes, notes, submit

**Dashboard — Quick Actions** — "Request Media" for all users

**Dashboard** — "Pending Requests" card (admin) / "My Requests" card (users)

**New context:** `RequestProvider`

---

## Infrastructure

### Database Backup/Restore (🟡)

**Settings page** — new "Database" card:
- "Export Database" button (downloads SQLite)
- "Import Database" button (file upload)
- "Auto-backup" toggle with schedule
- "Last Backup" timestamp

**New dialog:** `DatabaseImportDialog` — upload, validate schema, confirm ("This will replace X shows, Y episodes..."), progress, result

---

### Activity/Audit Log (🔵)

**New page:** `/activity`
- DataTable: Timestamp, User (avatar), Action (badge), Entity type, Entity name (linked), Details
- Filters: User, Action type, Entity type, Date range
- Expandable rows for detail JSON

**Sidebar** — "Activity Log" entry (ScrollText icon), admin section

---

### API Key Authentication (🔵)

**Settings page** — new "API Keys" card:
- Key table: Name, Key prefix, Created, Last used, Status
- "Generate New Key" button
- Per-key: Revoke, Copy

**New dialog:** `ApiKeyCreateDialog` — name, expiry, scope checkboxes, one-time key display with copy + warning

**API Docs** — update Swagger config with API key auth option

---

## Localization

### Multi-Language (🔵)

**Settings page** — "Language" dropdown: English, French

**Root layout** — dynamic `<html lang="...">`

**All pages/components** — replace hardcoded strings with translation keys:
- Page titles, descriptions, breadcrumbs
- Button labels, dialog titles
- Empty state messages, tooltips
- Status label maps (`ISSUE_TYPE_LABELS`, `ISSUE_STATUS_LABELS`, etc.)
- Sidebar navigation labels

**New directory:** `src/lib/i18n/` — `en.json`, `fr.json`, `useTranslation()` hook

---

## Summary: New Pages

| Route | Description | Sidebar |
|-------|-------------|---------|
| `/statistics` | Library statistics & charts | Yes (all) |
| `/movies` | Movies list | Yes (all) |
| `/movies/[id]` | Movie detail | No |
| `/files` | File browser | Yes (admin) |
| `/files/duplicates` | Duplicate detection | No |
| `/playback-tests` | All playback tests | Yes (admin) |
| `/requests` | Media requests | Yes (all) |
| `/notifications` | Notification history | No |
| `/activity` | Audit log | Yes (admin) |
| `/integrations/plex-db` | Plex DB sync | Yes (submenu) |
| `/integrations/sonarr` | Sonarr | Yes (submenu) |
| `/integrations/radarr` | Radarr | Yes (submenu) |
| `/integrations/tautulli` | Tautulli | Yes (submenu) |
| `/integrations/jellyfin` | Jellyfin | Yes (submenu) |
| `/integrations/webhooks` | Webhooks | Yes (submenu) |
| `/tasks/schedules` | Scheduled tasks | No (tab) |

## Summary: New Contexts

| Context | Purpose |
|---------|---------|
| `ThemeProvider` | Dark/light/system theme |
| `NotificationProvider` | Notification polling + unread count |
| `RequestProvider` | Media request counts |

## Summary: New Shared Components

| Component | Used By |
|-----------|---------|
| `GlobalSearchDialog` | AppBar (Cmd+K) |
| `BulkActionBar` | TV Shows, Issues, Episodes |
| `SelectionCheckbox` | Card/table multi-select |
| `FilterPopover` | All DataTables |
| `ThemeToggle` | AppBar |
| `NotificationPopover` | AppBar |
| `KeyboardShortcutHelpDialog` | AppBar |
| `MediaRequestDialog` | Requests page, Quick Actions |
| `DatabaseImportDialog` | Settings |
| `ApiKeyCreateDialog` | Settings |

## Most-Modified Existing Files

| File | Reason |
|------|--------|
| `src/components/app-sidebar.tsx` | ~10 new nav entries |
| `src/components/app-bar.tsx` | Search, notifications, theme toggle, shortcuts |
| `src/app/layout.tsx` | 3 new context providers, global components |
| `src/app/dashboard/dashboard-client.tsx` | New sections for movies, issue analytics, requests |
| `src/app/settings/settings-form.tsx` | Theme, DB backup, API keys, notifications, language, reset filters |
| `src/components/issues/issue-edit-dialog.tsx` | Comments, enhancement, create test, admin editing |
| `src/app/tv-shows/[id]/seasons-list.tsx` | Bulk select, analyze button, quality bars |
| `src/app/integrations/page.tsx` | Activate coming-soon items, add new cards |
| `prisma/schema.prisma` | Movie, IssueComment, Task, Notification, Request, AuditLog, ApiKey, Webhook models |
