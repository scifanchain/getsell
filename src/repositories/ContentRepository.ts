/**
 * Content Repository
 * 
 * 使用 Drizzle ORM 进行类型安全的数据库操作
 * CRDT 功能由 CR-SQLite 自动处理
 */

import { eq, desc, and, or, like } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DatabaseManager } from '../core/db-manager';
import { 
  contents,
  contentVersions,
  type Content, 
  type NewContent, 
  type UpdateContent,
  type ContentVersion,
  type NewContentVersion
} from '../db/schema';
import type { QueryOptions } from '../shared/types';
import type { IContentRepository } from './interfaces/IContentRepository';

export class ContentRepository implements IContentRepository {
  constructor(private dbManager: DatabaseManager) {}

  /**
   * 创建新内容
   */
  async create(data: Omit<NewContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Content> {
    const db = this.dbManager.getDrizzle();
    const now = Date.now();
    const id = ulid();

    const newContent: NewContent = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
      lastEditedAt: now,
    };

    await db.insert(contents).values(newContent);

    const result = await db
      .select()
      .from(contents)
      .where(eq(contents.id, id))
      .limit(1);

    return result[0]!;
  }

  /**
   * 根据 ID 查找内容
   */
  async findById(id: string): Promise<Content | null> {
    const db = this.dbManager.getDrizzle();

    const result = await db
      .select()
      .from(contents)
      .where(eq(contents.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * 根据作品 ID 查找所有内容
   */
  async findByWork(workId: string): Promise<Content[]> {
    const db = this.dbManager.getDrizzle();

    return await db
      .select()
      .from(contents)
      .where(eq(contents.workId, workId))
      .orderBy(contents.orderIndex);
  }

  /**
   * 根据章节 ID 查找所有内容
   */
  async findByChapter(chapterId: string, options?: QueryOptions): Promise<Content[]> {
    const db = this.dbManager.getDrizzle();

    let query = db
      .select()
      .from(contents)
      .where(eq(contents.chapterId, chapterId))
      .orderBy(contents.orderIndex)
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  /**
   * 更新内容
   */
  async update(id: string, data: UpdateContent): Promise<Content> {
    const db = this.dbManager.getDrizzle();

    await db
      .update(contents)
      .set({ ...data, updatedAt: Date.now(), lastEditedAt: Date.now() })
      .where(eq(contents.id, id));

    const result = await db
      .select()
      .from(contents)
      .where(eq(contents.id, id))
      .limit(1);

    return result[0]!;
  }

  /**
   * 删除内容
   */
  async delete(id: string): Promise<void> {
    const db = this.dbManager.getDrizzle();

    await db.delete(contents).where(eq(contents.id, id));
  }

  /**
   * 重新排序内容
   */
  async reorder(workId: string, contentOrders: Array<{ id: string; orderIndex: number }>): Promise<void> {
    const db = this.dbManager.getDatabase(); // 使用原始数据库进行批量更新
    const now = Date.now();

    const updateStmt = db.prepare(
      'UPDATE contents SET orderIndex = ?, updatedAt = ? WHERE id = ? AND workId = ?'
    );

    const transaction = db.transaction((items: typeof contentOrders) => {
      for (const item of items) {
        updateStmt.run(item.orderIndex, now, item.id, workId);
      }
    });

    transaction(contentOrders);
  }

  /**
   * 搜索内容
   */
  async search(query: string): Promise<Content[]> {
    const db = this.dbManager.getDrizzle();
    const pattern = `%${query}%`;

    return await db
      .select()
      .from(contents)
      .where(
        or(
          like(contents.title, pattern),
          like(contents.contentJson, pattern)
        )
      )
      .limit(50);
  }

  /**
   * 获取内容的版本历史
   */
  async getVersionHistory(contentId: string): Promise<ContentVersion[]> {
    const db = this.dbManager.getDrizzle();

    return await db
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.contentId, contentId))
      .orderBy(desc(contentVersions.versionNumber));
  }

  /**
   * 创建内容版本
   */
  async createVersion(
    contentId: string,
    contentJson: string,
    changeSummary?: string,
    authorId?: string
  ): Promise<ContentVersion> {
    const db = this.dbManager.getDrizzle();
    const now = Date.now();
    const id = ulid();

    // 获取当前最大版本号
    const latestVersions = await db
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.contentId, contentId))
      .orderBy(desc(contentVersions.versionNumber))
      .limit(1);

    const nextVersionNumber = latestVersions[0] ? latestVersions[0].versionNumber + 1 : 1;

    const newVersion: NewContentVersion = {
      id,
      contentId,
      contentJson,
      versionNumber: nextVersionNumber,
      changeSummary: changeSummary || undefined,
      authorId: authorId || '',
      createdAt: now,
    };

    await db.insert(contentVersions).values(newVersion);

    const result = await db
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.id, id))
      .limit(1);

    return result[0]!;
  }

  /**
   * 获取特定版本
   */
  async getVersion(contentId: string, versionNumber: number): Promise<ContentVersion | null> {
    const db = this.dbManager.getDrizzle();

    const result = await db
      .select()
      .from(contentVersions)
      .where(
        and(
          eq(contentVersions.contentId, contentId),
          eq(contentVersions.versionNumber, versionNumber)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * 恢复到指定版本
   */
  async restoreVersion(contentId: string, versionNumber: number): Promise<Content> {
    const db = this.dbManager.getDrizzle();

    // 获取指定版本
    const version = await this.getVersion(contentId, versionNumber);
    if (!version) {
      throw new Error(`Version ${versionNumber} not found for content ${contentId}`);
    }

    // 更新内容
    await db
      .update(contents)
      .set({
        contentJson: version.contentJson,
        updatedAt: Date.now(),
        lastEditedAt: Date.now(),
        version: versionNumber,
      })
      .where(eq(contents.id, contentId));

    const result = await db
      .select()
      .from(contents)
      .where(eq(contents.id, contentId))
      .limit(1);

    return result[0]!;
  }
}
