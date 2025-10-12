/**
 * CR-SQLite 内容仓储实现
 * 实现 IContentRepository 接口
 */

import { CRSQLiteBaseRepository } from './CRSQLiteBaseRepository';
import { CRSQLiteManager } from '../../core/crsqlite-manager';
import { IContentRepository, ContentData, PaginationOptions } from '../interfaces';
import { ulid } from 'ulid';

export class CRSQLiteContentRepository extends CRSQLiteBaseRepository implements IContentRepository {
  constructor(manager: CRSQLiteManager) {
    super(manager);
  }

  /**
   * 创建新内容
   */
  async create(contentData: ContentData & Record<string, any>): Promise<any> {
    const id = contentData.id || ulid();
    const now = this.now();

    // 自动计算字数和字符数
    let wordCount = contentData.wordCount || 0;
    let characterCount = contentData.characterCount || 0;
    
    if (contentData.contentText && (!wordCount || !characterCount)) {
      wordCount = this.countWords(contentData.contentText);
      characterCount = contentData.contentText.length;
    }

    const data = {
      id,
      work_id: contentData.workId,
      chapter_id: contentData.chapterId || null,
      type: contentData.type || 'text',
      content_json: contentData.contentText 
        ? this.toJson({ text: contentData.contentText }) 
        : (contentData.prosemirrorJson ? this.toJson(contentData.prosemirrorJson) : null),
      order_index: contentData.orderIndex || 0,
      word_count: wordCount,
      character_count: characterCount,
      author_id: contentData.authorId,
      version: contentData.versionNumber || 1,
      tags: contentData.tags ? this.toJson(contentData.tags) : null,
      metadata: contentData.metadata ? this.toJson(contentData.metadata) : null,
      created_at: now,
      updated_at: now,
    };

    const { columns, placeholders, params } = this.buildInsertClause(data);

    const sql = `
      INSERT INTO contents (${columns})
      VALUES (${placeholders})
    `;

    this.run(sql, params);

    // 更新章节统计
    if (data.chapter_id) {
      await this.updateChapterStats(data.chapter_id);
    }

    return await this.findById(id);
  }

  /**
   * 根据ID查找内容
   */
  async findById(id: string): Promise<any | null> {
    const sql = `
      SELECT 
        c.*,
        w.title as work_title,
        ch.title as chapter_title,
        a.username as author_name
      FROM contents c
      LEFT JOIN works w ON c.work_id = w.id
      LEFT JOIN chapters ch ON c.chapter_id = ch.id
      LEFT JOIN authors a ON c.author_id = a.id
      WHERE c.id = ?
    `;

    const row = this.get(sql, [id]);
    if (!row) return null;

    return this.mapContentRow(row);
  }

  /**
   * 获取作品的内容列表
   */
  async findByWork(workId: string, chapterId?: string | null, pagination?: PaginationOptions): Promise<any[]> {
    let sql = `
      SELECT 
        c.*,
        ch.title as chapter_title,
        a.username as author_name
      FROM contents c
      LEFT JOIN chapters ch ON c.chapter_id = ch.id
      LEFT JOIN authors a ON c.author_id = a.id
      WHERE c.work_id = ?
    `;

    const params: any[] = [workId];

    // 章节筛选
    if (chapterId !== undefined) {
      if (chapterId === null) {
        sql += ` AND c.chapter_id IS NULL`;
      } else {
        sql += ` AND c.chapter_id = ?`;
        params.push(chapterId);
      }
    }

    // 排序
    sql += ` ORDER BY c.order_index ASC`;

    // 分页
    if (pagination?.take) {
      const skip = pagination.skip || 0;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(pagination.take, skip);
    }

    const rows = this.all(sql, params);
    return rows.map(row => this.mapContentRow(row));
  }

  /**
   * 获取章节的内容列表
   */
  async findByChapter(chapterId: string, pagination?: PaginationOptions): Promise<any[]> {
    let sql = `
      SELECT 
        c.*,
        w.title as work_title,
        a.username as author_name
      FROM contents c
      LEFT JOIN works w ON c.work_id = w.id
      LEFT JOIN authors a ON c.author_id = a.id
      WHERE c.chapter_id = ?
      ORDER BY c.order_index ASC
    `;

    const params: any[] = [chapterId];

    // 分页
    if (pagination?.take) {
      const skip = pagination.skip || 0;
      sql += ` LIMIT ? OFFSET ?`;
      params.push(pagination.take, skip);
    }

    const rows = this.all(sql, params);
    return rows.map(row => this.mapContentRow(row));
  }

