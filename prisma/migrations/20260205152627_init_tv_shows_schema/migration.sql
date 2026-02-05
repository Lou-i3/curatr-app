-- CreateTable
CREATE TABLE "TVShow" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tvShowId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TO_CHECK',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Season_tvShowId_fkey" FOREIGN KEY ("tvShowId") REFERENCES "TVShow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TO_CHECK',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EpisodeFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "CompatibilityTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeFileId" TEXT,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "testedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompatibilityTest_episodeFileId_fkey" FOREIGN KEY ("episodeFileId") REFERENCES "EpisodeFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateIndex
CREATE UNIQUE INDEX "TVShow_tvdbId_key" ON "TVShow"("tvdbId");

-- CreateIndex
CREATE UNIQUE INDEX "TVShow_tmdbId_key" ON "TVShow"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "TVShow_plexId_key" ON "TVShow"("plexId");

-- CreateIndex
CREATE INDEX "TVShow_title_idx" ON "TVShow"("title");

-- CreateIndex
CREATE INDEX "Season_tvShowId_idx" ON "Season"("tvShowId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_tvShowId_seasonNumber_key" ON "Season"("tvShowId", "seasonNumber");

-- CreateIndex
CREATE INDEX "Episode_seasonId_idx" ON "Episode"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_seasonId_episodeNumber_key" ON "Episode"("seasonId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeFile_filepath_key" ON "EpisodeFile"("filepath");

-- CreateIndex
CREATE INDEX "EpisodeFile_episodeId_idx" ON "EpisodeFile"("episodeId");

-- CreateIndex
CREATE INDEX "EpisodeFile_status_idx" ON "EpisodeFile"("status");

-- CreateIndex
CREATE INDEX "EpisodeFile_action_idx" ON "EpisodeFile"("action");

-- CreateIndex
CREATE INDEX "CompatibilityTest_episodeFileId_idx" ON "CompatibilityTest"("episodeFileId");
