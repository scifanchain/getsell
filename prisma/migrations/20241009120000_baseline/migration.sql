-- CreateTable
CREATE TABLE "authors" (
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
    "last_active_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "works" (
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
    "target_completion_date" BIGINT,
    "blockchain_hash" TEXT,
    "nft_token_id" TEXT,
    "nft_contract_address" TEXT,
    "copyright_hash" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "license_type" TEXT NOT NULL DEFAULT 'all_rights_reserved',
    "published_at" BIGINT,
    "metadata" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "works_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chapters" (
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
    "published_at" BIGINT,
    "metadata" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "chapters_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chapters_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chapters_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "order_index" INTEGER NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL DEFAULT 'text',
    "content_delta" TEXT,
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

-- CreateTable
CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content_id" TEXT NOT NULL,
    "content_delta" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "characters" (
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
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "characters_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "worldbuilding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "details" TEXT,
    "references_data" TEXT,
    "tags" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    CONSTRAINT "worldbuilding_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "blockchain_sync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "blockchain_hash" TEXT NOT NULL,
    "transaction_hash" TEXT,
    "block_number" INTEGER,
    "sync_status" TEXT NOT NULL DEFAULT 'pending',
    "sync_data" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL
);

-- CreateTable
CREATE TABLE "collaboration_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "work_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "changes" TEXT,
    "message" TEXT,
    "created_at" BIGINT NOT NULL,
    CONSTRAINT "collaboration_logs_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "collaboration_logs_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schema_version" (
    "version" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "applied_at" BIGINT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "authors_username_key" ON "authors"("username");

-- CreateIndex
CREATE UNIQUE INDEX "authors_email_key" ON "authors"("email");