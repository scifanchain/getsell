/**
 * CR-SQLite 用户仓储实现
 * 实现 IUserRepository 接口
 */

import { CRSQLiteBaseRepository } from './CRSQLiteBaseRepository';
import { CRSQLiteManager } from '../../core/crsqlite-manager';
import { IUserRepository, UserData } from '../interfaces';
import { ulid } from 'ulid';

export class CRSQLiteUserRepository extends CRSQLiteBaseRepository implements IUserRepository {
  constructor(manager: CRSQLiteManager) {
    super(manager);
  }

  /**
   * 创建新用户
   */
  async create(userData: UserData & Record<string, any>): Promise<any> {
    const id = userData.id || ulid();
    const now = this.now();

    const data = {
      id,
      username: userData.username,
      password_hash: userData.passwordHash || null,
      display_name: userData.displayName || userData.username,
      email: userData.email || null,
      bio: userData.bio || null,
      avatar_url: userData.avatarUrl || null,
      wallet_address: userData.walletAddress || null,
      public_key: userData.publicKey || null,
      private_key_encrypted: userData.privateKeyEncrypted || null,
      total_works: 0,
      total_words: 0,
      status: 'active',
      preferences: userData.preferences ? this.toJson(userData.preferences) : null,
      last_active_at: now,
      created_at: now,
      updated_at: now,
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
   * 根据ID查找用户
   */
  async findById(id: string): Promise<any | null> {
    const sql = `
      SELECT 
        a.*,
        (SELECT COUNT(*) FROM works WHERE author_id = a.id) as works_count,
        (SELECT COUNT(*) FROM chapters WHERE author_id = a.id) as chapters_count,
        (SELECT COUNT(*) FROM contents WHERE author_id = a.id) as contents_count
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
   * 根据用户名查找用户
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
   * 根据邮箱查找用户
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
   * 更新用户信息
   */
  async update(id: string, updateData: Partial<UserData> & Record<string, any>): Promise<any> {
    const now = this.now();

    // 构建更新数据
    const data: Record<string, any> = {
      updated_at: now,
    };

    if (updateData.displayName !== undefined) data.display_name = updateData.displayName;
    if (updateData.email !== undefined) data.email = updateData.email;
    if (updateData.bio !== undefined) data.bio = updateData.bio;
    if (updateData.avatarUrl !== undefined) data.avatar_url = updateData.avatarUrl;
    if (updateData.walletAddress !== undefined) data.wallet_address = updateData.walletAddress;
    if (updateData.publicKey !== undefined) data.public_key = updateData.publicKey;
    if (updateData.privateKeyEncrypted !== undefined) data.private_key_encrypted = updateData.privateKeyEncrypted;
    if (updateData.passwordHash !== undefined) data.password_hash = updateData.passwordHash;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.preferences !== undefined) data.preferences = this.toJson(updateData.preferences);

    const { sql: setClause, params: setParams } = this.buildSetClause(data);
    
    const sql = `UPDATE authors SET ${setClause} WHERE id = ?`;
    const params = [...setParams, id];

    this.run(sql, params);

    return await this.findById(id);
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<void> {
    const sql = `DELETE FROM authors WHERE id = ?`;
    this.run(sql, [id]);
  }

  /**
   * 更新用户最后活跃时间
   */
  async updateLastActive(id: string): Promise<void> {
    const now = this.now();
    const sql = `UPDATE authors SET last_active_at = ?, updated_at = ? WHERE id = ?`;
    this.run(sql, [now, now, id]);
  }

  /**
   * 更新用户统计信息
   */
  async updateStats(id: string, stats: { totalWorks?: number; totalWords?: number }): Promise<void> {
    const data: Record<string, any> = {
      updated_at: this.now(),
    };

    if (stats.totalWorks !== undefined) data.total_works = stats.totalWorks;
    if (stats.totalWords !== undefined) data.total_words = stats.totalWords;

    const { sql: setClause, params: setParams } = this.buildSetClause(data);
    
    const sql = `UPDATE authors SET ${setClause} WHERE id = ?`;
    const params = [...setParams, id];

    this.run(sql, params);
  }

  /**
   * 获取用户的最近作品
   */
  private async getRecentWorks(authorId: string, limit: number = 5): Promise<any[]> {
    const sql = `
      SELECT * FROM works 
      WHERE author_id = ? 
      ORDER BY updated_at DESC 
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
   * 获取所有用户（管理功能）
   */
  async findAll(options?: { skip?: number; take?: number }): Promise<any[]> {
    const skip = options?.skip || 0;
    const take = options?.take || 50;

    const sql = `
      SELECT * FROM authors 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    const rows = this.all(sql, [take, skip]);
    return this.mapRows(rows);
  }

  /**
   * 搜索用户
   */
  async search(query: string, limit: number = 20): Promise<any[]> {
    const searchPattern = `%${query}%`;
    
    const sql = `
      SELECT * FROM authors 
      WHERE username LIKE ? OR display_name LIKE ? OR email LIKE ?
      ORDER BY username ASC
      LIMIT ?
    `;

    const rows = this.all(sql, [searchPattern, searchPattern, searchPattern, limit]);
    return this.mapRows(rows);
  }
}
