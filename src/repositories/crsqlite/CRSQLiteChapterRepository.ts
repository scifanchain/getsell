/**
 * CR-SQLite 章节仓储实现
 * 实现 IChapterRepository 接口
 */

import { CRSQLiteBaseRepository } from './CRSQLiteBaseRepository';
import { CRSQLiteManager } from '../../core/crsqlite-manager';
import { IChapterRepository, ChapterData } from '../interfaces';
import { ulid } from 'ulid';

export class CRSQLiteChapterRepository extends CRSQLiteBaseRepository implements IChapterRepository {
  constructor(manager: CRSQLiteManager) {
    super(manager);
  }

  /**
   * 创建新章节
   */
  async create(chapterData: ChapterData & Record<string, any>): Promise<any> {
    const id = chapterData.id || ulid();
    const now = this.now();

    const data = {
      id,
      workId: chapterData.workId,
      parentId: chapterData.parentId || null,
      level: chapterData.level || 1,
      orderIndex: chapterData.orderIndex || 0,
      title: chapterData.title,
      subtitle: chapterData.subtitle || null,
      description: chapterData.description || null,
      type: chapterData.type || 'chapter',
      status: chapterData.status || 'draft',
      wordCount: 0,
      characterCount: 0,
      contentCount: 0,
      childChapterCount: 0,
      progressPercentage: 0.0,
      targetWords: chapterData.targetWords || null,
      authorId: chapterData.authorId,
      storyTimelineStart: chapterData.storyTimelineStart || null,
      storyTimelineEnd: chapterData.storyTimelineEnd || null,
      tags: chapterData.tags ? this.toJson(chapterData.tags) : null,
      blockchainHash: chapterData.blockchainHash || null,
      isPublic: this.fromBoolean(chapterData.isPublic),
      publishedAt: chapterData.publishedAt || null,
      metadata: chapterData.metadata ? this.toJson(chapterData.metadata) : null,
      createdAt: now,
      updatedAt: now,
    };

    const { columns, placeholders, params } = this.buildInsertClause(data);

    const sql = `
      INSERT INTO chapters (${columns})
      VALUES (${placeholders})
    `;

    this.run(sql, params);

    // 如果有父章节,更新父章节的子章节数
    if (data.parentId) {
      await this.updateParentChildCount(data.parentId);
    }

    return await this.findById(id);
  }

  /**
   * 根据ID查找章节
   */
  async findById(id: string): Promise<any | null> {
    const sql = `
      SELECT 
        c.*,
        w.title as work_title,
        a.username as author_name,
        pc.title as parent_title,
        (SELECT COUNT(*) FROM chapters WHERE parentId = c.id) as child_count,
        (SELECT COUNT(*) FROM contents WHERE chapterId = c.id) as content_count_actual
      FROM chapters c
      LEFT JOIN works w ON c.workId = w.id
      LEFT JOIN authors a ON c.authorId = a.id
      LEFT JOIN chapters pc ON c.parentId = pc.id
      WHERE c.id = ?
    `;

    const row = this.get(sql, [id]);
    if (!row) return null;

    return this.mapChapterRow(row);
  }

