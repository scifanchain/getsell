/**
 * CR-SQLite 作品仓储实现
 * 实现 IWorkRepository 接口
 */

import { CRSQLiteBaseRepository } from './CRSQLiteBaseRepository';
import { CRSQLiteManager } from '../../core/crsqlite-manager';
import { IWorkRepository, WorkData, PaginationOptions, SortOptions } from '../interfaces';
import { ulid } from 'ulid';

export class CRSQLiteWorkRepository extends CRSQLiteBaseRepository implements IWorkRepository {
  constructor(manager: CRSQLiteManager) {
    super(manager);
  }

  /**
   * 创建新作品
   */
  async create(workData: WorkData & Record<string, any>): Promise<any> {
    const id = ulid();
    const now = this.now();

    const data = {
      id,
      title: workData.title,
      subtitle: workData.subtitle || null,
      description: workData.description || null,
      cover_image_url: workData.coverImageUrl || null,
      genre: workData.genre || null,
      tags: workData.tags ? this.toJson(workData.tags) : null,
      author_id: workData.authorId,
      collaboration_mode: workData.collaborationMode || 'solo',
      collaborators: workData.collaborators ? this.toJson(workData.collaborators) : null,
      status: workData.status || 'draft',
      progress_percentage: 0.0,
      total_words: 0,
      total_characters: 0,
      chapter_count: 0,
      target_words: workData.targetWords || null,
      target_completion_date: workData.targetCompletionDate || null,
      is_public: this.fromBoolean(workData.isPublic),
      license_type: workData.licenseType || 'all_rights_reserved',
      metadata: workData.metadata ? this.toJson(workData.metadata) : null,
      created_at: now,
      updated_at: now,
    };

    const { columns, placeholders, params } = this.buildInsertClause(data);

    const sql = `
      INSERT INTO works (${columns})
      VALUES (${placeholders})
    `;

    this.run(sql, params);

    return await this.findById(id);
  }

  /**
   * 根据ID查找作品
   */
  async findById(id: string): Promise<any | null> {
    const sql = `SELECT * FROM works WHERE id = ?`;
    const row = this.get(sql, [id]);
    
    if (!row) return null;

    const work = this.mapRow(row);
    
    // 加载关联的章节（仅顶级章节）
    work.chapters = await this.getChapters(id);
    
    // 加载作者信息
    work.author = await this.getAuthor(work.authorId);

    return work;
  }

