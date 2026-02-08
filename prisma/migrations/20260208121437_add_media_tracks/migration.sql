-- AlterTable
ALTER TABLE "EpisodeFile" ADD COLUMN "mediaInfoError" TEXT;
ALTER TABLE "EpisodeFile" ADD COLUMN "mediaInfoExtractedAt" DATETIME;

-- CreateTable
CREATE TABLE "MediaTrack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "episodeFileId" INTEGER NOT NULL,
    "trackType" TEXT NOT NULL,
    "trackIndex" INTEGER NOT NULL,
    "codec" TEXT,
    "codecLong" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bitDepth" INTEGER,
    "frameRate" REAL,
    "hdrType" TEXT,
    "profile" TEXT,
    "channels" INTEGER,
    "channelLayout" TEXT,
    "sampleRate" INTEGER,
    "language" TEXT,
    "title" TEXT,
    "bitrate" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isForced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaTrack_episodeFileId_fkey" FOREIGN KEY ("episodeFileId") REFERENCES "EpisodeFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MediaTrack_episodeFileId_idx" ON "MediaTrack"("episodeFileId");

-- CreateIndex
CREATE INDEX "MediaTrack_trackType_idx" ON "MediaTrack"("trackType");
