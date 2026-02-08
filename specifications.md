# Curatr App - Specifications

This document tracks **unimplemented features** and future enhancements. For implemented features, see the README.

---

## Pending Features

### Movies Support
Add movie tracking alongside TV shows:
- `Movie` model (title, year, tmdbId, imdbId, plexId, status, notes)
- `MovieFile` model (same structure as EpisodeFile)
- `/movies` page with list/detail views
- Scanner support for movie directories (`/Movies/Movie Name (Year)/`)

### Dashboard Page (/)
Replace placeholder with actual stats:
- Total movies/shows/files tracked
- Files by status (pie chart or bars)
- Quality distribution (resolution, codec, HDR breakdown)
- Recent activity (last scan, recently added files)
- Quick actions (Scan, View files needing attention)

### Files Page (/files)
Flat view of ALL files (MovieFile + EpisodeFile) for power users:
- Filter by type (Movie/Episode), status, action, quality
- Search by filename or title
- Useful for: "Show all BAD files across entire library"

### Plex Database Sync
Read-only sync with Plex SQLite database:
- Match files by filepath to Plex records
- Pull metadata (titles, external IDs, quality info)
- Enrich Movie/TVShow entities with Plex data
- Mark `plexMatched = true` on synced files

### Advanced Filtering
- Save filter presets (e.g., "Files Needing Work")
- Filter persistence in URL query params
- Resolution/codec/HDR dropdowns

### Bulk Operations
- Change status/action for multiple items
- Toggle Arr status in bulk
- Export to CSV

---

## Future Enhancements (Phase 2+)

### Sonarr/Radarr Integration
- Connect via API
- Pull monitored status
- Trigger search for "Redownload" files
- Sync quality profiles

### Advanced Scanning
- Scheduled automatic scans (daily/weekly)
- Filesystem watching (real-time updates)
- Incremental scans (only changed files)

### Enhanced Reporting
- Quality trends over time
- Disk space by quality tier
- Library health score

### Integrations
- Notifications (Discord, Telegram)
