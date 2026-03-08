/*
  Warnings:

  - You are about to drop the column `episodeId` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `resolution` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedAt` on the `Issue` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedById` on the `Issue` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "IssueEpisode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "issueId" INTEGER NOT NULL,
    "episodeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueEpisode_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueEpisode_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IssueComment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "issueId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- DataMigration: Copy existing episodeId relationships to join table
INSERT INTO "IssueEpisode" ("issueId", "episodeId", "createdAt")
SELECT "id", "episodeId", "createdAt" FROM "Issue" WHERE "episodeId" IS NOT NULL;

-- DataMigration: Convert existing resolution notes to IssueComment entries
INSERT INTO "IssueComment" ("issueId", "userId", "type", "content", "createdAt")
SELECT "id", COALESCE("resolvedById", "userId"), 'COMMENT', 'Resolution: ' || "resolution", COALESCE("resolvedAt", "updatedAt")
FROM "Issue"
WHERE "resolution" IS NOT NULL AND "resolution" != '';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Issue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "platform" TEXT,
    "audioLang" TEXT,
    "subtitleLang" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Issue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Issue" ("audioLang", "createdAt", "description", "id", "platform", "status", "subtitleLang", "type", "updatedAt", "userId") SELECT "audioLang", "createdAt", "description", "id", "platform", "status", "subtitleLang", "type", "updatedAt", "userId" FROM "Issue";
DROP TABLE "Issue";
ALTER TABLE "new_Issue" RENAME TO "Issue";
CREATE INDEX "Issue_userId_idx" ON "Issue"("userId");
CREATE INDEX "Issue_status_idx" ON "Issue"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "IssueEpisode_issueId_idx" ON "IssueEpisode"("issueId");

-- CreateIndex
CREATE INDEX "IssueEpisode_episodeId_idx" ON "IssueEpisode"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueEpisode_issueId_episodeId_key" ON "IssueEpisode"("issueId", "episodeId");

-- CreateIndex
CREATE INDEX "IssueComment_issueId_idx" ON "IssueComment"("issueId");

-- CreateIndex
CREATE INDEX "IssueComment_userId_idx" ON "IssueComment"("userId");
