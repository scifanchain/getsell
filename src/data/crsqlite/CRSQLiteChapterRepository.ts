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
      work_id: chapterData.workId,
      parent_id: chapterData.parentId || null,
      level: chapterData.level || 1,
      order_index: chapterData.orderIndex || 0,
      title: chapterData.title,
      subtitle: chapterData.subtitle || null,
      description: chapterData.description || null,
      type: chapterData.type || 'chapter',
      status: chapterData.status || 'draft',
      word_count: 0,
      character_count: 0,
      content_count: 0,
      child_chapter_count: 0,
      progress_percentage: 0.0,
      target_words: chapterData.targetWords || null,
      author_id: chapterData.authorId,
      story_timeline_start: chapterData.storyTimelineStart || null,
      story_timeline_end: chapterData.storyTimelineEnd || null,
      tags: chapterData.tags ? this.toJson(chapterData.tags) : null,
      blockchain_hash: chapterData.blockchainHash || null,
      is_public: this.fromBoolean(chapterData.isPublic),
      published_at: chapterData.publishedAt || null,
      metadata: chapterData.metadata ? this.toJson(chapterData.metadata) : null,
      created_at: now,
      updated_at: now,
    };

    const { columns, placeholders, params } = this.buildInsertClause(data);

    const sql = `
      INSERT INTO chapters (${columns})
      VALUES (${placeholders})
    `;

    this.run(sql, params);

    // 如果有父章节,更新父章节的子章节数
    if (data.parent_id) {
      await this.updateParentChildCount(data.parent_id);
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
        (SELECT COUNT(*) FROM chapters WHERE parent_id = c.id) as child_count,
        (SELECT COUNT(*) FROM contents WHERE chapter_id = c.id) as content_count_actual
      FROM chapters c
      LEFT JOIN works w ON c.work_id = w.id
      LEFT JOIN authors a ON c.author_id = a.id
      LEFT JOIN chapters pc ON c.parent_id = pc.id
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
        (SELECT COUNT(*) FROM chapters WHERE parent_id = c.id) as child_count,
        (SELECT COUNT(*) FROM contents WHERE chapter_id = c.id) as content_count_actual
      FROM chapters c
      WHERE c.work_id = ?
    `;

    const params: any[] = [workId];

    // 如果指定了父章节,只查询该父章节的子章节
    if (options?.parentId !== undefined) {
      if (options.parentId === null) {
        sql += ` AND c.parent_id IS NULL`;
      } else {
        sql += ` AND c.parent_id = ?`;
        params.push(options.parentId);
      }
    }

    sql += ` ORDER BY c.order_index ASC`;

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
      updated_at: now,
    };

    // 只更新提供的字段
    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.subtitle !== undefined) data.subtitle = updateData.subtitle;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.type !== undefined) data.type = updateData.type;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.orderIndex !== undefined) data.order_index = updateData.orderIndex;
    if (updateData.level !== undefined) data.level = updateData.level;
    if (updateData.targetWords !== undefined) data.target_words = updateData.targetWords;
    if (updateData.storyTimelineStart !== undefined) data.story_timeline_start = updateData.storyTimelineStart;
    if (updateData.storyTimelineEnd !== undefined) data.story_timeline_end = updateData.storyTimelineEnd;
    if (updateData.tags !== undefined) data.tags = this.toJson(updateData.tags);
    if (updateData.isPublic !== undefined) data.is_public = this.fromBoolean(updateData.isPublic);
    if (updateData.publishedAt !== undefined) data.published_at = updateData.publishedAt;
    if (updateData.metadata !== undefined) data.metadata = this.toJson(updateData.metadata);
    if (updateData.blockchainHash !== undefined) data.blockchain_hash = updateData.blockchainHash;

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
    this.run('DELETE FROM contents WHERE chapter_id = ?', [id]);

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
        COALESCE(SUM(word_count), 0) as total_words,
        COALESCE(SUM(character_count), 0) as total_chars
      FROM contents
      WHERE chapter_id = ?
    `, [id]) as any;

    // 统计子章节数量
    const childCount = this.get(`
      SELECT COUNT(*) as count
      FROM chapters
      WHERE parent_id = ?
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
        content_count = ?,
        child_chapter_count = ?,
        word_count = ?,
        character_count = ?,
        progress_percentage = ?,
        updated_at = ?
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
          SET order_index = ?, updated_at = ?
          WHERE id = ? AND work_id = ?
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
          SET parent_id = ?, order_index = ?, level = ?, updated_at = ?
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
        SET parent_id = ?, level = ?, order_index = ?, updated_at = ?
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
        (SELECT COUNT(*) FROM chapters WHERE parent_id = c.id) as child_count,
        (SELECT COUNT(*) FROM contents WHERE chapter_id = c.id) as content_count_actual
      FROM chapters c
      WHERE c.parent_id = ?
      ORDER BY c.order_index ASC
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
      WHERE parent_id = ?
    `, [parentId]) as any;

    this.run(`
      UPDATE chapters
      SET child_chapter_count = ?, updated_at = ?
      WHERE id = ?
    `, [count.count, this.now(), parentId]);
  }

  /**
   * 递归更新子章节的层级
   */
  private updateChildrenLevel(parentId: string, parentLevel: number): void {
    const children = this.all(`
      SELECT id FROM chapters WHERE parent_id = ?
    `, [parentId]) as Array<{ id: string }>;

    const newLevel = parentLevel + 1;

    for (const child of children) {
      this.run(`
        UPDATE chapters
        SET level = ?, updated_at = ?
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
      workId: row.work_id,
      parentId: row.parent_id,
      level: row.level,
      orderIndex: row.order_index,
      title: row.title,
      subtitle: row.subtitle,
      description: row.description,
      type: row.type,
      status: row.status,
      wordCount: row.word_count,
      characterCount: row.character_count,
      contentCount: row.content_count,
      childChapterCount: row.child_chapter_count,
      progressPercentage: row.progress_percentage,
      targetWords: row.target_words,
      authorId: row.author_id,
      storyTimelineStart: row.story_timeline_start,
      storyTimelineEnd: row.story_timeline_end,
      tags: this.parseJson(row.tags),
      blockchainHash: row.blockchain_hash,
      isPublic: this.toBoolean(row.is_public),
      publishedAt: row.published_at,
      metadata: this.parseJson(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
