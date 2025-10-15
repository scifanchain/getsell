/**
 * CR-SQLite 作者仓储实现
 * 实现 IAuthorRepository 接口
 */

import { CRSQLiteBaseRepository } from './CRSQLiteBaseRepository';
import { CRSQLiteManager } from '../../core/crsqlite-manager';
import { IAuthorRepository, AuthorData } from '../interfaces';
import { ulid } from 'ulid';

export class CRSQLiteAuthorRepository extends CRSQLiteBaseRepository implements IAuthorRepository {
  constructor(manager: CRSQLiteManager) {
    super(manager);
  }

  /**
   * 创建新作者
   */
  async create(authorData: AuthorData & Record<string, any>): Promise<any> {
    const id = authorData.id || ulid();
    const now = this.now();

    const data = {
      id,
      username: authorData.username,
      passwordHash: authorData.passwordHash || null,
      displayName: authorData.displayName || authorData.username,
      email: authorData.email || null,
      bio: authorData.bio || null,
      avatarUrl: authorData.avatarUrl || null,
      walletAddress: authorData.walletAddress || null,
      publicKey: authorData.publicKey || null,
      privateKeyEncrypted: authorData.privateKeyEncrypted || null,
      totalWorks: 0,
      totalWords: 0,
      status: 'active',
      preferences: authorData.preferences ? this.toJson(authorData.preferences) : null,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const { columns, placeholders, params } = this.buildInsertClause(data);

    const sql = `
      INSERT INTO authors (${columns})
      VALUES (${placeholders})
    `;

    this.run(sql, params);

    return await this.findById(id);
  }

  /**
   * 根据ID查找作者
   */
  async findById(id: string): Promise<any | null> {
    const sql = `
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM works WHERE authorId = a.id) as works_count,
        (SELECT COUNT(*) FROM chapters WHERE authorId = a.id) as chapters_count,
        (SELECT COUNT(*) FROM contents WHERE authorId = a.id) as contents_count
      FROM authors a
      WHERE a.id = ?
    `;

    const row = this.get(sql, [id]);
    if (!row) return null;

    const user = this.mapRow(row);
    
    // 添加最近的作品
    user.works = await this.getRecentWorks(id, 5);
    user._count = {
      works: user.worksCount || 0,
      chapters: user.chaptersCount || 0,
      contents: user.contentsCount || 0,
    };

    // 清理计数字段
    delete user.worksCount;
    delete user.chaptersCount;
    delete user.contentsCount;

    return user;
  }

  /**
   * 根据用户名查找作者
   */
  async findByUsername(username: string): Promise<any | null> {
    if (!username) {
      throw new Error('用户名参数不能为空');
    }

    const sql = `SELECT * FROM authors WHERE username = ?`;
    const row = this.get(sql, [username]);
    
    return row ? this.mapRow(row) : null;
  }

  /**
   * 根据邮箱查找作者
   */
  async findByEmail(email: string): Promise<any | null> {
    if (!email) {
      throw new Error('邮箱参数不能为空');
    }

    const sql = `SELECT * FROM authors WHERE email = ?`;
    const row = this.get(sql, [email]);
    
    return row ? this.mapRow(row) : null;
  }

  /**
   * 更新作者信息
   */
  async update(id: string, updateData: Partial<AuthorData> & Record<string, any>): Promise<any> {
    const now = this.now();

    // 构建更新数据
    const data: Record<string, any> = {
      updatedAt: now,
    };

    if (updateData.displayName !== undefined) data.displayName = updateData.displayName;
    if (updateData.email !== undefined) data.email = updateData.email;
    if (updateData.bio !== undefined) data.bio = updateData.bio;
    if (updateData.avatarUrl !== undefined) data.avatarUrl = updateData.avatarUrl;
    if (updateData.walletAddress !== undefined) data.walletAddress = updateData.walletAddress;
    if (updateData.publicKey !== undefined) data.publicKey = updateData.publicKey;
    if (updateData.privateKeyEncrypted !== undefined) data.privateKeyEncrypted = updateData.privateKeyEncrypted;
    if (updateData.passwordHash !== undefined) data.passwordHash = updateData.passwordHash;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.preferences !== undefined) data.preferences = this.toJson(updateData.preferences);

    const { sql: setClause, params: setParams } = this.buildSetClause(data);
    
    const sql = `UPDATE authors SET ${setClause} WHERE id = ?`;
    const params = [...setParams, id];

    this.run(sql, params);

    return await this.findById(id);
  }

  /**
   * 删除作者
   */
  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM authors WHERE id = ?`;
    this.run(sql, [id]);
  }

  /**
   * 更新作者最后活跃时间
   */
  async updateLastActive(id: string): Promise<void> {
    const now = this.now();
    const sql = `UPDATE authors SET lastActiveAt = ?, updatedAt = ? WHERE id = ?`;
    this.run(sql, [now, now, id]);
  }

  /**
   * 更新作者统计信息
   */
  async updateStats(id: string, stats: { totalWorks?: number; totalWords?: number }): Promise<void> {
    const data: Record<string, any> = {
      updatedAt: this.now(),
    };

    if (stats.totalWorks !== undefined) data.totalWorks = stats.totalWorks;
    if (stats.totalWords !== undefined) data.totalWords = stats.totalWords;

    const { sql: setClause, params: setParams } = this.buildSetClause(data);
    
    const sql = `UPDATE authors SET ${setClause} WHERE id = ?`;
    const params = [...setParams, id];

    this.run(sql, params);
  }

  /**
   * 获取作者的最近作品
   */
  private async getRecentWorks(authorId: string, limit: number = 5): Promise<any[]> {
    const sql = `
      SELECT * FROM works 
      WHERE authorId = ? 
      ORDER BY updatedAt DESC 
      LIMIT ?
    `;

    const rows = this.all(sql, [authorId, limit]);
    return this.mapRows(rows);
  }

  /**
   * 检查用户名是否存在
   */
  async usernameExists(username: string): Promise<boolean> {
    const sql = `SELECT 1 FROM authors WHERE username = ?`;
    const result = this.get(sql, [username]);
    return !!result;
  }

  /**
   * 检查邮箱是否存在
   */
  async emailExists(email: string): Promise<boolean> {
    const sql = `SELECT 1 FROM authors WHERE email = ?`;
    const result = this.get(sql, [email]);
    return !!result;
  }

  /**
   * 获取所有作者（管理功能）
   */
  async findAll(options?: { skip?: number; take?: number }): Promise<any[]> {
    const skip = options?.skip || 0;
    const take = options?.take || 50;

    const sql = `
      SELECT * FROM authors 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `;

    const rows = this.all(sql, [take, skip]);
    return this.mapRows(rows);
  }

  /**
   * 搜索作者
   */
  async search(query: string, limit: number = 20): Promise<any[]> {
    const searchPattern = `%${query}%`;
    
    const sql = `
      SELECT * FROM authors 
      WHERE username LIKE ? OR displayName LIKE ? OR email LIKE ?
      ORDER BY username ASC
      LIMIT ?
    `;

    const rows = this.all(sql, [searchPattern, searchPattern, searchPattern, limit]);
    return this.mapRows(rows);
  }
}
