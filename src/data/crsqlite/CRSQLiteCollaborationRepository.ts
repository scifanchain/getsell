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
      'SELECT id FROM collaborative_documents WHERE id = ?',
      [id]
    );

    if (existing) {
      // 更新现有文档
      const updateData: Record<string, any> = {
        updated_at: now,
        last_sync_at: now
      };

      if (data.yjsState !== undefined) {
        updateData.yjs_state = data.yjsState;
      }
      if (data.stateVector !== undefined) {
        updateData.state_vector = data.stateVector;
      }
      if (data.maxConnections !== undefined) {
        updateData.max_connections = data.maxConnections;
      }

      const { sql: setClause, params } = this.buildSetClause(updateData);
      this.run(`UPDATE collaborative_documents SET ${setClause} WHERE id = ?`, [...params, id]);
    } else {
      // 创建新文档
      const insertData = {
        id,
        content_id: data.contentId,
        work_id: data.workId,
        document_type: data.documentType || 'text',
        yjs_state: data.yjsState || null,
        state_vector: data.stateVector || null,
        max_connections: data.maxConnections || 10,
        last_sync_at: now,
        created_at: now,
        updated_at: now
      };

      const { columns, placeholders, params } = this.buildInsertClause(insertData);
      this.run(
        `INSERT INTO collaborative_documents (${columns}) VALUES (${placeholders})`,
        params
      );
    }

    return (await this.findById(id))!;
  }

  /**
   * 根据 ID 查找协作文档
   */
  async findById(id: string): Promise<CollaborativeDocument | null> {
    const row = this.get<any>(
      'SELECT * FROM collaborative_documents WHERE id = ?',
      [id]
    );

    return row ? this.mapDocumentRow(row) : null;
  }

  /**
   * 根据内容 ID 查找协作文档
   */
  async findByContentId(contentId: string): Promise<CollaborativeDocument | null> {
    const row = this.get<any>(
      'SELECT * FROM collaborative_documents WHERE content_id = ?',
      [contentId]
    );

    return row ? this.mapDocumentRow(row) : null;
  }

  /**
   * 根据作品 ID 查找所有协作文档
   */
  async findByWorkId(workId: string): Promise<CollaborativeDocument[]> {
    const rows = this.all<any>(
      'SELECT * FROM collaborative_documents WHERE work_id = ? ORDER BY updated_at DESC',
      [workId]
    );

    return rows.map(row => this.mapDocumentRow(row));
  }

  /**
   * 删除协作文档
   */
  async delete(id: string): Promise<void> {
    this.run('DELETE FROM collaborative_documents WHERE id = ?', [id]);
  }

  /**
   * 删除内容相关的协作文档
   */
  async deleteByContentId(contentId: string): Promise<void> {
    this.run('DELETE FROM collaborative_documents WHERE content_id = ?', [contentId]);
  }

  /**
   * 删除作品相关的所有协作文档
   */
  async deleteByWorkId(workId: string): Promise<void> {
    this.run('DELETE FROM collaborative_documents WHERE work_id = ?', [workId]);
  }

  /**
   * 更新文档的 Yjs 状态
   */
  async updateYjsState(id: string, yjsState: Buffer, stateVector?: Buffer): Promise<void> {
    const now = this.now();
    const params: any[] = [yjsState, now, now];
    
    let sql = 'UPDATE collaborative_documents SET yjs_state = ?, updated_at = ?, last_sync_at = ?';
    
    if (stateVector) {
      sql += ', state_vector = ?';
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
      'SELECT * FROM collaborative_documents WHERE last_sync_at > ? ORDER BY last_sync_at DESC',
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
      'DELETE FROM collaborative_documents WHERE last_sync_at < ?',
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
      contentId: row.content_id,
      workId: row.work_id,
      documentType: row.document_type,
      yjsState: row.yjs_state,
      stateVector: row.state_vector,
      maxConnections: row.max_connections,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
