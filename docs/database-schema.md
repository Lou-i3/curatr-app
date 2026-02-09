# Database Schema

## Models

| Model | Key Fields | Description |
|-------|------------|-------------|
| `TVShow` | `title`, `year`, `folderName`, `monitorStatus`, TMDB fields | TV series with monitoring intent |
| `Season` | `seasonNumber`, `name`, `monitorStatus`, TMDB fields | Season within a show |
| `Episode` | `episodeNumber`, `title`, `monitorStatus`, TMDB fields | Episode within a season |
| `EpisodeFile` | `filepath`, `quality`, `action`, codec/resolution fields | Media file with quality state |
| `Platform` | `name`, `isRequired`, `sortOrder` | Playback test platforms |
| `PlaybackTest` | `platformId`, `status`, `testedAt`, `notes` | Playback test results per file |
| `MediaTrack` | `trackType`, `codec`, `language`, `channels` | Per-track media info from FFprobe |
| `ScanHistory` | `scanType`, `status`, file counts | Scan operation logs |
| `Settings` | `dateFormat`, `maxParallelTasks` | Application settings |
| `User` | `plexId`, `username`, `role`, `isActive` | User accounts (Plex or local admin) |
| `Session` | `userId`, `expiresAt` | Login sessions (cookie-backed) |
| `Issue` | `episodeId`, `userId`, `type`, `status`, `description` | Reported quality issues |

## Enums

```prisma
enum MonitorStatus { WANTED, UNWANTED }
enum FileQuality { UNVERIFIED, VERIFIED, OK, BROKEN }
enum FileAction { NOTHING, REDOWNLOAD, CONVERT, ORGANIZE, REPAIR }
enum PlaybackStatus { PASS, PARTIAL, FAIL }
enum UserRole { ADMIN, USER }
enum IssueType { PLAYBACK, QUALITY, AUDIO, SUBTITLE, CONTENT, OTHER }
enum IssueStatus { OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED }
```

The full schema is defined in `prisma/schema.prisma`.
