
Media Quality Tracker - Technical Specification
Overview
A Next.js-based web application for tracking media file quality, playback compatibility, and maintenance status across a Plex media library. Deployed as a Docker container on Synology NAS with direct filesystem and Plex database access.
Tech Stack

Framework: Next.js 14+ (App Router, TypeScript) 
Database: SQLite (with migration path to Postgres) 
ORM: Prisma 
UI Components: shadcn/ui (built on Radix UI + Tailwind) 
Media Analysis: ffprobe (from ffmpeg) for file metadata extraction 
Deployment: Docker container in Portainer 
Architecture
Docker Container:
├── Next.js App (port 3000)
├── SQLite Database (app data)
├── Mounted Volumes:
│   ├── /media (read-only: Plex media folders)
│   └── /plex-db (read-only: Plex SQLite database)
└── ffprobe binary (for media analysis)


Data Model (Revised)
Core Entities
Movie
Represents a movie as an entity (not the file itself).
model Movie {
  id              String    @id @default(cuid())
  
  // Movie Identity
  title           String
  year            Int?
  tmdbId          String?   @unique  // If we pull from Plex
  imdbId          String?   @unique
  plexId          String?   @unique  // Plex's metadata_item_id
  
  // User Management
  status          Status    @default(TO_CHECK)
  notes           String?   @db.Text
  
  // Relations
  files           MovieFile[]
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([title])
}


TVShow
Represents a TV series as an entity.
model TVShow {
  id              String    @id @default(cuid())
  
  // Series Identity
  title           String
  year            Int?
  tvdbId          String?   @unique
  tmdbId          String?   @unique
  plexId          String?   @unique
  
  // User Management
  status          Status    @default(TO_CHECK)
  notes           String?   @db.Text
  
  // Relations
  seasons         Season[]
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([title])
}


Season
Represents a season within a TV show.
model Season {
  id              String    @id @default(cuid())
  
  // Season Identity
  tvShowId        String
  tvShow          TVShow    @relation(fields: [tvShowId], references: [id], onDelete: Cascade)
  seasonNumber    Int
  
  // User Management
  status          Status    @default(TO_CHECK)
  notes           String?   @db.Text
  
  // Relations
  episodes        Episode[]
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([tvShowId, seasonNumber])
  @@index([tvShowId])
}


Episode
Represents an episode within a season.
model Episode {
  id              String    @id @default(cuid())
  
  // Episode Identity
  seasonId        String
  season          Season    @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  episodeNumber   Int
  title           String?
  
  // User Management
  status          Status    @default(TO_CHECK)
  notes           String?   @db.Text
  
  // Relations
  files           EpisodeFile[]
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([seasonId, episodeNumber])
  @@index([seasonId])
}


File Entities
MovieFile
Represents an actual file on disk for a movie.
model MovieFile {
  id                String   @id @default(cuid())
  
  // Relation to Movie
  movieId           String
  movie             Movie    @relation(fields: [movieId], references: [id], onDelete: Cascade)
  
  // File Information
  filepath          String   @unique
  filename          String
  fileSize          BigInt
  dateModified      DateTime
  fileExists        Boolean  @default(true)
  
  // User-managed Fields
  status            FileStatus @default(TO_CHECK)
  action            Action     @default(NOTHING)
  arrStatus         ArrStatus  @default(MONITORED)
  notes             String?    @db.Text
  
  // Quality Information (from ffprobe + Plex)
  codec             String?
  resolution        String?  // e.g., "1920x1080"
  bitrate           Int?     // kbps
  container         String?  // mkv, mp4, avi
  audioFormat       String?  // e.g., "AAC 5.1", "DTS-HD MA 7.1"
  hdrType           String?  // SDR, HDR10, Dolby Vision, HDR10+
  duration          Int?     // seconds
  
  // Source tracking
  metadataSource    String?  // "plex", "ffprobe", "manual"
  plexMatched       Boolean  @default(false)
  
  // Languages
  audioLanguages    String?  // JSON array or comma-separated
  subtitleLanguages String?  // JSON array or comma-separated
  
  // Playback Compatibility Tests
  compatibilityTests CompatibilityTest[]
  
  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([movieId])
  @@index([status])
  @@index([action])
}


