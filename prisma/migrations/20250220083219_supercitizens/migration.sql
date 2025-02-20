-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deviceId" TEXT NOT NULL,
    "citizen" BOOLEAN NOT NULL DEFAULT false,
    "supercitizen" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 0,
    "password" TEXT,
    "transfer" TEXT NOT NULL
);
INSERT INTO "new_User" ("citizen", "deviceId", "id", "password", "transfer", "version") SELECT "citizen", "deviceId", "id", "password", "transfer", "version" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_deviceId_key" ON "User"("deviceId");
CREATE UNIQUE INDEX "User_transfer_key" ON "User"("transfer");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