  /**
   * 根据作品ID查找章节
   */
  async findByWorkId(workId: string, options?: {
    includeChildren?: boolean;
    parentId?: string | null;
  }): Promise<any[]> {
    let sql = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM chapters WHERE parentId = c.id) as child_count,
        (SELECT COUNT(*) FROM contents WHERE chapterId = c.id) as content_count_actual
      FROM chapters c
      WHERE c.workId = ?
    `;

    const params: any[] = [workId];

    // 如果指定了父章节,只查询该父章节的子章节
    if (options?.parentId !== undefined) {
      if (options.parentId === null) {
        sql += ` AND c.parentId IS NULL`;
      } else {
        sql += ` AND c.parentId = ?`;
        params.push(options.parentId);
      }
    }

    sql += ` ORDER BY c.orderIndex ASC`;

    const rows = this.all(sql, params);
    const chapters = rows.map(row => this.mapChapterRow(row));

    // 如果需要包含子章节,递归加载
    if (options?.includeChildren) {
      for (const chapter of chapters) {
        chapter.children = await this.findByWorkId(workId, {
          parentId: chapter.id,
          includeChildren: true
        });
      }
    }

    return chapters;
  }

  /**
   * 更新章节
   */
  async update(id: string, updateData: Partial<ChapterData> & Record<string, any>): Promise<any> {
    const now = this.now();

    const data: Record<string, any> = {
      updatedAt: now,
    };

    // 只更新提供的字段
    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.subtitle !== undefined) data.subtitle = updateData.subtitle;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.type !== undefined) data.type = updateData.type;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.orderIndex !== undefined) data.orderIndex = updateData.orderIndex;
    if (updateData.level !== undefined) data.level = updateData.level;
    if (updateData.targetWords !== undefined) data.targetWords = updateData.targetWords;
    if (updateData.storyTimelineStart !== undefined) data.storyTimelineStart = updateData.storyTimelineStart;
    if (updateData.storyTimelineEnd !== undefined) data.storyTimelineEnd = updateData.storyTimelineEnd;
    if (updateData.tags !== undefined) data.tags = this.toJson(updateData.tags);
    if (updateData.isPublic !== undefined) data.isPublic = this.fromBoolean(updateData.isPublic);
    if (updateData.publishedAt !== undefined) data.publishedAt = updateData.publishedAt;
    if (updateData.metadata !== undefined) data.metadata = this.toJson(updateData.metadata);
    if (updateData.blockchainHash !== undefined) data.blockchainHash = updateData.blockchainHash;

    const { sql: setClause, params } = this.buildSetClause(data);

    const sql = `
      UPDATE chapters
      SET ${setClause}
      WHERE id = ?
    `;

    this.run(sql, [...params, id]);

    return await this.findById(id);
  }

  /**
   * 删除章节(级联删除子章节和内容)
   */
  async delete(id: string): Promise<void> {
    // 1. 递归删除所有子章节
    const childChapters = await this.findByWorkId('', { parentId: id });
    for (const child of childChapters) {
      await this.delete(child.id);
    }

    // 2. 删除该章节的所有内容
    this.run('DELETE FROM contents WHERE chapterId = ?', [id]);

    // 3. 获取父章节ID(用于更新计数)
    const chapter = await this.findById(id);
    const parentId = chapter?.parentId;

    // 4. 删除章节本身
    this.run('DELETE FROM chapters WHERE id = ?', [id]);

    // 5. 更新父章节的子章节数
    if (parentId) {
      await this.updateParentChildCount(parentId);
    }
  }

  /**
   * 更新章节统计信息
   */
  async updateStats(id: string): Promise<void> {
    // 统计该章节下的内容数量和字数
    const contentStats = this.get(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(wordCount), 0) as total_words,
        COALESCE(SUM(characterCount), 0) as total_chars
      FROM contents
      WHERE chapterId = ?
    `, [id]) as any;

    // 统计子章节数量
    const childCount = this.get(`
      SELECT COUNT(*) as count
      FROM chapters
      WHERE parentId = ?
    `, [id]) as any;

    // 计算进度百分比
    const chapter = await this.findById(id);
    let progress = 0;
    if (chapter?.targetWords && chapter.targetWords > 0) {
      progress = Math.min(100, (contentStats.total_words / chapter.targetWords) * 100);
    }

    this.run(`
      UPDATE chapters
      SET 
        contentCount = ?,
        childChapterCount = ?,
        wordCount = ?,
        characterCount = ?,
        progressPercentage = ?,
        updatedAt = ?
      WHERE id = ?
    `, [
      contentStats.count,
      childCount.count,
      contentStats.total_words,
      contentStats.total_chars,
      progress,
      this.now(),
      id
    ]);
  }

  /**
   * 重新排序章节
   */
  async reorder(workId: string, chapterOrders: Array<{ id: string; orderIndex: number }>): Promise<void> {
    // 在事务中批量更新章节顺序
    this.transaction(() => {
      for (const { id, orderIndex } of chapterOrders) {
        this.run(`
          UPDATE chapters
          SET orderIndex = ?, updatedAt = ?
          WHERE id = ? AND workId = ?
        `, [orderIndex, this.now(), id, workId]);
      }
    });
  }

  /**
   * 批量更新章节顺序（包括层级和父节点）
   */
  async batchReorder(chapters: Array<{ id: string; parentId?: string; orderIndex: number; level: number }>): Promise<void> {
    this.transaction(() => {
      for (const chapter of chapters) {
        this.run(`
          UPDATE chapters
          SET parentId = ?, orderIndex = ?, level = ?, updatedAt = ?
          WHERE id = ?
        `, [chapter.parentId || null, chapter.orderIndex, chapter.level, this.now(), chapter.id]);
      }
    });
  }

  /**
   * 移动章节到新父章节
   */
  async move(chapterId: string, newParentId: string | null, newOrderIndex: number): Promise<any> {
    const chapter = await this.findById(chapterId);
    if (!chapter) {
      throw new Error('Chapter not found');
    }

    const oldParentId = chapter.parentId;

    // 计算新层级
    let newLevel = 1;
    if (newParentId) {
      const newParent = await this.findById(newParentId);
      if (!newParent) {
        throw new Error('New parent chapter not found');
      }
      newLevel = newParent.level + 1;
    }

    this.transaction(() => {
      // 更新章节的父ID、层级和顺序
      this.run(`
        UPDATE chapters
        SET parentId = ?, level = ?, orderIndex = ?, updatedAt = ?
        WHERE id = ?
      `, [newParentId, newLevel, newOrderIndex, this.now(), chapterId]);

      // 更新旧父章节的子章节数
      if (oldParentId) {
        this.updateParentChildCount(oldParentId);
      }

      // 更新新父章节的子章节数
      if (newParentId) {
        this.updateParentChildCount(newParentId);
      }

      // 递归更新所有子章节的层级
      this.updateChildrenLevel(chapterId, newLevel);
    });

    return await this.findById(chapterId);
  }

  /**
   * 获取章节的层级路径
   */
  async getPath(chapterId: string): Promise<any[]> {
    const path: any[] = [];
    let currentId: string | null = chapterId;

    while (currentId) {
      const chapter = await this.findById(currentId);
      if (!chapter) break;

      path.unshift(chapter);
      currentId = chapter.parentId;
    }

    return path;
  }

  /**
   * 获取父章节的子章节列表
   */
  async findChildren(parentId: string): Promise<any[]> {
    const sql = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM chapters WHERE parentId = c.id) as child_count,
        (SELECT COUNT(*) FROM contents WHERE chapterId = c.id) as content_count_actual
      FROM chapters c
      WHERE c.parentId = ?
      ORDER BY c.orderIndex ASC
    `;

    const rows = this.all(sql, [parentId]);
    return rows.map(row => this.mapChapterRow(row));
  }

  /**
   * 获取作品的章节列表（实现接口方法，内部调用findByWorkId）
   */
  async findByWork(workId: string, includeChildren?: boolean): Promise<any[]> {
    return await this.findByWorkId(workId, {
      parentId: null,
      includeChildren
    });
  }

  /**
   * 更新父章节的子章节计数
   */
  private async updateParentChildCount(parentId: string): Promise<void> {
    const count = this.get(`
      SELECT COUNT(*) as count
      FROM chapters
      WHERE parentId = ?
    `, [parentId]) as any;

    this.run(`
      UPDATE chapters
      SET childChapterCount = ?, updatedAt = ?
      WHERE id = ?
    `, [count.count, this.now(), parentId]);
  }

  /**
   * 递归更新子章节的层级
   */
  private updateChildrenLevel(parentId: string, parentLevel: number): void {
    const children = this.all(`
      SELECT id FROM chapters WHERE parentId = ?
    `, [parentId]) as Array<{ id: string }>;

    const newLevel = parentLevel + 1;

    for (const child of children) {
      this.run(`
        UPDATE chapters
        SET level = ?, updatedAt = ?
        WHERE id = ?
      `, [newLevel, this.now(), child.id]);

      // 递归更新子章节的子章节
      this.updateChildrenLevel(child.id, newLevel);
    }
  }

  /**
   * 映射章节数据行
   */
  private mapChapterRow(row: any): any {
    return {
      id: row.id,
      workId: row.workId,
      parentId: row.parentId,
      level: row.level,
      orderIndex: row.orderIndex,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      type: row.type,
      status: row.status,
      wordCount: row.wordCount,
      characterCount: row.characterCount,
      contentCount: row.contentCount,
      childChapterCount: row.childChapterCount,
      progressPercentage: row.progressPercentage,
      targetWords: row.targetWords,
      authorId: row.authorId,
      storyTimelineStart: row.storyTimelineStart,
      storyTimelineEnd: row.storyTimelineEnd,
      tags: this.parseJson(row.tags),
      blockchainHash: row.blockchainHash,
      isPublic: this.toBoolean(row.isPublic),
      publishedAt: row.publishedAt,
      metadata: this.parseJson(row.metadata),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // 关联数据
      work: row.work_title ? { title: row.work_title } : undefined,
      author: row.author_name ? { username: row.author_name } : undefined,
      parent: row.parent_title ? { title: row.parent_title } : undefined,
      childCount: row.child_count || 0,
      _count: {
        contents: row.content_count_actual || 0,
        children: row.child_count || 0,
      },
    };
  }
}