EpisodeFile
Represents an actual file on disk for an episode.
model EpisodeFile {
  id                String   @id @default(cuid())
  
  // Relation to Episode
  episodeId         String
  episode           Episode  @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  
  // File Information
  filepath          String   @unique
  filename          String
  fileSize          BigInt
  dateModified      DateTime
  fileExists        Boolean  @default(true)
  
  // User-managed Fields
  status            FileStatus @default(TO_CHECK)
  action            Action     @default(NOTHING)
  arrStatus         ArrStatus  @default(MONITORED)
  notes             String?    @db.Text
  
  // Quality Information (from ffprobe + Plex)
  codec             String?
  resolution        String?
  bitrate           Int?
  container         String?
  audioFormat       String?
  hdrType           String?
  duration          Int?
  
  // Source tracking
  metadataSource    String?
  plexMatched       Boolean  @default(false)
  
  // Languages
  audioLanguages    String?
  subtitleLanguages String?
  
  // Playback Compatibility Tests
  compatibilityTests CompatibilityTest[]
  
  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@index([episodeId])
  @@index([status])
  @@index([action])
}


Supporting Entities
CompatibilityTest
Tracks playback testing results for files.
model CompatibilityTest {
  id            String   @id @default(cuid())
  
  // Relations (polymorphic - either movie or episode file)
  movieFileId   String?
  movieFile     MovieFile? @relation(fields: [movieFileId], references: [id], onDelete: Cascade)
  episodeFileId String?
  episodeFile   EpisodeFile? @relation(fields: [episodeFileId], references: [id], onDelete: Cascade)
  
  // Test Information
  platform      String      // e.g., "TV Direct", "Mobile", "Web", "Roku", "Apple TV"
  status        TestStatus
  notes         String?
  testedAt      DateTime    @default(now())
  
  @@index([movieFileId])
  @@index([episodeFileId])
}

enum TestStatus {
  WORKS
  FAILS
  NOT_TESTED
  NEEDS_TRANSCODING
}


ScanHistory
Tracks filesystem scan operations.
model ScanHistory {
  id            String   @id @default(cuid())
  scanType      String   // "filesystem", "plex_db", "full"
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  filesScanned  Int      @default(0)
  filesAdded    Int      @default(0)
  filesUpdated  Int      @default(0)
  filesDeleted  Int      @default(0)
  errors        String?  @db.Text // JSON array of errors
  status        ScanStatus
}

enum ScanStatus {
  RUNNING
  COMPLETED
  FAILED
}


Enums
enum Status {
  TO_CHECK
  BAD
  GOOD
  DELETED
}

enum FileStatus {
  TO_CHECK
  BAD
  GOOD
  DELETED
}

enum Action {
  NOTHING
  REDOWNLOAD
  CONVERT
  ORGANIZE
  REPAIR
}

enum ArrStatus {
  MONITORED
  UNMONITORED
}


Data Model Rationale
Separation of Concerns
Media Entities (Movie, TVShow, Season, Episode):

Represent the conceptual media item 
Independent of physical files 
Can have metadata from Plex/TMDB 
Tracks overall status/notes at media level 
File Entities (MovieFile, EpisodeFile):

Represent actual files on disk 
Multiple files can exist for same media (different qualities, editions) 
Tracks file-specific quality, compatibility, and actions 
Each file independently tracked and managed 
Benefits of This Structure

Multiple Files Per Media: You can have multiple versions of same movie (4K, 1080p, HDR, etc.) and track each separately  
Hierarchy Navigation: View all movies → drill into specific movie → see all file versions 
View all shows → drill into show → view seasons → view episodes → see file(s) 
Flexible Status Tracking: Movie-level: "This movie overall is bad" 
File-level: "The 1080p version is bad, but 4K version is good" 
Clean Deletions: When file is deleted from disk, mark fileExists = false but keep the media entity  
Future-proof: Easy to add features like: Linking to external IDs (TMDB, IMDB, TVDB) 
Multiple editions of same movie 
Special episodes or bonus content 
User Workflows
Initial Library Population
Scanner Process:

Scan filesystem recursively 
Parse filename to extract: Movie: title, year 
TV: series name, season, episode numbers 
Check if Movie/TVShow entity exists (by title matching or Plex ID) If not, create Movie/TVShow → Season → Episode hierarchy 
Create MovieFile or EpisodeFile record 
Run ffprobe to extract quality metadata 
Optionally sync with Plex DB to enrich metadata 
Working Through Files
User opens app and wants to check a specific movie:

Navigate to Movies list 
Search/filter for movie title 
Click movie → see detail view 
View shows all file versions for this movie 
Click specific file → edit quality status, add compatibility tests, notes 
User wants to work through all bad files:

Navigate to Files view (or Movies view) 
Filter by Status = "Bad" 
Bulk select files 
Change Action to "Redownload" 
Optionally unmonitor in Arr apps 
User wants to review a TV show season:

