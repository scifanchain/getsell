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
      workId: contentData.workId,
      chapterId: contentData.chapterId || null,
      title: contentData.title || null,
      type: contentData.type || 'text',
      contentJson: contentData.contentText 
        ? this.toJson({ text: contentData.contentText }) 
        : (contentData.prosemirrorJson ? this.toJson(contentData.prosemirrorJson) : null),
      orderIndex: contentData.orderIndex || 0,
      wordCount: wordCount,
      characterCount: characterCount,
      authorId: contentData.authorId,
      version: contentData.versionNumber || 1,
      tags: contentData.tags ? this.toJson(contentData.tags) : null,
      metadata: contentData.metadata ? this.toJson(contentData.metadata) : null,
      createdAt: now,
      updatedAt: now,
    };

    const { columns, placeholders, params } = this.buildInsertClause(data);

    const sql = `
      INSERT INTO contents (${columns})
      VALUES (${placeholders})
    `;

    this.run(sql, params);

    // 更新章节统计
    if (data.chapterId) {
      await this.updateChapterStats(data.chapterId);
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
      LEFT JOIN works w ON c.workId = w.id
      LEFT JOIN chapters ch ON c.chapterId = ch.id
      LEFT JOIN authors a ON c.authorId = a.id
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
      LEFT JOIN chapters ch ON c.chapterId = ch.id
      LEFT JOIN authors a ON c.authorId = a.id
      WHERE c.workId = ?
    `;

    const params: any[] = [workId];

    // 章节筛选
    if (chapterId !== undefined) {
      if (chapterId === null) {
        sql += ` AND c.chapterId IS NULL`;
      } else {
        sql += ` AND c.chapterId = ?`;
        params.push(chapterId);
      }
    }

    // 排序
    sql += ` ORDER BY c.orderIndex ASC`;

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
      LEFT JOIN works w ON c.workId = w.id
      LEFT JOIN authors a ON c.authorId = a.id
      WHERE c.chapterId = ?
      ORDER BY c.orderIndex ASC
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
      updatedAt: now,
    };

    // 只更新提供的字段
    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.chapterId !== undefined) data.chapterId = updateData.chapterId;
    if (updateData.contentText !== undefined) {
      // contentText 是纯文本,不需要 parseJson
      data.contentJson = this.toJson({ text: updateData.contentText });
      // 自动统计字数
      data.wordCount = this.countWords(updateData.contentText);
      data.characterCount = updateData.contentText.length;
    }
    if (updateData.contentJson !== undefined) {
      // ProseMirror JSON 内容
      data.contentJson = updateData.contentJson;
    }
    if (updateData.contentHtml !== undefined) data.contentHtml = updateData.contentHtml;
    if (updateData.prosemirrorJson !== undefined) data.contentJson = this.toJson(updateData.prosemirrorJson);
    if (updateData.type !== undefined) data.type = updateData.type;
    if (updateData.orderIndex !== undefined) data.orderIndex = updateData.orderIndex;
    if (updateData.wordCount !== undefined) data.wordCount = updateData.wordCount;
    if (updateData.characterCount !== undefined) data.characterCount = updateData.characterCount;
    if (updateData.tags !== undefined) data.tags = this.toJson(updateData.tags);
    if (updateData.metadata !== undefined) data.metadata = this.toJson(updateData.metadata);
    
    // 处理 version 字段 - 确保始终是有效的数字
    if (updateData.version !== undefined && typeof updateData.version === 'number' && !isNaN(updateData.version)) {
      data.version = updateData.version;
    } else {
      // 如果没有提供有效的 version，获取当前 version 并递增
      const currentContent = await this.findById(id);
      if (currentContent) {
        const currentVersion = currentContent.version || currentContent.versionNumber || 1;
        data.version = (typeof currentVersion === 'number' && !isNaN(currentVersion)) ? currentVersion + 1 : 1;
      } else {
        data.version = 1;
      }
    }

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
    this.run('DELETE FROM contentVersions WHERE contentId = ?', [id]);

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
          SET orderIndex = ?, updatedAt = ?
          WHERE id = ? AND workId = ?
        `;

        if (chapterId !== null) {
          sql += ` AND chapterId = ?`;
          params.push(chapterId);
        } else {
          sql += ` AND chapterId IS NULL`;
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
      LEFT JOIN chapters ch ON c.chapterId = ch.id
      LEFT JOIN authors a ON c.authorId = a.id
      WHERE c.workId = ?
        AND c.contentJson LIKE ?
    `;

    const params: any[] = [workId, `%${query}%`];

    if (chapterId) {
      sql += ` AND c.chapterId = ?`;
      params.push(chapterId);
    }

    sql += ` ORDER BY c.orderIndex ASC`;

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
      FROM contentVersions cv
      LEFT JOIN authors a ON cv.authorId = a.id
      WHERE cv.contentId = ?
      ORDER BY cv.versionNumber DESC
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
      SELECT MAX(versionNumber) as max_version
      FROM contentVersions
      WHERE contentId = ?
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
      contentId: contentId,
      versionNumber: versionNumber,
      contentJson: versionData.contentText 
        ? this.toJson({ text: versionData.contentText })
        : (versionData.prosemirrorJson ? this.toJson(versionData.prosemirrorJson) : (typeof content.contentJson === 'string' ? content.contentJson : this.toJson(content.contentJson))),
      contentText: versionData.contentText || extractTextFromJson(content.contentJson),
      wordCount: versionData.wordCount || content.wordCount,
      characterCount: versionData.characterCount || content.characterCount,
      authorId: versionData.authorId || content.authorId,
      changeSummary: versionData.changeDescription || null,
      createdAt: now,
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
      FROM contentVersions cv
      LEFT JOIN authors a ON cv.authorId = a.id
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
        COALESCE(SUM(wordCount), 0) as total_words,
        COALESCE(SUM(characterCount), 0) as total_chars
      FROM contents
      WHERE chapterId = ?
    `, [chapterId]) as any;

    this.run(`
      UPDATE chapters
      SET 
        contentCount = ?,
        wordCount = ?,
        characterCount = ?,
        updatedAt = ?
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
    const contentJson = this.parseJson(row.contentJson);
    const contentText = contentJson?.text || '';
    
    return {
      id: row.id,
      workId: row.workId,
      chapterId: row.chapterId,
      title: row.title,
      type: row.type,
      contentText: contentText,
      contentJson: contentJson,
      prosemirrorJson: contentJson,
      orderIndex: row.orderIndex,
      wordCount: row.wordCount,
      characterCount: row.characterCount,
      authorId: row.authorId,
      versionNumber: row.version,
      tags: this.parseJson(row.tags),
      metadata: this.parseJson(row.metadata),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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
    const contentJson = this.parseJson(row.contentJson);
    
    return {
      id: row.id,
      contentId: row.contentId,
      versionNumber: row.versionNumber,
      contentText: row.contentText,
      contentJson: contentJson,
      prosemirrorJson: contentJson,
      wordCount: row.wordCount,
      characterCount: row.characterCount,
      authorId: row.authorId,
      changeDescription: row.changeSummary,
      createdAt: row.createdAt,
      // 关联数据
      author: row.author_name ? { username: row.author_name } : undefined,
    };
  }
}
