/*
  Warnings:

  - You are about to drop the column `content_html` on the `contents` table. All the data in the column will be lost.
  - You are about to drop the column `content_text` on the `contents` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "collaborative_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content_id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL DEFAULT 'content',
    "yjs_state" BLOB,
    "state_vector" BLOB,
    "last_sync_at" DATETIME,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_connections" INTEGER NOT NULL DEFAULT 10,
    "settings" TEXT,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "collaborative_documents_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaborative_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "peer_id" TEXT NOT NULL,
    "session_type" TEXT NOT NULL DEFAULT 'editor',
    "status" TEXT NOT NULL DEFAULT 'active',
    "permissions" TEXT NOT NULL DEFAULT 'edit',
    "cursor_position" TEXT,
    "selection" TEXT,
    "awareness" TEXT,
    "last_heartbeat" DATETIME NOT NULL,
    "connected_at" DATETIME NOT NULL,
    "disconnected_at" DATETIME,
    "client_info" TEXT,
    CONSTRAINT "collaborative_sessions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "collaborative_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "collaborative_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "yjs_updates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "update_data" BLOB NOT NULL,
    "clock" TEXT NOT NULL,
    "origin" TEXT,
    "size" INTEGER NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL,
    CONSTRAINT "yjs_updates_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "collaborative_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conflict_resolutions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "document_id" TEXT NOT NULL,
    "conflict_type" TEXT NOT NULL,
    "description" TEXT,
    "conflict_data" TEXT NOT NULL,
    "resolution_type" TEXT NOT NULL,
    "resolution" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "involved_users" TEXT,
    "resolved_by" TEXT,
    "resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL,
    CONSTRAINT "conflict_resolutions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "collaborative_documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collaboration_invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "content_id" TEXT,
    "inviter_id" TEXT NOT NULL,
    "invitee_email" TEXT,
    "invitee_id" TEXT,
    "permissions" TEXT NOT NULL DEFAULT 'edit',
    "invite_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" DATETIME,
    "accepted_at" DATETIME,
    "message" TEXT,
    "created_at" DATETIME NOT NULL,
    CONSTRAINT "collaboration_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "collaboration_invites_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "authors" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_contents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "order_index" INTEGER NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content_json" TEXT,
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
INSERT INTO "new_contents" ("author_id", "blockchain_timestamp", "chapter_id", "character_count", "characters_involved", "content_hash", "content_json", "contributors", "copyright_status", "created_at", "emotion_tone", "id", "importance_level", "is_collaborative", "is_public", "last_edited_at", "last_editor_id", "location", "metadata", "notes", "order_index", "paragraph_count", "published_at", "scene_description", "status", "story_timeline", "tags", "title", "type", "updated_at", "version", "word_count", "work_id", "writing_duration") SELECT "author_id", "blockchain_timestamp", "chapter_id", "character_count", "characters_involved", "content_hash", "content_json", "contributors", "copyright_status", "created_at", "emotion_tone", "id", "importance_level", "is_collaborative", "is_public", "last_edited_at", "last_editor_id", "location", "metadata", "notes", "order_index", "paragraph_count", "published_at", "scene_description", "status", "story_timeline", "tags", "title", "type", "updated_at", "version", "word_count", "work_id", "writing_duration" FROM "contents";
DROP TABLE "contents";
ALTER TABLE "new_contents" RENAME TO "contents";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "collaborative_documents_content_id_key" ON "collaborative_documents"("content_id");

-- CreateIndex
CREATE INDEX "collaborative_sessions_document_id_status_idx" ON "collaborative_sessions"("document_id", "status");

-- CreateIndex
CREATE INDEX "collaborative_sessions_user_id_status_idx" ON "collaborative_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "yjs_updates_document_id_created_at_idx" ON "yjs_updates"("document_id", "created_at");

-- CreateIndex
CREATE INDEX "yjs_updates_document_id_applied_idx" ON "yjs_updates"("document_id", "applied");

-- CreateIndex
CREATE INDEX "conflict_resolutions_document_id_status_idx" ON "conflict_resolutions"("document_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_invites_invite_code_key" ON "collaboration_invites"("invite_code");

-- CreateIndex
CREATE INDEX "collaboration_invites_work_id_status_idx" ON "collaboration_invites"("work_id", "status");

-- CreateIndex
CREATE INDEX "collaboration_invites_invite_code_idx" ON "collaboration_invites"("invite_code");
