/**
 * CR-SQLite 协作文档仓储
 * 用于 Yjs 实时协作的文档存储
 */

import { CRSQLiteBaseRepository } from './CRSQLiteBaseRepository';
import { CRSQLiteManager } from '../../core/crsqlite-manager';
import { ulid } from 'ulid';

/**
 * 协作文档接口
 */
export interface CollaborativeDocument {
  id: string;
  contentId: string;
  workId: string;
  documentType: string;
  yjsState: Buffer | null;
  stateVector: Buffer | null;
  maxConnections: number;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建协作文档的数据
 */
export interface CreateCollaborativeDocumentData {
  id?: string;
  contentId: string;
  workId: string;
  documentType?: string;
  yjsState?: Buffer;
  stateVector?: Buffer;
  maxConnections?: number;
}

/**
 * CR-SQLite 协作文档仓储实现
 * 支持 Yjs 文档的持久化存储
 */
export class CRSQLiteCollaborationRepository extends CRSQLiteBaseRepository {
  constructor(manager: CRSQLiteManager) {
    super(manager);
  }

  /**
   * 保存或更新协作文档
   */
  async saveDocument(data: CreateCollaborativeDocumentData): Promise<CollaborativeDocument> {
    const id = data.id || ulid();
    const now = this.now();

    // 检查文档是否已存在
    const existing = this.get<any>(
      'SELECT id FROM collaborativeDocuments WHERE id = ?',
      [id]
    );

    if (existing) {
      // 更新现有文档
      const updateData: Record<string, any> = {
        updatedAt: now,
        lastSyncAt: now
      };

      if (data.yjsState !== undefined) {
        updateData.yjsState = data.yjsState;
      }
      if (data.stateVector !== undefined) {
        updateData.stateVector = data.stateVector;
      }
      if (data.maxConnections !== undefined) {
        updateData.maxConnections = data.maxConnections;
      }

      const { sql: setClause, params } = this.buildSetClause(updateData);
      this.run(`UPDATE collaborativeDocuments SET ${setClause} WHERE id = ?`, [...params, id]);
    } else {
      // 创建新文档
      const insertData = {
        id,
        contentId: data.contentId,
        workId: data.workId,
        documentType: data.documentType || 'text',
        yjsState: data.yjsState || null,
        stateVector: data.stateVector || null,
        maxConnections: data.maxConnections || 10,
        lastSyncAt: now,
        createdAt: now,
        updatedAt: now
      };

      const { columns, placeholders, params } = this.buildInsertClause(insertData);
      this.run(
        `INSERT INTO collaborativeDocuments (${columns}) VALUES (${placeholders})`,
        params
      );
    }

    return (await this.findById(id))!;
  }

  /**
   * 创建协作文档 (YjsCollaborationService 兼容方法)
   */
  async createCollaborativeDocument(data: CreateCollaborativeDocumentData): Promise<CollaborativeDocument> {
    return this.saveDocument(data);
  }

  /**
   * 查找协作文档 (YjsCollaborationService 兼容方法)
   */
  async findCollaborativeDocument(contentId: string): Promise<CollaborativeDocument | null> {
    return this.findByContentId(contentId);
  }

  /**
   * 更新协作文档
   */
  async updateCollaborativeDocument(id: string, data: Partial<CollaborativeDocument>): Promise<void> {
    const db = this.manager.getDatabase();
    const now = Date.now();
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (data.yjsState !== undefined) {
      fields.push('yjsState = ?');
      values.push(data.yjsState);
    }
    
    if (data.stateVector !== undefined) {
      fields.push('stateVector = ?');
      values.push(data.stateVector);
    }
    
    if (data.maxConnections !== undefined) {
      fields.push('maxConnections = ?');
      values.push(data.maxConnections);
    }
    
    fields.push('lastSyncAt = ?', 'updatedAt = ?');
    values.push(now, now);
    values.push(id);
    
    const query = `
      UPDATE collaborativeDocuments 
      SET ${fields.join(', ')}
      WHERE id = ?
    `;
    
    db.prepare(query).run(...values);
  }

  /**
   * 创建 Yjs 更新记录 (占位实现)
   */
  async createYjsUpdate(data: any): Promise<void> {
    // 在 CR-SQLite 中，我们直接更新文档状态，不需要单独的更新记录
    // 这是为了兼容 YjsCollaborationService 的接口
    console.log('Yjs update created (CR-SQLite implementation):', data.documentId);
  }