  /**
   * 更新内容
   */
  async update(id: string, updateData: Partial<ContentData> & Record<string, any>): Promise<any> {
    const now = this.now();

    const data: Record<string, any> = {
      updated_at: now,
    };

    // 只更新提供的字段
    if (updateData.contentText !== undefined) {
      // contentText 是纯文本,不需要 parseJson
      data.content_json = this.toJson({ text: updateData.contentText });
      // 自动统计字数
      data.word_count = this.countWords(updateData.contentText);
      data.character_count = updateData.contentText.length;
    }
    if (updateData.prosemirrorJson !== undefined) data.content_json = this.toJson(updateData.prosemirrorJson);
    if (updateData.type !== undefined) data.type = updateData.type;
    if (updateData.orderIndex !== undefined) data.order_index = updateData.orderIndex;
    if (updateData.wordCount !== undefined) data.word_count = updateData.wordCount;
    if (updateData.characterCount !== undefined) data.character_count = updateData.characterCount;
    if (updateData.tags !== undefined) data.tags = this.toJson(updateData.tags);
    if (updateData.metadata !== undefined) data.metadata = this.toJson(updateData.metadata);

    const { sql: setClause, params } = this.buildSetClause(data);

    const sql = `
      UPDATE contents
      SET ${setClause}
      WHERE id = ?
    `;

    this.run(sql, [...params, id]);

    // 获取更新后的内容
    const content = await this.findById(id);

    // 更新章节统计
    if (content?.chapterId) {
      await this.updateChapterStats(content.chapterId);
    }

    return content;
  }

  /**
   * 删除内容
   */
  async delete(id: string): Promise<void> {
    // 获取内容信息(用于更新统计)
    const content = await this.findById(id);

    // 删除相关的版本历史
    this.run('DELETE FROM content_versions WHERE content_id = ?', [id]);

    // 删除内容本身
    this.run('DELETE FROM contents WHERE id = ?', [id]);

    // 更新章节统计
    if (content?.chapterId) {
      await this.updateChapterStats(content.chapterId);
    }
  }

  /**
   * 重新排序内容
   */
  async reorder(workId: string, chapterId: string | null, contentOrders: Array<{ id: string; orderIndex: number }>): Promise<void> {
    this.transaction(() => {
      for (const { id, orderIndex } of contentOrders) {
        const params: any[] = [orderIndex, this.now(), id, workId];
        
        let sql = `
          UPDATE contents
          SET order_index = ?, updated_at = ?
          WHERE id = ? AND work_id = ?
        `;

        if (chapterId !== null) {
          sql += ` AND chapter_id = ?`;
          params.push(chapterId);
        } else {
          sql += ` AND chapter_id IS NULL`;
        }

        this.run(sql, params);
      }
    });
  }

  /**
   * 搜索内容
   */
  async search(workId: string, query: string, chapterId?: string): Promise<any[]> {
    let sql = `
      SELECT 
        c.*,
        ch.title as chapter_title,
        a.username as author_name
      FROM contents c
      LEFT JOIN chapters ch ON c.chapter_id = ch.id
      LEFT JOIN authors a ON c.author_id = a.id
      WHERE c.work_id = ?
        AND c.content_json LIKE ?
    `;

    const params: any[] = [workId, `%${query}%`];

    if (chapterId) {
      sql += ` AND c.chapter_id = ?`;
      params.push(chapterId);
    }

    sql += ` ORDER BY c.order_index ASC`;

    const rows = this.all(sql, params);
    return rows.map(row => this.mapContentRow(row));
  }

  /**
   * 获取内容的版本历史
   */
  async getVersionHistory(contentId: string): Promise<any[]> {
    const sql = `
      SELECT 
        cv.*,
        a.username as author_name
      FROM content_versions cv
      LEFT JOIN authors a ON cv.author_id = a.id
      WHERE cv.content_id = ?
      ORDER BY cv.version_number DESC
    `;

    const rows = this.all(sql, [contentId]);
    return rows.map(row => this.mapVersionRow(row));
  }

