/*
  Warnings:

  - You are about to alter the column `created_at` on the `authors` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `last_active_at` on the `authors` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `updated_at` on the `authors` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `created_at` on the `blockchain_sync` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `updated_at` on the `blockchain_sync` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `created_at` on the `chapters` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `published_at` on the `chapters` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `updated_at` on the `chapters` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `created_at` on the `characters` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `updated_at` on the `characters` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `created_at` on the `collaboration_logs` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `created_at` on the `content_versions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `blockchain_timestamp` on the `contents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `created_at` on the `contents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `last_edited_at` on the `contents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `published_at` on the `contents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `updated_at` on the `contents` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `applied_at` on the `schema_version` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `created_at` on the `works` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `published_at` on the `works` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `target_completion_date` on the `works` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.
  - You are about to alter the column `updated_at` on the `works` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `DateTime`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_authors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "email" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "wallet_address" TEXT,
    "public_key" TEXT,
    "private_key_encrypted" TEXT,
    "total_works" INTEGER NOT NULL DEFAULT 0,
    "total_words" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "preferences" TEXT,
    "last_active_at" DATETIME,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_authors" ("avatar_url", "bio", "created_at", "display_name", "email", "id", "last_active_at", "preferences", "private_key_encrypted", "public_key", "status", "total_words", "total_works", "updated_at", "username", "wallet_address") SELECT "avatar_url", "bio", "created_at", "display_name", "email", "id", "last_active_at", "preferences", "private_key_encrypted", "public_key", "status", "total_words", "total_works", "updated_at", "username", "wallet_address" FROM "authors";
DROP TABLE "authors";
ALTER TABLE "new_authors" RENAME TO "authors";
CREATE UNIQUE INDEX "authors_username_key" ON "authors"("username");
CREATE UNIQUE INDEX "authors_email_key" ON "authors"("email");
CREATE TABLE "new_blockchain_sync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "blockchain_hash" TEXT NOT NULL,
    "transaction_hash" TEXT,
    "block_number" INTEGER,
    "sync_status" TEXT NOT NULL DEFAULT 'pending',
    "sync_data" TEXT,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_blockchain_sync" ("block_number", "blockchain_hash", "content_id", "content_type", "created_at", "id", "sync_data", "sync_status", "transaction_hash", "updated_at") SELECT "block_number", "blockchain_hash", "content_id", "content_type", "created_at", "id", "sync_data", "sync_status", "transaction_hash", "updated_at" FROM "blockchain_sync";
DROP TABLE "blockchain_sync";
ALTER TABLE "new_blockchain_sync" RENAME TO "blockchain_sync";
CREATE TABLE "new_chapters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "order_index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'chapter',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "character_count" INTEGER NOT NULL DEFAULT 0,
    "content_count" INTEGER NOT NULL DEFAULT 0,
    "child_chapter_count" INTEGER NOT NULL DEFAULT 0,
    "progress_percentage" REAL NOT NULL DEFAULT 0.0,
    "target_words" INTEGER,
    "author_id" TEXT NOT NULL,
    "story_timeline_start" TEXT,
    "story_timeline_end" TEXT,
    "tags" TEXT,
    "blockchain_hash" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "published_at" DATETIME,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "chapters_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chapters_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chapters_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_chapters" ("author_id", "blockchain_hash", "character_count", "child_chapter_count", "content_count", "created_at", "description", "id", "is_public", "level", "metadata", "order_index", "parent_id", "progress_percentage", "published_at", "status", "story_timeline_end", "story_timeline_start", "subtitle", "tags", "target_words", "title", "type", "updated_at", "word_count", "work_id") SELECT "author_id", "blockchain_hash", "character_count", "child_chapter_count", "content_count", "created_at", "description", "id", "is_public", "level", "metadata", "order_index", "parent_id", "progress_percentage", "published_at", "status", "story_timeline_end", "story_timeline_start", "subtitle", "tags", "target_words", "title", "type", "updated_at", "word_count", "work_id" FROM "chapters";
DROP TABLE "chapters";
ALTER TABLE "new_chapters" RENAME TO "chapters";
CREATE TABLE "new_characters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "appearance" TEXT,
    "personality" TEXT,
    "background" TEXT,
    "relationships" TEXT,
    "image_url" TEXT,
    "tags" TEXT,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "characters_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_characters" ("appearance", "background", "created_at", "description", "id", "image_url", "name", "personality", "relationships", "tags", "updated_at", "work_id") SELECT "appearance", "background", "created_at", "description", "id", "image_url", "name", "personality", "relationships", "tags", "updated_at", "work_id" FROM "characters";
DROP TABLE "characters";
ALTER TABLE "new_characters" RENAME TO "characters";
CREATE TABLE "new_collaboration_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "changes" TEXT,
    "message" TEXT,
    "created_at" DATETIME NOT NULL,
    CONSTRAINT "collaboration_logs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "collaboration_logs_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_collaboration_logs" ("action", "author_id", "changes", "created_at", "id", "message", "target_id", "target_type", "work_id") SELECT "action", "author_id", "changes", "created_at", "id", "message", "target_id", "target_type", "work_id" FROM "collaboration_logs";
DROP TABLE "collaboration_logs";
ALTER TABLE "new_collaboration_logs" RENAME TO "collaboration_logs";
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
    "created_at" DATETIME NOT NULL,
    CONSTRAINT "content_versions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "content_versions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_content_versions" ("author_id", "blockchain_hash", "change_summary", "character_count", "content_html", "content_id", "content_json", "content_text", "created_at", "id", "version_number", "word_count") SELECT "author_id", "blockchain_hash", "change_summary", "character_count", "content_html", "content_id", "content_json", "content_text", "created_at", "id", "version_number", "word_count" FROM "content_versions";
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
    "blockchain_timestamp" DATETIME,
    "copyright_status" TEXT NOT NULL DEFAULT 'draft',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "published_at" DATETIME,
    "writing_duration" INTEGER NOT NULL DEFAULT 0,
    "last_edited_at" DATETIME NOT NULL,
    "last_editor_id" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "contents_last_editor_id_fkey" FOREIGN KEY ("last_editor_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contents_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "contents_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_contents" ("author_id", "blockchain_timestamp", "chapter_id", "character_count", "characters_involved", "content_hash", "content_html", "content_json", "content_text", "contributors", "copyright_status", "created_at", "emotion_tone", "id", "importance_level", "is_collaborative", "is_public", "last_edited_at", "last_editor_id", "location", "metadata", "notes", "order_index", "paragraph_count", "published_at", "scene_description", "status", "story_timeline", "tags", "title", "type", "updated_at", "version", "word_count", "work_id", "writing_duration") SELECT "author_id", "blockchain_timestamp", "chapter_id", "character_count", "characters_involved", "content_hash", "content_html", "content_json", "content_text", "contributors", "copyright_status", "created_at", "emotion_tone", "id", "importance_level", "is_collaborative", "is_public", "last_edited_at", "last_editor_id", "location", "metadata", "notes", "order_index", "paragraph_count", "published_at", "scene_description", "status", "story_timeline", "tags", "title", "type", "updated_at", "version", "word_count", "work_id", "writing_duration" FROM "contents";
DROP TABLE "contents";
ALTER TABLE "new_contents" RENAME TO "contents";
CREATE TABLE "new_schema_version" (
    "version" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "applied_at" DATETIME NOT NULL
);
INSERT INTO "new_schema_version" ("applied_at", "version") SELECT "applied_at", "version" FROM "schema_version";
DROP TABLE "schema_version";
ALTER TABLE "new_schema_version" RENAME TO "schema_version";
CREATE TABLE "new_works" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "cover_image_url" TEXT,
    "genre" TEXT,
    "tags" TEXT,
    "author_id" TEXT NOT NULL,
    "collaboration_mode" TEXT NOT NULL DEFAULT 'solo',
    "collaborators" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "progress_percentage" REAL NOT NULL DEFAULT 0.0,
    "total_words" INTEGER NOT NULL DEFAULT 0,
    "total_characters" INTEGER NOT NULL DEFAULT 0,
    "chapter_count" INTEGER NOT NULL DEFAULT 0,
    "target_words" INTEGER,
    "target_completion_date" DATETIME,
    "blockchain_hash" TEXT,
    "nft_token_id" TEXT,
    "nft_contract_address" TEXT,
    "copyright_hash" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "license_type" TEXT NOT NULL DEFAULT 'all_rights_reserved',
    "published_at" DATETIME,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "works_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_works" ("author_id", "blockchain_hash", "chapter_count", "collaboration_mode", "collaborators", "copyright_hash", "cover_image_url", "created_at", "description", "genre", "id", "is_public", "license_type", "metadata", "nft_contract_address", "nft_token_id", "progress_percentage", "published_at", "status", "subtitle", "tags", "target_completion_date", "target_words", "title", "total_characters", "total_words", "updated_at") SELECT "author_id", "blockchain_hash", "chapter_count", "collaboration_mode", "collaborators", "copyright_hash", "cover_image_url", "created_at", "description", "genre", "id", "is_public", "license_type", "metadata", "nft_contract_address", "nft_token_id", "progress_percentage", "published_at", "status", "subtitle", "tags", "target_completion_date", "target_words", "title", "total_characters", "total_words", "updated_at" FROM "works";
DROP TABLE "works";
ALTER TABLE "new_works" RENAME TO "works";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
