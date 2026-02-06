-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "dateFormat" TEXT NOT NULL DEFAULT 'EU',
    "maxParallelTasks" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("dateFormat", "id", "updatedAt") SELECT "dateFormat", "id", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
