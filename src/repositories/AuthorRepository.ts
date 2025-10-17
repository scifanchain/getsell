/**
 * Author Repository
 * 
 * 使用 Drizzle ORM 进行类型安全的数据库操作
 * CRDT 功能由 CR-SQLite 自动处理
 */

import { eq, like, and, or } from 'drizzle-orm';
import { ulid } from 'ulid';
import { DatabaseManager } from '../core/db-manager';
import { 
  authors, 
  type Author, 
  type NewAuthor, 
  type UpdateAuthor 
} from '../db/schema';

export interface IAuthorRepository {
  create(data: Omit<NewAuthor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Author>;
  findById(id: string): Promise<Author | null>;
  findByUsername(username: string): Promise<Author | null>;
  findByEmail(email: string): Promise<Author | null>;
  findByWalletAddress(walletAddress: string): Promise<Author | null>;
  update(id: string, data: UpdateAuthor): Promise<Author>;
  delete(id: string): Promise<void>;
  list(options?: { limit?: number; offset?: number }): Promise<Author[]>;
  search(query: string): Promise<Author[]>;
}

export class AuthorRepository implements IAuthorRepository {
  constructor(private dbManager: DatabaseManager) {}

  /**
   * 创建新作者
   */
  async create(data: Omit<NewAuthor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Author> {
    const db = this.dbManager.getDrizzle();
    const now = Date.now();
    const id = ulid();

    const newAuthor: NewAuthor = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(authors).values(newAuthor);

    // 查询并返回创建的作者
    const created = await db.select().from(authors).where(eq(authors.id, id)).limit(1);
    
    if (!created || created.length === 0) {
      throw new Error('Failed to create author');
    }

    return created[0];
  }

  /**
   * 根据 ID 查找作者
   */
  async findById(id: string): Promise<Author | null> {
    const db = this.dbManager.getDrizzle();
    
    const result = await db
      .select()
      .from(authors)
      .where(eq(authors.id, id))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * 根据用户名查找作者
   */
  async findByUsername(username: string): Promise<Author | null> {
    const db = this.dbManager.getDrizzle();
    
    const result = await db
      .select()
      .from(authors)
      .where(eq(authors.username, username))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * 根据邮箱查找作者
   */
  async findByEmail(email: string): Promise<Author | null> {
    const db = this.dbManager.getDrizzle();
    
    const result = await db
      .select()
      .from(authors)
      .where(eq(authors.email, email))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * 根据钱包地址查找作者
   */
  async findByWalletAddress(walletAddress: string): Promise<Author | null> {
    const db = this.dbManager.getDrizzle();
    
    const result = await db
      .select()
      .from(authors)
      .where(eq(authors.walletAddress, walletAddress))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * 更新作者信息
   */
  async update(id: string, data: UpdateAuthor): Promise<Author> {
    const db = this.dbManager.getDrizzle();

    // 添加更新时间
    const updateData = {
      ...data,
      updatedAt: Date.now(),
    };

    await db
      .update(authors)
      .set(updateData)
      .where(eq(authors.id, id));

    // 查询并返回更新后的作者
    const updated = await this.findById(id);
    
    if (!updated) {
      throw new Error('Author not found after update');
    }

    return updated;
  }

  /**
   * 删除作者
   */
  async delete(id: string): Promise<void> {
    const db = this.dbManager.getDrizzle();
    
    await db
      .delete(authors)
      .where(eq(authors.id, id));
  }

  /**
   * 列出所有作者
   */
  async list(options?: { limit?: number; offset?: number }): Promise<Author[]> {
    const db = this.dbManager.getDrizzle();
    
    let query = db.select().from(authors);

    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }
    if (options?.offset) {
      query = query.offset(options.offset) as any;
    }

    return await query;
  }

  /**
   * 搜索作者（按用户名或显示名称）
   */
  async search(query: string): Promise<Author[]> {
    const db = this.dbManager.getDrizzle();
    const searchPattern = `%${query}%`;

    return await db
      .select()
      .from(authors)
      .where(
        or(
          like(authors.username, searchPattern),
          like(authors.displayName, searchPattern),
          like(authors.email, searchPattern)
        )
      );
  }

  /**
   * 检查用户名是否已存在
   */
  async isUsernameExists(username: string): Promise<boolean> {
    const author = await this.findByUsername(username);
    return author !== null;
  }

  /**
   * 检查邮箱是否已存在
   */
  async isEmailExists(email: string): Promise<boolean> {
    const author = await this.findByEmail(email);
    return author !== null;
  }
}
