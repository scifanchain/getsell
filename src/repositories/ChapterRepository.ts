/**
 * Chapter Repository
 * 
 * 使用 Drizzle ORM 进行类型安全的数据库操作
 * CRDT 功能由 CR-SQLite 自动处理
 */

import { eq, and, isNull, asc } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DatabaseManager } from '../core/db-manager';
import { 
  chapters,
  type Chapter, 
  type NewChapter, 
  type UpdateChapter 
} from '../db/schema';

export interface IChapterRepository {
  create(data: Omit<NewChapter, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter>;
  findById(id: string): Promise<Chapter | null>;
  findByWork(workId: string): Promise<Chapter[]>;
  findChildren(parentId: string): Promise<Chapter[]>;
  findRootChapters(workId: string): Promise<Chapter[]>;
  update(id: string, data: UpdateChapter): Promise<Chapter>;
  delete(id: string): Promise<void>;
  reorder(workId: string, chapterOrders: Array<{ id: string; orderIndex: number }>): Promise<void>;
  batchReorder(chapters: Array<{ id: string; parentId?: string; orderIndex: number; level: number }>): Promise<void>;
  move(chapterId: string, newParentId: string | null, newOrderIndex: number): Promise<Chapter>;
  getPath(chapterId: string): Promise<Chapter[]>;
}

export class ChapterRepository implements IChapterRepository {
  constructor(private dbManager: DatabaseManager) {}

  /**
   * 创建新章节
   */
  async create(data: Omit<NewChapter, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chapter> {
    const db = this.dbManager.getDrizzle();
    const now = Date.now();
    const id = ulid();

    const newChapter: NewChapter = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(chapters).values(newChapter);

    const result = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, id))
      .limit(1);

    return result[0]!;
  }

  /**
   * 根据 ID 查找章节
   */
  async findById(id: string): Promise<Chapter | null> {
    const db = this.dbManager.getDrizzle();

    const result = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * 获取作品的所有章节（按层级和顺序排序）
   */
  async findByWork(workId: string): Promise<Chapter[]> {
    const db = this.dbManager.getDrizzle();

    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.workId, workId))
      .orderBy(asc(chapters.level), asc(chapters.orderIndex));
  }

  /**
   * 获取根级别章节（没有父章节的章节）
   */
  async findRootChapters(workId: string): Promise<Chapter[]> {
    const db = this.dbManager.getDrizzle();

    return await db
      .select()
      .from(chapters)
      .where(
        and(
          eq(chapters.workId, workId),
          isNull(chapters.parentId)
        )
      )
      .orderBy(asc(chapters.orderIndex));
  }

  /**
   * 获取父章节的子章节
   */
  async findChildren(parentId: string): Promise<Chapter[]> {
    const db = this.dbManager.getDrizzle();

    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.parentId, parentId))
      .orderBy(asc(chapters.orderIndex));
  }

  /**
   * 更新章节
   */
  async update(id: string, data: UpdateChapter): Promise<Chapter> {
    const db = this.dbManager.getDrizzle();

    await db
      .update(chapters)
      .set({ ...data, updatedAt: Date.now() })
      .where(eq(chapters.id, id));

    const result = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, id))
      .limit(1);

    return result[0]!;
  }

  /**
   * 删除章节
   */
  async delete(id: string): Promise<void> {
    const db = this.dbManager.getDrizzle();

    await db.delete(chapters).where(eq(chapters.id, id));
  }

  /**
   * 重新排序章节
   */
  async reorder(workId: string, chapterOrders: Array<{ id: string; orderIndex: number }>): Promise<void> {
    const db = this.dbManager.getDrizzle();

    // 批量更新顺序
    for (const { id, orderIndex } of chapterOrders) {
      await db
        .update(chapters)
        .set({ orderIndex, updatedAt: Date.now() })
        .where(
          and(
            eq(chapters.id, id),
            eq(chapters.workId, workId)
          )
        );
    }
  }

  /**
   * 批量重新排序章节（包括层级和父节点）
   */
  async batchReorder(
    chapterUpdates: Array<{ id: string; parentId?: string; orderIndex: number; level: number }>
  ): Promise<void> {
    const db = this.dbManager.getDrizzle();

    for (const { id, parentId, orderIndex, level } of chapterUpdates) {
      await db
        .update(chapters)
        .set({
          parentId: parentId || null,
          orderIndex,
          level,
          updatedAt: Date.now(),
        })
        .where(eq(chapters.id, id));
    }
  }

  /**
   * 移动章节到新父节点
   */
  async move(chapterId: string, newParentId: string | null, newOrderIndex: number): Promise<Chapter> {
    const db = this.dbManager.getDrizzle();

    // 获取新父节点的层级
    let newLevel = 0;
    if (newParentId) {
      const parent = await this.findById(newParentId);
      if (parent) {
        newLevel = parent.level + 1;
      }
    }

    await db
      .update(chapters)
      .set({
        parentId: newParentId,
        orderIndex: newOrderIndex,
        level: newLevel,
        updatedAt: Date.now(),
      })
      .where(eq(chapters.id, chapterId));

    const result = await db
      .select()
      .from(chapters)
      .where(eq(chapters.id, chapterId))
      .limit(1);

    return result[0]!;
  }

  /**
   * 获取章节的层级路径（从根到当前章节）
   */
  async getPath(chapterId: string): Promise<Chapter[]> {
    const db = this.dbManager.getDrizzle();
    const path: Chapter[] = [];
    let currentId: string | null = chapterId;

    while (currentId) {
      const chapter = await this.findById(currentId);
      if (!chapter) break;

      path.unshift(chapter); // 添加到数组开头
      currentId = chapter.parentId;
    }

    return path;
  }
}
