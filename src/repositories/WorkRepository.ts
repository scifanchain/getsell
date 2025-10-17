/**
 * Work Repository
 * 
 * 使用 Drizzle ORM 进行类型安全的数据库操作
 * CRDT 功能由 CR-SQLite 自动处理
 */

import { eq, like, and, or, desc, asc, count } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DatabaseManager } from '../core/db-manager';
import { 
  works,
  chapters,
  type Work, 
  type NewWork, 
  type UpdateWork 
} from '../db/schema';
import type { QueryOptions } from '../shared/types';
import type { IWorkRepository } from './interfaces/IWorkRepository';

export class WorkRepository implements IWorkRepository {
  constructor(private dbManager: DatabaseManager) {}

  /**
   * 创建新作品
   */
  async create(data: Omit<NewWork, 'id' | 'createdAt' | 'updatedAt'>): Promise<Work> {
    const db = this.dbManager.getDrizzle();
    const now = Date.now();
    const id = ulid();

    const newWork: NewWork = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(works).values(newWork);

    const result = await db
      .select()
      .from(works)
      .where(eq(works.id, id))
      .limit(1);

    return result[0]!;
  }

  /**
   * 根据 ID 查找作品
   */
  async findById(id: string): Promise<Work | null> {
    const db = this.dbManager.getDrizzle();

    const result = await db
      .select()
      .from(works)
      .where(eq(works.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * 查找作者的所有作品
   */
  async findByAuthor(
    authorId: string,
    options?: QueryOptions
  ): Promise<Work[]> {
    const db = this.dbManager.getDrizzle();

    let query = db
      .select()
      .from(works)
      .where(eq(works.authorId, authorId))
      .orderBy(desc(works.updatedAt))
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
   * 获取所有作品
   */
  async findAll(options?: QueryOptions): Promise<Work[]> {
    const db = this.dbManager.getDrizzle();

    let query = db
      .select()
      .from(works)
      .orderBy(desc(works.updatedAt))
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
   * 更新作品
   */
  async update(id: string, data: UpdateWork): Promise<Work> {
    const db = this.dbManager.getDrizzle();

    await db
      .update(works)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(works.id, id));

    const result = await db
      .select()
      .from(works)
      .where(eq(works.id, id))
      .limit(1);

    return result[0]!;
  }

  /**
   * 删除作品
   */
  async delete(id: string): Promise<void> {
    const db = this.dbManager.getDrizzle();

    await db.delete(works).where(eq(works.id, id));
  }

  /**
   * 搜索作品
   */
  async search(query: string, authorId?: string): Promise<Work[]> {
    const db = this.dbManager.getDrizzle();

    const conditions = [];

    // 搜索标题和描述
    conditions.push(
      or(
        like(works.title, `%${query}%`),
        like(works.description, `%${query}%`)
      )
    );

    // 如果指定了作者，添加作者过滤
    if (authorId) {
      conditions.push(eq(works.authorId, authorId));
    }

    return await db
      .select()
      .from(works)
      .where(and(...conditions))
      .orderBy(desc(works.updatedAt));
  }

  /**
   * 获取作品统计信息
   */
  async getStats(id: string): Promise<{
    chapterCount: number;
    totalWords: number;
    totalCharacters: number;
  }> {
    const db = this.dbManager.getDrizzle();

    // 获取章节数量
    const chapterCountResult = await db
      .select({ count: count() })
      .from(chapters)
      .where(eq(chapters.workId, id));

    const chapterCount = chapterCountResult[0]?.count || 0;

    // 从 work 表获取字数统计
    const work = await this.findById(id);

    return {
      chapterCount,
      totalWords: work?.totalWords || 0,
      totalCharacters: work?.totalCharacters || 0,
    };
  }
}
