/*
  Warnings:

  - You are about to drop the column `appearance` on the `characters` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "personality" TEXT,
    "background" TEXT,
    "relationships" TEXT,
    "image_url" TEXT,
    "tags" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "characters_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_characters" ("background", "created_at", "description", "id", "image_url", "name", "personality", "relationships", "tags", "updated_at", "work_id") SELECT "background", "created_at", "description", "id", "image_url", "name", "personality", "relationships", "tags", "updated_at", "work_id" FROM "characters";
DROP TABLE "characters";
ALTER TABLE "new_characters" RENAME TO "characters";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