  /**
   * 获取作者的作品列表
   */
  async findByAuthor(
    authorId: string,
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Promise<any[]> {
    const skip = pagination?.skip || 0;
    const take = pagination?.take || 50;
    const sortBy = sort?.field || 'updated_at';
    const sortOrder = sort?.direction || 'desc';

    const sql = `
      SELECT * FROM works 
      WHERE author_id = ? 
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    const rows = this.all(sql, [authorId, take, skip]);
    return this.mapRows(rows);
  }

  /**
   * 获取所有作品列表
   */
  async findAll(pagination?: PaginationOptions, sort?: SortOptions): Promise<any[]> {
    const skip = pagination?.skip || 0;
    const take = pagination?.take || 50;
    const sortBy = sort?.field || 'updated_at';
    const sortOrder = sort?.direction || 'desc';

    const sql = `
      SELECT * FROM works 
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    const rows = this.all(sql, [take, skip]);
    return this.mapRows(rows);
  }

  /**
   * 更新作品信息
   */
  async update(id: string, updateData: Partial<WorkData> & Record<string, any>): Promise<any> {
    const now = this.now();

    const data: Record<string, any> = {
      updated_at: now,
    };

    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.subtitle !== undefined) data.subtitle = updateData.subtitle;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.coverImageUrl !== undefined) data.cover_image_url = updateData.coverImageUrl;
    if (updateData.genre !== undefined) data.genre = updateData.genre;
    if (updateData.tags !== undefined) data.tags = this.toJson(updateData.tags);
    if (updateData.collaborationMode !== undefined) data.collaboration_mode = updateData.collaborationMode;
    if (updateData.collaborators !== undefined) data.collaborators = this.toJson(updateData.collaborators);
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.progressPercentage !== undefined) data.progress_percentage = updateData.progressPercentage;
    if (updateData.targetWords !== undefined) data.target_words = updateData.targetWords;
    if (updateData.targetCompletionDate !== undefined) data.target_completion_date = updateData.targetCompletionDate;
    if (updateData.isPublic !== undefined) data.is_public = this.fromBoolean(updateData.isPublic);
    if (updateData.licenseType !== undefined) data.license_type = updateData.licenseType;
    if (updateData.metadata !== undefined) data.metadata = this.toJson(updateData.metadata);

    const { sql: setClause, params: setParams } = this.buildSetClause(data);
    
    const sql = `UPDATE works SET ${setClause} WHERE id = ?`;
    const params = [...setParams, id];

    this.run(sql, params);

    return await this.findById(id);
  }

  /**
   * 删除作品（级联删除相关数据）
   */
  async delete(id: string): Promise<void> {
    return this.transaction(() => {
      // 删除关联的内容版本
      this.run(`
        DELETE FROM content_versions 
        WHERE content_id IN (SELECT id FROM contents WHERE work_id = ?)
      `, [id]);

      // 删除关联的内容
      this.run(`DELETE FROM contents WHERE work_id = ?`, [id]);

      // 删除关联的章节
      this.run(`DELETE FROM chapters WHERE work_id = ?`, [id]);

      // 删除协作文档
      this.run(`DELETE FROM collaborative_documents WHERE work_id = ?`, [id]);

      // 删除作品本身
      this.run(`DELETE FROM works WHERE id = ?`, [id]);
    });
  }

  /**
   * 搜索作品
   */
  async search(query: string, authorId?: string): Promise<any[]> {
    const searchPattern = `%${query}%`;
    
    let sql = `
      SELECT * FROM works 
      WHERE (title LIKE ? OR description LIKE ? OR genre LIKE ?)
    `;

    const params: any[] = [searchPattern, searchPattern, searchPattern];

    if (authorId) {
      sql += ` AND author_id = ?`;
      params.push(authorId);
    }

    sql += ` ORDER BY updated_at DESC LIMIT 100`;

    const rows = this.all(sql, params);
    return this.mapRows(rows);
  }

  /**
   * 获取作品统计信息
   */
  async getStats(id: string): Promise<{
    chapterCount: number;
    totalWords: number;
    totalCharacters: number;
  }> {
    const sql = `
      SELECT 
        chapter_count as chapterCount,
        total_words as totalWords,
        total_characters as totalCharacters
      FROM works 
      WHERE id = ?
    `;

    const stats = this.get(sql, [id]);
    
    return stats || {
      chapterCount: 0,
      totalWords: 0,
      totalCharacters: 0,
    };
  }

  /**
   * 更新作品统计信息
   */
  async updateStats(id: string): Promise<void> {
    return this.transaction(() => {
      // 计算章节数
      const chapterCount = this.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM chapters WHERE work_id = ?`,
        [id]
      )?.count || 0;

      // 计算总字数和字符数
      const stats = this.get<{ totalWords: number; totalCharacters: number }>(
        `
        SELECT 
          SUM(word_count) as totalWords,
          SUM(character_count) as totalCharacters
        FROM contents 
        WHERE work_id = ?
        `,
        [id]
      );

      const totalWords = stats?.totalWords || 0;
      const totalCharacters = stats?.totalCharacters || 0;

      // 更新作品统计
      this.run(
        `
        UPDATE works 
        SET chapter_count = ?, 
            total_words = ?, 
            total_characters = ?,
            updated_at = ?
        WHERE id = ?
        `,
        [chapterCount, totalWords, totalCharacters, this.now(), id]
      );
    });
  }

  /**
   * 获取作品的章节（仅顶级）
   */
  private async getChapters(workId: string): Promise<any[]> {
    const sql = `
      SELECT * FROM chapters 
      WHERE work_id = ? AND parent_id IS NULL
      ORDER BY order_index ASC
    `;

    const rows = this.all(sql, [workId]);
    return this.mapRows(rows);
  }

  /**
   * 获取作者信息
   */
  private async getAuthor(authorId: string): Promise<any> {
    const sql = `SELECT * FROM authors WHERE id = ?`;
    const row = this.get(sql, [authorId]);
    return row ? this.mapRow(row) : null;
  }

  /**
   * 获取协作者列表
   */
  async getCollaborators(id: string): Promise<any[]> {
    const work = await this.findById(id);
    if (!work || !work.collaborators) {
      return [];
    }

    const collaboratorIds = this.parseJson<string[]>(work.collaborators) || [];
    if (collaboratorIds.length === 0) {
      return [];
    }

    const placeholders = collaboratorIds.map(() => '?').join(',');
    const sql = `SELECT * FROM authors WHERE id IN (${placeholders})`;
    
    const rows = this.all(sql, collaboratorIds);
    return this.mapRows(rows);
  }

  /**
   * 添加协作者
   */
  async addCollaborator(workId: string, collaboratorId: string): Promise<void> {
    const work = await this.findById(workId);
    if (!work) {
      throw new Error('Work not found');
    }

    const collaborators = this.parseJson<string[]>(work.collaborators) || [];
    
    if (!collaborators.includes(collaboratorId)) {
      collaborators.push(collaboratorId);
      
      await this.update(workId, {
        collaborators: collaborators as any,
      });
    }
  }

  /**
   * 移除协作者
   */
  async removeCollaborator(workId: string, collaboratorId: string): Promise<void> {
    const work = await this.findById(workId);
    if (!work) {
      throw new Error('Work not found');
    }

    const collaborators = this.parseJson<string[]>(work.collaborators) || [];
    const newCollaborators = collaborators.filter(id => id !== collaboratorId);
    
    await this.update(workId, {
      collaborators: newCollaborators as any,
    });
  }
}
