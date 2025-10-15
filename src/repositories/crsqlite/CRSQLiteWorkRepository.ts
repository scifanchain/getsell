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
      coverImageUrl: workData.coverImageUrl || null,
      genre: workData.genre || null,
      tags: workData.tags ? this.toJson(workData.tags) : null,
      authorId: workData.authorId,
      collaborationMode: workData.collaborationMode || 'solo',
      collaborators: workData.collaborators ? this.toJson(workData.collaborators) : null,
      status: workData.status || 'draft',
      progressPercentage: 0.0,
      totalWords: 0,
      totalCharacters: 0,
      chapterCount: 0,
      targetWords: workData.targetWords || null,
      targetCompletionDate: workData.targetCompletionDate || null,
      isPublic: this.fromBoolean(workData.isPublic),
      licenseType: workData.licenseType || 'all_rights_reserved',
      metadata: workData.metadata ? this.toJson(workData.metadata) : null,
      createdAt: now,
      updatedAt: now,
    };

    const { columns, placeholders, params } = this.buildInsertClause(data);

    const sql = `
      INSERT INTO works (${columns})
      VALUES (${placeholders})
    `;

    this.transaction(() => {
      this.run(sql, params);
    });

    // 事务完成后查询结果
    return this.findById(id);
  }

  /**
   * 根据ID查找作品
   */
  async findById(id: string): Promise<any> {
    const sql = `
      SELECT w.*, a.username as authorUsername, a.displayName as authorDisplayName
      FROM works w
      LEFT JOIN authors a ON w.authorId = a.id
      WHERE w.id = ?
    `;
    
    const row = this.get(sql, [id]);
    return row ? this.mapJoinedRow(row) : null;
  }

  /**
   * 根据作者ID查找作品
   */
  async findByAuthor(authorId: string, pagination?: PaginationOptions, sort?: SortOptions): Promise<any[]> {
    const skip = pagination?.skip || 0;
    const take = pagination?.take || 50;
    
    let sortBy = sort?.field || 'w.updatedAt';
    if (sortBy === 'updatedAt') sortBy = 'w.updatedAt';
    if (sortBy === 'createdAt') sortBy = 'w.createdAt';
    if (sortBy === 'authorId') sortBy = 'w.authorId';
    const sortOrder = sort?.direction || 'desc';

    const sql = `
      SELECT w.*, a.username as authorUsername, a.displayName as authorDisplayName
      FROM works w
      LEFT JOIN authors a ON w.authorId = a.id
      WHERE w.authorId = ?
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const rows = this.all(sql, [authorId, take, skip]);
    return this.mapJoinedRows(rows);
  }

  /**
   * 获取所有作品列表
   */
  async findAll(pagination?: PaginationOptions, sort?: SortOptions): Promise<any[]> {
    const skip = pagination?.skip || 0;
    const take = pagination?.take || 50;
    
    let sortBy = sort?.field || 'w.updatedAt';
    if (sortBy === 'updatedAt') sortBy = 'w.updatedAt';
    if (sortBy === 'createdAt') sortBy = 'w.createdAt';
    if (sortBy === 'authorId') sortBy = 'w.authorId';
    const sortOrder = sort?.direction || 'desc';

    const sql = `
      SELECT w.*, a.username as authorUsername, a.displayName as authorDisplayName
      FROM works w
      LEFT JOIN authors a ON w.authorId = a.id
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const rows = this.all(sql, [take, skip]);
    return this.mapJoinedRows(rows);
  }

  /**
   * 更新作品
   */
  async update(id: string, updateData: Partial<WorkData> & Record<string, any>): Promise<any> {
    const now = this.now();

    const data: Record<string, any> = {
      updatedAt: now,
    };

    // 映射更新字段
    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.subtitle !== undefined) data.subtitle = updateData.subtitle;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.coverImageUrl !== undefined) data.coverImageUrl = updateData.coverImageUrl;
    if (updateData.genre !== undefined) data.genre = updateData.genre;
    if (updateData.tags !== undefined) data.tags = updateData.tags ? this.toJson(updateData.tags) : null;
    if (updateData.collaborationMode !== undefined) data.collaborationMode = updateData.collaborationMode;
    if (updateData.collaborators !== undefined) data.collaborators = updateData.collaborators ? this.toJson(updateData.collaborators) : null;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.progressPercentage !== undefined) data.progressPercentage = updateData.progressPercentage;
    if (updateData.totalWords !== undefined) data.totalWords = updateData.totalWords;
    if (updateData.totalCharacters !== undefined) data.totalCharacters = updateData.totalCharacters;
    if (updateData.chapterCount !== undefined) data.chapterCount = updateData.chapterCount;
    if (updateData.targetWords !== undefined) data.targetWords = updateData.targetWords;
    if (updateData.targetCompletionDate !== undefined) data.targetCompletionDate = updateData.targetCompletionDate;
    if (updateData.isPublic !== undefined) data.isPublic = this.fromBoolean(updateData.isPublic);
    if (updateData.licenseType !== undefined) data.licenseType = updateData.licenseType;
    if (updateData.metadata !== undefined) data.metadata = updateData.metadata ? this.toJson(updateData.metadata) : null;

    const { sql: setClause, params } = this.buildSetClause(data);
    params.push(id);

    const sql = `UPDATE works SET ${setClause} WHERE id = ?`;

    this.transaction(() => {
      this.run(sql, params);
    });

    // 事务完成后查询结果
    return this.findById(id);
  }

  /**
   * 删除作品
   */
  async delete(id: string): Promise<void> {
    return this.transaction(() => {
      // 先删除相关的章节内容
      this.run(`
        DELETE FROM contents 
        WHERE chapterId IN (
          SELECT id FROM chapters WHERE workId = ?
        )
      `, [id]);

      // 删除章节
      this.run('DELETE FROM chapters WHERE workId = ?', [id]);

      // 删除作品
      this.run('DELETE FROM works WHERE id = ?', [id]);
    });
  }

  /**
   * 搜索作品
   */
  async search(query: string, authorId?: string): Promise<any[]> {
    const searchPattern = `%${query}%`;

    let sql = `
      SELECT w.*, a.username as authorUsername, a.displayName as authorDisplayName
      FROM works w
      LEFT JOIN authors a ON w.authorId = a.id
      WHERE (w.title LIKE ? OR w.description LIKE ? OR w.genre LIKE ?)
    `;
    
    const params: any[] = [searchPattern, searchPattern, searchPattern];

    if (authorId) {
      sql += ` AND w.authorId = ?`;
      params.push(authorId);
    }

    sql += ` ORDER BY w.updatedAt DESC LIMIT 100`;

    const rows = this.all(sql, params);
    return this.mapJoinedRows(rows);
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
        chapterCount,
        totalWords,
        totalCharacters
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
   * 映射联合查询结果
   */
  private mapJoinedRows(rows: any[]): any[] {
    return rows.map(row => this.mapJoinedRow(row));
  }

  /**
   * 映射单个联合查询结果
   */
  private mapJoinedRow(row: any): any {
    const work = this.mapRow(row);
    
    // 添加作者信息
    if (row.authorUsername) {
      work.author = {
        id: work.authorId,
        username: row.authorUsername,
        displayName: row.authorDisplayName,
      };
    } else {
      work.author = null;
    }

    return work;
  }
}