/**
 * Drizzle ORM Schema 定义
 * 定义所有数据库表结构和关系
 * 
 * 注意事项：
 * 1. CR-SQLite 不支持除主键外的 UNIQUE 约束，唯一性在应用层检查
 * 2. CR-SQLite 不支持外键约束，关系定义仅用于查询
 * 3. 所有 NOT NULL 字段必须有默认值
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// Authors 表 - 作者信息
// ============================================
export const authors = sqliteTable('authors', {
  id: text('id').primaryKey().notNull(),
  username: text('username').notNull().default(''),
  passwordHash: text('passwordHash'),
  displayName: text('displayName'),
  email: text('email'),
  bio: text('bio'),
  avatarUrl: text('avatarUrl'),
  walletAddress: text('walletAddress'),
  publicKey: text('publicKey'),
  privateKeyEncrypted: text('privateKeyEncrypted'),
  totalWorks: integer('totalWorks').notNull().default(0),
  totalWords: integer('totalWords').notNull().default(0),
  status: text('status').notNull().default('active'),
  preferences: text('preferences'), // JSON 字符串
  lastActiveAt: integer('lastActiveAt'),
  createdAt: integer('createdAt').notNull().default(0),
  updatedAt: integer('updatedAt').notNull().default(0),
});

// ============================================
// Works 表 - 作品信息
// ============================================
export const works = sqliteTable('works', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull().default(''),
  subtitle: text('subtitle'),
  description: text('description'),
  coverImageUrl: text('coverImageUrl'),
  genre: text('genre'),
  tags: text('tags'), // JSON 数组字符串
  authorId: text('authorId').notNull().default(''),
  collaborationMode: text('collaborationMode').notNull().default('solo'), // 'solo' | 'collaborative'
  collaborators: text('collaborators'), // JSON 数组字符串
  status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived'
  progressPercentage: real('progressPercentage').notNull().default(0.0),
  totalWords: integer('totalWords').notNull().default(0),
  totalCharacters: integer('totalCharacters').notNull().default(0),
  chapterCount: integer('chapterCount').notNull().default(0),
  targetWords: integer('targetWords'),
  targetCompletionDate: integer('targetCompletionDate'),
  blockchainHash: text('blockchainHash'),
  nftTokenId: text('nftTokenId'),
  nftContractAddress: text('nftContractAddress'),
  copyrightHash: text('copyrightHash'),
  isPublic: integer('isPublic', { mode: 'boolean' }).notNull().default(false),
  licenseType: text('licenseType').notNull().default('all_rights_reserved'),
  publishedAt: integer('publishedAt'),
  metadata: text('metadata'), // JSON 对象字符串
  createdAt: integer('createdAt').notNull().default(0),
  updatedAt: integer('updatedAt').notNull().default(0),
});

// ============================================
// Chapters 表 - 章节信息
// ============================================
export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey().notNull(),
  workId: text('workId').notNull().default(''),
  parentId: text('parentId'),
  level: integer('level').notNull().default(1),
  orderIndex: integer('orderIndex').notNull().default(0),
  title: text('title').notNull().default(''),
  subtitle: text('subtitle'),
  description: text('description'),
  type: text('type').notNull().default('chapter'), // 'chapter' | 'volume' | 'section'
  status: text('status').notNull().default('draft'),
  wordCount: integer('wordCount').notNull().default(0),
  characterCount: integer('characterCount').notNull().default(0),
  contentCount: integer('contentCount').notNull().default(0),
  childChapterCount: integer('childChapterCount').notNull().default(0),
  progressPercentage: real('progressPercentage').notNull().default(0.0),
  targetWords: integer('targetWords'),
  authorId: text('authorId').notNull().default(''),
  storyTimelineStart: text('storyTimelineStart'),
  storyTimelineEnd: text('storyTimelineEnd'),
  tags: text('tags'), // JSON 数组字符串
  blockchainHash: text('blockchainHash'),
  isPublic: integer('isPublic', { mode: 'boolean' }).notNull().default(false),
  publishedAt: integer('publishedAt'),
  metadata: text('metadata'), // JSON 对象字符串
  createdAt: integer('createdAt').notNull().default(0),
  updatedAt: integer('updatedAt').notNull().default(0),
});

// ============================================
// Contents 表 - 内容块
// ============================================
export const contents = sqliteTable('contents', {
  id: text('id').primaryKey().notNull(),
  workId: text('workId').notNull().default(''),
  chapterId: text('chapterId'),
  orderIndex: integer('orderIndex').notNull().default(0),
  title: text('title'),
  type: text('type').notNull().default('text'), // 'text' | 'dialogue' | 'scene' | 'note'
  contentJson: text('contentJson'), // ProseMirror JSON 格式
  wordCount: integer('wordCount').notNull().default(0),
  characterCount: integer('characterCount').notNull().default(0),
  paragraphCount: integer('paragraphCount').notNull().default(0),
  status: text('status').notNull().default('draft'),
  version: integer('version').notNull().default(1),
  authorId: text('authorId').notNull().default(''),
  isCollaborative: integer('isCollaborative', { mode: 'boolean' }).notNull().default(false),
  contributors: text('contributors'), // JSON 数组字符串
  storyTimeline: text('storyTimeline'),
  charactersInvolved: text('charactersInvolved'), // JSON 数组字符串
  location: text('location'),
  sceneDescription: text('sceneDescription'),
  tags: text('tags'), // JSON 数组字符串
  emotionTone: text('emotionTone'),
  importanceLevel: integer('importanceLevel').notNull().default(3), // 1-5
  contentHash: text('contentHash'),
  blockchainTimestamp: integer('blockchainTimestamp'),
  copyrightStatus: text('copyrightStatus').notNull().default('draft'),
  isPublic: integer('isPublic', { mode: 'boolean' }).notNull().default(false),
  publishedAt: integer('publishedAt'),
  writingDuration: integer('writingDuration').notNull().default(0),
  lastEditedAt: integer('lastEditedAt').notNull().default(0),
  lastEditorId: text('lastEditorId').notNull().default(''),
  notes: text('notes'),
  metadata: text('metadata'), // JSON 对象字符串
  createdAt: integer('createdAt').notNull().default(0),
  updatedAt: integer('updatedAt').notNull().default(0),
});

// ============================================
// ContentVersions 表 - 内容版本历史
// ============================================
export const contentVersions = sqliteTable('contentVersions', {
  id: text('id').primaryKey().notNull(),
  contentId: text('contentId').notNull().default(''),
  contentJson: text('contentJson').notNull().default(''),
  contentHtml: text('contentHtml'),
  contentText: text('contentText'),
  wordCount: integer('wordCount').notNull().default(0),
  characterCount: integer('characterCount').notNull().default(0),
  versionNumber: integer('versionNumber').notNull().default(1),
  changeSummary: text('changeSummary'),
  authorId: text('authorId').notNull().default(''),
  blockchainHash: text('blockchainHash'),
  createdAt: integer('createdAt').notNull().default(0),
});

// ============================================
// CollaborativeDocuments 表 - Yjs 协作文档
// ============================================
export const collaborativeDocuments = sqliteTable('collaborativeDocuments', {
  id: text('id').primaryKey().notNull(),
  contentId: text('contentId').notNull().default(''),
  workId: text('workId').notNull().default(''),
  documentType: text('documentType').notNull().default('text'),
  yjsState: text('yjsState', { mode: 'text' }), // 存储为 Buffer，但 SQLite 中为 BLOB
  stateVector: text('stateVector', { mode: 'text' }), // 存储为 Buffer
  maxConnections: integer('maxConnections').notNull().default(10),
  lastSyncAt: integer('lastSyncAt'),
  createdAt: integer('createdAt').notNull().default(0),
  updatedAt: integer('updatedAt').notNull().default(0),
});

// ============================================
// Relations - 定义表之间的关系（仅用于查询）
// ============================================

export const authorsRelations = relations(authors, ({ many }) => ({
  works: many(works),
  chapters: many(chapters),
  contents: many(contents),
}));

export const worksRelations = relations(works, ({ one, many }) => ({
  author: one(authors, {
    fields: [works.authorId],
    references: [authors.id],
  }),
  chapters: many(chapters),
  contents: many(contents),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  work: one(works, {
    fields: [chapters.workId],
    references: [works.id],
  }),
  author: one(authors, {
    fields: [chapters.authorId],
    references: [authors.id],
  }),
  parent: one(chapters, {
    fields: [chapters.parentId],
    references: [chapters.id],
    relationName: 'parentChild',
  }),
  children: many(chapters, {
    relationName: 'parentChild',
  }),
  contents: many(contents),
}));

export const contentsRelations = relations(contents, ({ one, many }) => ({
  work: one(works, {
    fields: [contents.workId],
    references: [works.id],
  }),
  chapter: one(chapters, {
    fields: [contents.chapterId],
    references: [chapters.id],
  }),
  author: one(authors, {
    fields: [contents.authorId],
    references: [authors.id],
  }),
  versions: many(contentVersions),
  collaborativeDoc: one(collaborativeDocuments, {
    fields: [contents.id],
    references: [collaborativeDocuments.contentId],
  }),
}));

export const contentVersionsRelations = relations(contentVersions, ({ one }) => ({
  content: one(contents, {
    fields: [contentVersions.contentId],
    references: [contents.id],
  }),
  author: one(authors, {
    fields: [contentVersions.authorId],
    references: [authors.id],
  }),
}));

export const collaborativeDocumentsRelations = relations(collaborativeDocuments, ({ one }) => ({
  content: one(contents, {
    fields: [collaborativeDocuments.contentId],
    references: [contents.id],
  }),
  work: one(works, {
    fields: [collaborativeDocuments.workId],
    references: [works.id],
  }),
}));

// ============================================
// TypeScript 类型导出
// ============================================

// Select 类型（查询返回）
export type Author = typeof authors.$inferSelect;
export type Work = typeof works.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Content = typeof contents.$inferSelect;
export type ContentVersion = typeof contentVersions.$inferSelect;
export type CollaborativeDocument = typeof collaborativeDocuments.$inferSelect;

// Insert 类型（插入数据）
export type NewAuthor = typeof authors.$inferInsert;
export type NewWork = typeof works.$inferInsert;
export type NewChapter = typeof chapters.$inferInsert;
export type NewContent = typeof contents.$inferInsert;
export type NewContentVersion = typeof contentVersions.$inferInsert;
export type NewCollaborativeDocument = typeof collaborativeDocuments.$inferInsert;

// Update 类型（部分更新）
export type UpdateAuthor = Partial<NewAuthor>;
export type UpdateWork = Partial<NewWork>;
export type UpdateChapter = Partial<NewChapter>;
export type UpdateContent = Partial<NewContent>;

// Delete 类型（删除条件）
export type DeleteAuthor = Pick<Author, 'id'>;
export type DeleteWork = Pick<Work, 'id'>;
export type DeleteChapter = Pick<Chapter, 'id'>;
export type DeleteContent = Pick<Content, 'id'>;
export type DeleteContentVersion = Pick<ContentVersion, 'id'>;
export type DeleteCollaborativeDocument = Pick<CollaborativeDocument, 'id'>;