  /**
   * 创建内容版本
   */
  async createVersion(contentId: string, versionData: any): Promise<any> {
    const content = await this.findById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    const id = ulid();
    const now = this.now();

    // 获取最新版本号
    const lastVersion = this.get(`
      SELECT MAX(version_number) as max_version
      FROM content_versions
      WHERE content_id = ?
    `, [contentId]) as any;

    const versionNumber = (lastVersion?.max_version || 0) + 1;

    // 提取文本内容
    const extractTextFromJson = (json: any): string => {
      if (!json) return '';
      if (typeof json === 'string') {
        try {
          const obj = JSON.parse(json);
          return obj.text || JSON.stringify(obj);
        } catch {
          return json;
        }
      }
      return json.text || JSON.stringify(json);
    };

    const data = {
      id,
      content_id: contentId,
      version_number: versionNumber,
      content_json: versionData.contentText 
        ? this.toJson({ text: versionData.contentText })
        : (versionData.prosemirrorJson ? this.toJson(versionData.prosemirrorJson) : (typeof content.contentJson === 'string' ? content.contentJson : this.toJson(content.contentJson))),
      content_text: versionData.contentText || extractTextFromJson(content.contentJson),
      word_count: versionData.wordCount || content.wordCount,
      character_count: versionData.characterCount || content.characterCount,
      author_id: versionData.authorId || content.authorId,
      change_summary: versionData.changeDescription || null,
      created_at: now,
    };

    const { columns, placeholders, params } = this.buildInsertClause(data);

    const sql = `
      INSERT INTO content_versions (${columns})
      VALUES (${placeholders})
    `;

    this.run(sql, params);

    // 更新内容的版本号
    this.run(`
      UPDATE contents
      SET version = ?, updated_at = ?
      WHERE id = ?
    `, [versionNumber, now, contentId]);

    return await this.getVersionById(id);
  }

  /**
   * 根据ID获取版本信息
   */
  private async getVersionById(id: string): Promise<any | null> {
    const sql = `
      SELECT 
        cv.*,
        a.username as author_name
      FROM content_versions cv
      LEFT JOIN authors a ON cv.author_id = a.id
      WHERE cv.id = ?
    `;

    const row = this.get(sql, [id]);
    if (!row) return null;

    return this.mapVersionRow(row);
  }

  /**
   * 更新章节统计信息
   */
  private async updateChapterStats(chapterId: string): Promise<void> {
    const stats = this.get(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(word_count), 0) as total_words,
        COALESCE(SUM(character_count), 0) as total_chars
      FROM contents
      WHERE chapter_id = ?
    `, [chapterId]) as any;

    this.run(`
      UPDATE chapters
      SET 
        content_count = ?,
        word_count = ?,
        character_count = ?,
        updated_at = ?
      WHERE id = ?
    `, [stats.count, stats.total_words, stats.total_chars, this.now(), chapterId]);
  }

  /**
   * 统计字数（简单实现，可根据需要优化）
   */
  private countWords(text: string): number {
    if (!text) return 0;
    
    // 中文字符数
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
    const chineseCount = chineseChars ? chineseChars.length : 0;
    
    // 英文单词数
    const englishWords = text.match(/[a-zA-Z]+/g);
    const englishCount = englishWords ? englishWords.length : 0;
    
    return chineseCount + englishCount;
  }

  /**
   * 从 JSON 中提取文本内容
   */
  private extractTextFromJson(json: string | null): string {
    if (!json) return '';
    try {
      const obj = JSON.parse(json);
      return obj.text || JSON.stringify(obj);
    } catch {
      return json;
    }
  }

  /**
   * 映射内容数据行
   */
  private mapContentRow(row: any): any {
    const contentJson = this.parseJson(row.content_json);
    const contentText = contentJson?.text || '';
    
    return {
      id: row.id,
      workId: row.work_id,
      chapterId: row.chapter_id,
      type: row.type,
      contentText: contentText,
      contentJson: contentJson,
      prosemirrorJson: contentJson,
      orderIndex: row.order_index,
      wordCount: row.word_count,
      characterCount: row.character_count,
      authorId: row.author_id,
      versionNumber: row.version,
      tags: this.parseJson(row.tags),
      metadata: this.parseJson(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // 关联数据
      work: row.work_title ? { title: row.work_title } : undefined,
      chapter: row.chapter_title ? { title: row.chapter_title } : undefined,
      author: row.author_name ? { username: row.author_name } : undefined,
    };
  }

  /**
   * 映射版本数据行
   */
  private mapVersionRow(row: any): any {
    const contentJson = this.parseJson(row.content_json);
    
    return {
      id: row.id,
      contentId: row.content_id,
      versionNumber: row.version_number,
      contentText: row.content_text,
      contentJson: contentJson,
      prosemirrorJson: contentJson,
      wordCount: row.word_count,
      characterCount: row.character_count,
      authorId: row.author_id,
      changeDescription: row.change_summary,
      createdAt: row.created_at,
      // 关联数据
      author: row.author_name ? { username: row.author_name } : undefined,
    };
  }
}
