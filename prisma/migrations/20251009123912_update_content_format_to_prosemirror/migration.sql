/*
  Warnings:

  - You are about to drop the column `content_delta` on the `content_versions` table. All the data in the column will be lost.
  - You are about to drop the column `content_delta` on the `contents` table. All the data in the column will be lost.
  - Added the required column `content_json` to the `content_versions` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_content_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content_id" TEXT NOT NULL,
    "content_json" TEXT NOT NULL,
    "content_html" TEXT,
    "content_text" TEXT,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "character_count" INTEGER NOT NULL DEFAULT 0,
    "version_number" INTEGER NOT NULL,
    "change_summary" TEXT,
    "author_id" TEXT NOT NULL,
    "blockchain_hash" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "content_versions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "content_versions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_content_versions" ("author_id", "blockchain_hash", "change_summary", "character_count", "content_html", "content_id", "content_text", "created_at", "id", "version_number", "word_count") SELECT "author_id", "blockchain_hash", "change_summary", "character_count", "content_html", "content_id", "content_text", "created_at", "id", "version_number", "word_count" FROM "content_versions";
DROP TABLE "content_versions";
ALTER TABLE "new_content_versions" RENAME TO "content_versions";
CREATE TABLE "new_contents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "order_index" INTEGER NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content_json" TEXT,
    "content_html" TEXT,
    "content_text" TEXT,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "character_count" INTEGER NOT NULL DEFAULT 0,
    "paragraph_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "author_id" TEXT NOT NULL,
    "is_collaborative" BOOLEAN NOT NULL DEFAULT false,
    "contributors" TEXT,
    "story_timeline" TEXT,
    "characters_involved" TEXT,
    "location" TEXT,
    "scene_description" TEXT,
    "tags" TEXT,
    "emotion_tone" TEXT,
    "importance_level" INTEGER NOT NULL DEFAULT 3,
    "content_hash" TEXT,
    "blockchain_timestamp" BIGINT,
    "copyright_status" TEXT NOT NULL DEFAULT 'draft',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "published_at" BIGINT,
    "writing_duration" INTEGER NOT NULL DEFAULT 0,
    "last_edited_at" BIGINT NOT NULL,
    "last_editor_id" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "contents_last_editor_id_fkey" FOREIGN KEY ("last_editor_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contents_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "contents_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_contents" ("author_id", "blockchain_timestamp", "chapter_id", "character_count", "characters_involved", "content_hash", "content_html", "content_text", "contributors", "copyright_status", "created_at", "emotion_tone", "id", "importance_level", "is_collaborative", "is_public", "last_edited_at", "last_editor_id", "location", "metadata", "notes", "order_index", "paragraph_count", "published_at", "scene_description", "status", "story_timeline", "tags", "title", "type", "updated_at", "version", "word_count", "work_id", "writing_duration") SELECT "author_id", "blockchain_timestamp", "chapter_id", "character_count", "characters_involved", "content_hash", "content_html", "content_text", "contributors", "copyright_status", "created_at", "emotion_tone", "id", "importance_level", "is_collaborative", "is_public", "last_edited_at", "last_editor_id", "location", "metadata", "notes", "order_index", "paragraph_count", "published_at", "scene_description", "status", "story_timeline", "tags", "title", "type", "updated_at", "version", "word_count", "work_id", "writing_duration" FROM "contents";
DROP TABLE "contents";
ALTER TABLE "new_contents" RENAME TO "contents";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