  /**
   * 创建协作会话 (占位实现)
   */
  async createSession(data: any): Promise<void> {
    // 在 CR-SQLite 中，会话管理可以简化
    // 这是为了兼容 YjsCollaborationService 的接口
    console.log('Collaboration session created (CR-SQLite implementation):', data.documentId);
  }

  /**
   * 获取更新统计 (占位实现)
   */
  async getUpdateStats(documentId: string): Promise<any> {
    // 返回基本统计信息
    const doc = await this.findById(documentId);
    return {
      documentId,
      totalUpdates: doc ? 1 : 0,
      lastUpdate: doc?.updatedAt || null,
      collaborators: 1 // 简化实现
    };
  }
  async findById(id: string): Promise<CollaborativeDocument | null> {
    const row = this.get<any>(
      'SELECT * FROM collaborativeDocuments WHERE id = ?',
      [id]
    );

    return row ? this.mapDocumentRow(row) : null;
  }

  /**
   * 根据内容 ID 查找协作文档
   */
  async findByContentId(contentId: string): Promise<CollaborativeDocument | null> {
    const row = this.get<any>(
      'SELECT * FROM collaborativeDocuments WHERE contentId = ?',
      [contentId]
    );

    return row ? this.mapDocumentRow(row) : null;
  }

  /**
   * 根据作品 ID 查找所有协作文档
   */
  async findByWorkId(workId: string): Promise<CollaborativeDocument[]> {
    const rows = this.all<any>(
      'SELECT * FROM collaborativeDocuments WHERE workId = ? ORDER BY updatedAt DESC',
      [workId]
    );

    return rows.map(row => this.mapDocumentRow(row));
  }

  /**
   * 删除协作文档
   */
  async delete(id: string): Promise<void> {
    this.run('DELETE FROM collaborativeDocuments WHERE id = ?', [id]);
  }

  /**
   * 删除内容相关的协作文档
   */
  async deleteByContentId(contentId: string): Promise<void> {
    this.run('DELETE FROM collaborativeDocuments WHERE contentId = ?', [contentId]);
  }

  /**
   * 删除作品相关的所有协作文档
   */
  async deleteByWorkId(workId: string): Promise<void> {
    this.run('DELETE FROM collaborativeDocuments WHERE workId = ?', [workId]);
  }

  /**
   * 更新文档的 Yjs 状态
   */
  async updateYjsState(id: string, yjsState: Buffer, stateVector?: Buffer): Promise<void> {
    const now = this.now();
    const params: any[] = [yjsState, now, now];
    
    let sql = 'UPDATE collaborativeDocuments SET yjsState = ?, updatedAt = ?, lastSyncAt = ?';
    
    if (stateVector) {
      sql += ', stateVector = ?';
      params.push(stateVector);
    }
    
    sql += ' WHERE id = ?';
    params.push(id);
    
    this.run(sql, params);
  }

  /**
   * 获取活跃的协作文档列表
   * @param sinceMinutes 最近 N 分钟内有同步的文档
   */
  async getActiveDocuments(sinceMinutes: number = 30): Promise<CollaborativeDocument[]> {
    const sinceTimestamp = Date.now() - (sinceMinutes * 60 * 1000);
    
    const rows = this.all<any>(
      'SELECT * FROM collaborativeDocuments WHERE lastSyncAt > ? ORDER BY lastSyncAt DESC',
      [sinceTimestamp]
    );

    return rows.map(row => this.mapDocumentRow(row));
  }

  /**
   * 清理过期的协作文档
   * @param daysOld 删除 N 天前的文档
   */
  async cleanupOldDocuments(daysOld: number = 30): Promise<number> {
    const cutoffTimestamp = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const result = this.run(
      'DELETE FROM collaborativeDocuments WHERE lastSyncAt < ?',
      [cutoffTimestamp]
    );

    return result.changes;
  }

  /**
   * 映射数据库行到协作文档对象
   */
  private mapDocumentRow(row: any): CollaborativeDocument {
    return {
      id: row.id,
      contentId: row.contentId,
      workId: row.workId,
      documentType: row.documentType,
      yjsState: row.yjsState,
      stateVector: row.stateVector,
      maxConnections: row.maxConnections,
      lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }
}