Navigate to TV Shows 
Find show, expand seasons 
Click season → see all episodes 
For each episode, see file status at a glance 
Bulk mark entire season as "Good" if all files check out 
UI/UX Specifications
Navigation Structure
├── Dashboard (/)
├── Movies (/movies)
│   └── Movie Detail (/movies/[id])
│       └── File Detail (/movies/[id]/files/[fileId])
├── TV Shows (/tv-shows)
│   ├── Show Detail (/tv-shows/[id])
│   │   └── Season Detail (/tv-shows/[id]/seasons/[seasonId])
│   │       └── Episode Detail (/tv-shows/[id]/seasons/[seasonId]/episodes/[episodeId])
│   │           └── File Detail (same pattern)
├── Files (/files)
│   ├── All Files (flat list of all MovieFile + EpisodeFile)
│   └── File Detail (/files/[fileId])
└── Scans (/scans)
    └── Scan History


Dashboard Page (/)
Purpose: Overview and quick actions
Sections:

Stats Overview: Total movies tracked 
Total TV shows tracked 
Total files tracked 
Files by status (pie chart or bars) 
Files needing action (count) 
Quality Distribution: Resolution breakdown 
Codec distribution 
HDR vs SDR count 
Recent Activity: Last scan timestamp and results 
Recently added files (last 10) 
Recently modified files 
Quick Actions: Button: "Scan Filesystem" 
Button: "Sync with Plex" 
Link: "View Files Needing Attention" 
Movies List Page (/movies)
Purpose: Browse and manage movie library
Layout: Data table
Columns:

Checkbox (for bulk selection) 
Title (sortable, searchable) 
Year 
Status badge 
File Count (e.g., "2 files" if multiple versions) 
Notes preview (truncated) 
Actions (View, Edit) 
Filters:

Status (multi-select dropdown) 
Search by title 
Year range 
Has multiple files (toggle) 
Bulk Actions:

Change status for selected movies 
Export selected to CSV 
Click behavior:

Click row → navigate to Movie Detail page 
Movie Detail Page (/movies/[id])
Purpose: View/edit movie and manage its files
Layout:
Section 1: Movie Information

Title (editable) 
Year (editable) 
Overall Status (dropdown) 
Notes (textarea) 
Plex/TMDB/IMDB IDs (if available) 
Section 2: Files

List of all MovieFile records for this movie 
Table with columns: Filename 
File Status badge 
Action badge 
Quality summary (resolution, codec) 
File size 
Arr Status toggle 
Compatibility tests summary (icons) 
Actions (View Details, Edit, Delete) 
Button: "Add File Manually" 
Section 3: Activity

Created date 
Last updated date 
Last scan that touched this movie 
File Detail Page (/movies/[id]/files/[fileId] or /files/[fileId])
Purpose: Detailed file management and testing
Layout:
Section 1: File Information (read-only or partially editable)

Full filepath 
Filename 
File size 
Date modified 
Date added to tracker 
File exists on disk (indicator) 
Section 2: Quality Details (read-only from metadata sources)

Resolution 
Codec 
Bitrate 
Container format 
Audio format 
HDR type 
Duration 
Audio languages (list) 
Subtitle languages (list) 
Metadata source indicator ("From Plex" / "From ffprobe" / "Manual") 
Section 3: User Management (editable)

Status dropdown 
Action dropdown 
Arr Status toggle 
Notes textarea 
Section 4: Playback Compatibility Tests

Table of existing tests: Platform 
Status badge (Works/Fails/Not Tested/Needs Transcoding) 
Notes 
Test date 
Actions (Edit, Delete) 
Button: "Add New Test" 
Modal/form for adding test: Platform input (dropdown or text) 
Status dropdown 
Notes textarea 
Section 5: Actions

Button: "Re-scan File" (re-run ffprobe) 
Button: "Open in Plex" (if plexMatched) 
Button: "Delete Record" (soft delete) 
TV Shows List Page (/tv-shows)
Purpose: Browse TV show library
Layout: Hierarchical data table with expandable rows
Default View (Collapsed):

Checkbox 
Show Title (sortable, searchable) 
Year 
Status badge 
Season count 
Total episodes 
Total files 
Actions (View, Expand) 
Expanded View (per show):

Shows list of seasons beneath show row 
Season columns: Season number 
Status badge 
Episode count 
Files tracked 
Actions (View Season) 
Filters:

Status 
Search by show title 
Year range 
Click behavior:

Click show title → navigate to Show Detail page 
Click season → navigate to Season Detail page 
Show Detail Page (/tv-shows/[id])
Purpose: Manage show and navigate seasons/episodes
Layout:
Section 1: Show Information

