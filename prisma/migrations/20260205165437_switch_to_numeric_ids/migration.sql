/*
  Warnings:

  - The primary key for the `CompatibilityTest` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `episodeFileId` on the `CompatibilityTest` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `id` on the `CompatibilityTest` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Episode` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Episode` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `seasonId` on the `Episode` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `EpisodeFile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `episodeId` on the `EpisodeFile` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `id` on the `EpisodeFile` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `ScanHistory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `ScanHistory` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Season` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Season` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `tvShowId` on the `Season` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `TVShow` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `TVShow` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CompatibilityTest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "episodeFileId" INTEGER,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "testedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompatibilityTest_episodeFileId_fkey" FOREIGN KEY ("episodeFileId") REFERENCES "EpisodeFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CompatibilityTest" ("episodeFileId", "id", "notes", "platform", "status", "testedAt") SELECT "episodeFileId", "id", "notes", "platform", "status", "testedAt" FROM "CompatibilityTest";
DROP TABLE "CompatibilityTest";
ALTER TABLE "new_CompatibilityTest" RENAME TO "CompatibilityTest";
CREATE INDEX "CompatibilityTest_episodeFileId_idx" ON "CompatibilityTest"("episodeFileId");
CREATE TABLE "new_Episode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seasonId" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TO_CHECK',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("createdAt", "episodeNumber", "id", "notes", "seasonId", "status", "title", "updatedAt") SELECT "createdAt", "episodeNumber", "id", "notes", "seasonId", "status", "title", "updatedAt" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE INDEX "Episode_seasonId_idx" ON "Episode"("seasonId");
CREATE UNIQUE INDEX "Episode_seasonId_episodeNumber_key" ON "Episode"("seasonId", "episodeNumber");
CREATE TABLE "new_EpisodeFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "episodeId" INTEGER NOT NULL,
    "filepath" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "dateModified" DATETIME NOT NULL,
    "fileExists" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'TO_CHECK',
    "action" TEXT NOT NULL DEFAULT 'NOTHING',
    "arrStatus" TEXT NOT NULL DEFAULT 'MONITORED',
    "notes" TEXT,
    "codec" TEXT,
    "resolution" TEXT,
    "bitrate" INTEGER,
    "container" TEXT,
    "audioFormat" TEXT,
    "hdrType" TEXT,
    "duration" INTEGER,
    "metadataSource" TEXT,
    "plexMatched" BOOLEAN NOT NULL DEFAULT false,
    "audioLanguages" TEXT,
    "subtitleLanguages" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EpisodeFile_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EpisodeFile" ("action", "arrStatus", "audioFormat", "audioLanguages", "bitrate", "codec", "container", "createdAt", "dateModified", "duration", "episodeId", "fileExists", "fileSize", "filename", "filepath", "hdrType", "id", "metadataSource", "notes", "plexMatched", "resolution", "status", "subtitleLanguages", "updatedAt") SELECT "action", "arrStatus", "audioFormat", "audioLanguages", "bitrate", "codec", "container", "createdAt", "dateModified", "duration", "episodeId", "fileExists", "fileSize", "filename", "filepath", "hdrType", "id", "metadataSource", "notes", "plexMatched", "resolution", "status", "subtitleLanguages", "updatedAt" FROM "EpisodeFile";
DROP TABLE "EpisodeFile";
ALTER TABLE "new_EpisodeFile" RENAME TO "EpisodeFile";
CREATE UNIQUE INDEX "EpisodeFile_filepath_key" ON "EpisodeFile"("filepath");
CREATE INDEX "EpisodeFile_episodeId_idx" ON "EpisodeFile"("episodeId");
CREATE INDEX "EpisodeFile_status_idx" ON "EpisodeFile"("status");
CREATE INDEX "EpisodeFile_action_idx" ON "EpisodeFile"("action");
CREATE TABLE "new_ScanHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "scanType" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "filesScanned" INTEGER NOT NULL DEFAULT 0,
    "filesAdded" INTEGER NOT NULL DEFAULT 0,
    "filesUpdated" INTEGER NOT NULL DEFAULT 0,
    "filesDeleted" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "status" TEXT NOT NULL
);
INSERT INTO "new_ScanHistory" ("completedAt", "errors", "filesAdded", "filesDeleted", "filesScanned", "filesUpdated", "id", "scanType", "startedAt", "status") SELECT "completedAt", "errors", "filesAdded", "filesDeleted", "filesScanned", "filesUpdated", "id", "scanType", "startedAt", "status" FROM "ScanHistory";
DROP TABLE "ScanHistory";
ALTER TABLE "new_ScanHistory" RENAME TO "ScanHistory";
CREATE TABLE "new_Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tvShowId" INTEGER NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TO_CHECK',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Season_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Season" ("createdAt", "id", "notes", "seasonNumber", "status", "tvShowId", "updatedAt") SELECT "createdAt", "id", "notes", "seasonNumber", "status", "tvShowId", "updatedAt" FROM "Season";
DROP TABLE "Season";
ALTER TABLE "new_Season" RENAME TO "Season";
CREATE INDEX "Season_tvShowId_idx" ON "Season"("tvShowId");
CREATE UNIQUE INDEX "Season_tvShowId_seasonNumber_key" ON "Season"("tvShowId", "seasonNumber");
CREATE TABLE "new_TVShow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "tvdbId" TEXT,
    "tmdbId" TEXT,
    "plexId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TO_CHECK',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_TVShow" ("createdAt", "id", "notes", "plexId", "status", "title", "tmdbId", "tvdbId", "updatedAt", "year") SELECT "createdAt", "id", "notes", "plexId", "status", "title", "tmdbId", "tvdbId", "updatedAt", "year" FROM "TVShow";
DROP TABLE "TVShow";
ALTER TABLE "new_TVShow" RENAME TO "TVShow";
CREATE UNIQUE INDEX "TVShow_tvdbId_key" ON "TVShow"("tvdbId");
CREATE UNIQUE INDEX "TVShow_tmdbId_key" ON "TVShow"("tmdbId");
CREATE UNIQUE INDEX "TVShow_plexId_key" ON "TVShow"("plexId");
CREATE INDEX "TVShow_title_idx" ON "TVShow"("title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
