/**
 * CR-SQLite Repository 基类
 * 提供通用的数据库操作方法
 */

import { CRSQLiteManager } from '../../core/crsqlite-manager';
import { CRSQLiteConstraints, ConstraintViolationError } from './CRSQLiteConstraints';
import Database from 'better-sqlite3';

export abstract class CRSQLiteBaseRepository {
  protected db: Database.Database;
  protected manager: CRSQLiteManager;
  protected constraints: CRSQLiteConstraints;

  constructor(manager: CRSQLiteManager) {
    this.manager = manager;
    this.db = manager.getDatabase();
    this.constraints = new CRSQLiteConstraints(this.db);
  }

  /**
   * 执行 SQL 并返回单个结果
   */
  protected get<T = any>(sql: string, params: any[] = []): T | undefined {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.get(...params) as T | undefined;
    } catch (error) {
      console.error('[CRSQLiteBaseRepository] Get error:', error, { sql, params });
      throw error;
    }
  }

  /**
   * 执行 SQL 并返回所有结果
   */
  protected all<T = any>(sql: string, params: any[] = []): T[] {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as T[];
    } catch (error) {
      console.error('[CRSQLiteBaseRepository] All error:', error, { sql, params });
      throw error;
    }
  }

  /**
   * 执行 SQL 插入/更新/删除
   */
  protected run(sql: string, params: any[] = []): Database.RunResult {
    try {
      const stmt = this.db.prepare(sql);
      return stmt.run(...params);
    } catch (error) {
      console.error('[CRSQLiteBaseRepository] Run error:', error, { sql, params });
      throw error;
    }
  }

  /**
   * 执行事务
   */
  protected transaction<T>(fn: () => T): T {
    return this.manager.transaction(fn);
  }

  /**
   * 将 SQLite 布尔值转换为 JavaScript 布尔值
   */
  protected toBoolean(value: number | null | undefined): boolean {
    return value === 1;
  }

  /**
   * 将 JavaScript 布尔值转换为 SQLite 布尔值
   */
  protected fromBoolean(value: boolean | undefined | null): number {
    return value ? 1 : 0;
  }

  /**
   * 将 JSON 字符串解析为对象
   */
  protected parseJson<T = any>(jsonString: string | null | undefined): T | null {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      console.error('[CRSQLiteBaseRepository] JSON parse error:', error, jsonString);
      return null;
    }
  }

  /**
   * 将对象转换为 JSON 字符串
   */
  protected toJson(obj: any): string | null {
    if (!obj) return null;
    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.error('[CRSQLiteBaseRepository] JSON stringify error:', error, obj);
      return null;
    }
  }

  /**
   * 构建 WHERE 子句
   */
  protected buildWhereClause(conditions: Record<string, any>): { sql: string; params: any[] } {
    const entries = Object.entries(conditions).filter(([_, value]) => value !== undefined);
    
    if (entries.length === 0) {
      return { sql: '', params: [] };
    }

    const clauses = entries.map(([key]) => `${key} = ?`);
    const params = entries.map(([_, value]) => value);

    return {
      sql: ' WHERE ' + clauses.join(' AND '),
      params
    };
  }

  /**
   * 构建 SET 子句（用于 UPDATE）
   */
  protected buildSetClause(data: Record<string, any>): { sql: string; params: any[] } {
    const entries = Object.entries(data).filter(([_, value]) => value !== undefined);
    
    if (entries.length === 0) {
      throw new Error('No data to update');
    }

    const clauses = entries.map(([key]) => `${key} = ?`);
    const params = entries.map(([_, value]) => value);

    return {
      sql: clauses.join(', '),
      params
    };
  }

  /**
   * 构建 INSERT 语句的列和值
   */
  protected buildInsertClause(data: Record<string, any>): {
    columns: string;
    placeholders: string;
    params: any[];
  } {
    const entries = Object.entries(data).filter(([_, value]) => value !== undefined);
    
    if (entries.length === 0) {
      throw new Error('No data to insert');
    }

    const columns = entries.map(([key]) => key).join(', ');
    const placeholders = entries.map(() => '?').join(', ');
    const params = entries.map(([_, value]) => value);

    return {
      columns,
      placeholders,
      params
    };
  }

  /**
   * 转换数据库行为更友好的对象格式
   * 现在数据库字段统一使用 camelCase，不需要字段名转换
   * 只需要处理布尔值转换
   */
  protected mapRow<T = any>(row: any): T {
    if (!row) return row;

    const mapped: any = {};

    for (const [key, value] of Object.entries(row)) {
      // 处理布尔字段 (SQLite 中 INTEGER 0/1 转为 boolean)
      if (key.startsWith('is') || key === 'isPublic' || key === 'isCollaborative') {
        mapped[key] = this.toBoolean(value as number);
      } else if (value === null) {
        mapped[key] = null;
      } else {
        mapped[key] = value;
      }
    }

    return mapped as T;
  }

  /**
   * 转换多行数据
   */
  protected mapRows<T = any>(rows: any[]): T[] {
    return rows.map(row => this.mapRow<T>(row));
  }

  /**
   * 获取当前时间戳（毫秒）
   */
  protected now(): number {
    return Date.now();
  }
}