Title 
Year 
Overall Status 
Notes 
External IDs 
Section 2: Seasons

List/grid of seasons 
Each season card shows: Season number 
Status badge 
Episode count with status breakdown ("10 good, 2 bad, 3 to check") 
Click to view season detail 
Section 3: Quick Stats

Total episodes 
Total files 
Status distribution across all episodes 
Season Detail Page (/tv-shows/[id]/seasons/[seasonId])
Purpose: Manage all episodes in a season
Layout:
Section 1: Season Header

Show title breadcrumb 
Season number 
Overall status 
Notes 
Section 2: Episodes Table

Columns: Checkbox 
Episode number 
Episode title 
Status badge 
File status (if file exists) 
Quality summary (if file exists) 
Actions (View Episode) 
Bulk Actions:

Mark selected episodes as "Good" 
Change status for selected 
Export selected 
Episode Detail Page (/tv-shows/[id]/seasons/[seasonId]/episodes/[episodeId])
Purpose: Manage individual episode and its file(s)
Layout: Similar to Movie Detail page
Section 1: Episode Information

Show/Season breadcrumb 
Episode number and title 
Status 
Notes 
Section 2: Files

List of EpisodeFile records (usually 1, but could have multiple) 
Same file table as Movie Detail 
Files Page (/files)
Purpose: Flat view of ALL files (both MovieFile and EpisodeFile) for power users
Layout: Data table
Columns:

Checkbox 
Type badge (Movie/Episode) 
Title (movie title or show + episode) 
Filename 
Status badge 
Action badge 
Quality summary 
File size 
Arr Status 
Actions 
Filters:

Type (Movie/Episode) 
Status 
Action 
Arr Status 
Resolution 
Codec 
Search by filename or title 
Use case: When you want to see all "Bad" files across entire library regardless of movie/show
Scans Page (/scans)
Purpose: View scan history and trigger new scans
Layout:
Section 1: Scan Controls

Button: "Scan Filesystem" 
Button: "Sync with Plex Database" 
Button: "Full Scan" (both) 
Current scan progress (if running) 
Section 2: Scan History Table

Columns: Scan type 
Started at 
Duration 
Status 
Files scanned/added/updated/deleted 
Errors (expandable) 
Actions (View Details) 
Feature Specifications
File Scanner Service
Inputs:

Media directories to scan (configured in env) 
Scan type: "filesystem", "plex_db", "full" 
Filesystem Scan Process:

Discovery Phase: Recursively walk configured media directories 
Identify video files by extension (mkv, mp4, avi, m4v, etc.) 
Parse directory structure to determine type: /Movies/Movie Name (Year)/ → Movie 
/TV Shows/Show Name/Season XX/ → TV Episode     
Filename Parsing: Movies: Extract title and year from folder/filename 
TV: Extract series name, season number, episode number 
Handle common naming patterns (Plex-style, scene releases) 
Entity Creation/Matching: Check if Movie/TVShow entity exists (by title matching) 
If not: Create Movie or TVShow → Season → Episode hierarchy 
Create or update MovieFile/EpisodeFile record 
Metadata Extraction (ffprobe): Run ffprobe on file 
Extract: Video stream: codec, resolution, bitrate, HDR metadata 
Audio streams: codec, channels, language 
Subtitle tracks: language 
Container format 
Duration 
Store as JSON, parse into database fields 
Deletion Detection: Compare database records with filesystem 
Files in DB but not on disk: mark fileExists = false, update status to DELETED   
Scan History: Create ScanHistory record 
Update counts (added/updated/deleted) 
Log any errors encountered 
Plex Database Sync Process:

Connect to Plex DB: Read-only connection to Plex SQLite database 
Query media_parts for all movie/episode file paths   
Match Files: For each Plex file path, find matching MovieFile/EpisodeFile by filepath 
If match found: Query media_items for quality metadata 
Query metadata_items for title, year, TMDB/IMDB IDs 
Update file record with Plex data 
Mark plexMatched = true 
Set metadataSource = "plex" for fields from Plex     
Entity Enrichment: Update Movie/TVShow entities with Plex metadata (titles, IDs) 
Create hierarchy if missing (some files might be in Plex but not found in filesystem scan) 
Error Handling:

File permission errors → log and continue 
ffprobe failures → log, mark metadata as incomplete 
Plex DB locked → retry or skip, warn user 
Corrupted files → log and mark for review 
Performance Considerations:

Process files in batches (100-500 at a time) 
Parallel ffprobe execution (max 4-8 concurrent) 
Progress reporting via WebSocket or polling endpoint 
Ability to cancel in-progress scan 
Filtering System
Filter Types:
Status Filter (multi-select):

TO_CHECK 
BAD 
GOOD 
DELETED 
Action Filter (multi-select):

NOTHING 
REDOWNLOAD 
CONVERT 
ORGANIZE 
REPAIR 
Quality Filters:

Resolution (dropdown: 4K, 1080p, 720p, 480p, Other) 
Codec (dropdown: x265, x264, AV1, etc.) 
HDR Type (dropdown: SDR, HDR10, Dolby Vision, etc.) 
Container (dropdown: MKV, MP4, AVI, etc.) 
Other Filters:

Arr Status (toggle: Monitored/Unmonitored) - Link to its page on the respective arr ?
File Exists (toggle: on disk / deleted) 
Has Compatibility Tests (toggle) 
Plex Matched (toggle) 
Search (text input: title, filename) 
Filter Persistence:

Save filter state in URL query params 
Allow saving filter presets (e.g., "Files Needing Work") 
Bulk Operations
Available on:

Movies list (operates on Movie entities) 
Files list (operates on File entities) 
TV Shows episodes list (operates on Episode entities) 
Operations:
Change Status:

Select multiple items 
Dropdown to choose new status 
Confirm → updates all selected 
Change Action:

Select multiple items 
Dropdown to choose new action 
Confirm → updates all selected 
Toggle Arr Status:

Select multiple items 
Toggle monitored/unmonitored 
Confirm → updates all selected 
Delete Records:

Select multiple items 
Confirm deletion 
Soft delete (mark as deleted, don't remove from DB) 
Export to CSV:

Select items (or current filtered view) 
Generate CSV with all fields 
Download file 
Playback Compatibility Testing
Test Platforms (suggested defaults):

TV Direct Connection 
TV via Plex 
Mobile App (iOS) 
Mobile App (Android) 
Web Browser (Chrome) 
Web Browser (Safari) 
Roku ??
Apple TV 
Fire TV 
Smart TV App 
Android TV ?
Google TV ?
Custom (user-defined) 
Test Statuses:

WORKS - Plays without issues 
FAILS - Does not play or major issues 
NEEDS_TRANSCODING - Plays but requires transcoding 
NOT_TESTED - Not yet tested on this platform 
Workflow:

User opens file detail page 
Clicks "Add Compatibility Test" 
Modal opens with form: Platform (dropdown with suggestions + custom input) 
Status (dropdown) 
Notes (textarea for details like "audio out of sync") 
Save → adds test to file 
Tests displayed as badges/table on file detail page 
Bulk Testing:

Option to copy tests from one file to another 
"Mark all files in this movie as working on TV" feature 
Non-Functional Requirements
Performance Targets

Page load time: < 2 seconds 
Table rendering: 500 rows in < 1 second 
Filtering/sorting: < 500ms 
File scan: 1000 files in < 5 minutes (filesystem) 
ffprobe analysis: < 2 seconds per file 
Bulk operations: 100 items in < 3 seconds 
Scalability

Support up to 10,000 movie files 
Support up to 50,000 TV episode files 
Database size: < 500MB for typical library 
Reliability

Read-only access to Plex database (never write) 
Read-only access to media files (never modify) 
Graceful handling of missing files 
Automatic reconnection to Plex DB if locked 
Transaction rollback on scan errors 
Security

No authentication in Phase 1 (rely on Authelia) 
Input sanitization on all user-editable fields 
Path traversal prevention on file operations 
SQL injection prevention (via Prisma ORM) 
XSS prevention (via React/Next.js) 
Usability

Responsive design (desktop, tablet, mobile) 
Keyboard shortcuts for common actions 
Undo capability for bulk operations 
Clear error messages 
Loading indicators for long operations 
Toast notifications for success/error 
Future Enhancements (Phase 2+)
Sonarr/Radarr Integration

Connect via API 
Pull monitored status directly 
Trigger search for files marked "Redownload" 
Sync quality profiles 
Advanced Scanning

Scheduled automatic scans (daily/weekly) 
Filesystem watching (real-time updates) 
Incremental scans (only changed files) 
Parallel scanning of multiple libraries 
Plex User Authentication

OAuth with Plex 
Users can report issues on files 
Admin can review user reports 
User-specific notes/tests 
Enhanced Reporting

Quality trends over time 
Disk space by quality tier 
Most problematic files 
Library health score 
File Operations

Direct transcode queue 
Automatic quality upgrades 
Duplicate detection 
Sample/preview clip generation 
Integrations

Tautulli integration (viewing stats) 
Overseerr/Jellyseerr (request tracking) 
Notifications (Discord, Telegram, Email) 
