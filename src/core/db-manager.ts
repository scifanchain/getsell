/**
 * 数据库管理器
 * 
 * 职责：
 * 1. 初始化 SQLite 数据库连接
 * 2. 加载 CR-SQLite 扩展（CRDT 功能）
 * 3. 使用 Drizzle ORM 管理表结构
 * 4. 将表标记为 CRDT 表以支持去中心化同步
 * 5. 提供数据库实例和 Drizzle 实例
 */

import Database from 'better-sqlite3';
import { ulid } from 'ulid';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDrizzleDB, type DrizzleDB } from '../db';
import { sql } from 'drizzle-orm';

export interface DatabaseConfig {
  dbPath: string;
  siteId?: string;
  enableWal?: boolean;
}

export interface DatabaseChange {
  table: string;
  pk: string;
  cid: string;
  val: any;
  col_version: number;
  db_version: number;
  site_id: Buffer;
  cl: number;
  seq: number;
}

export class DatabaseManager {
  private db: Database.Database | null = null;
  private drizzle: DrizzleDB | null = null;
  private siteId: string;
  private dbPath: string;
  private config: DatabaseConfig;
  private isInitialized = false;

  // 需要标记为 CRDT 的表
  private readonly CRDT_TABLES = [
    'authors',
    'works',
    'chapters',
    'contents',
    'contentVersions',
    'collaborativeDocuments',
  ];

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.dbPath = config.dbPath;
    this.siteId = config.siteId || this.generateSiteId();
  }

  /**
   * 生成唯一的站点 ID
   */
  private generateSiteId(): string {
    return ulid();
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[Database] Database already initialized');
      return;
    }

    try {
      // 1. 确保数据库目录存在
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // 2. 打开数据库连接
      this.db = new Database(this.dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
      });

      console.log(`[Database] ✅ Database opened: ${this.dbPath}`);

      // 3. 加载 CR-SQLite 扩展
      await this.loadCRSQLiteExtension();

      // 4. 配置数据库
      if (this.config.enableWal !== false) {
        this.db.pragma('journal_mode = WAL');
        console.log('[Database] ✅ WAL mode enabled');
      }

      // CR-SQLite 不支持外键约束
      this.db.pragma('foreign_keys = OFF');

      // 5. 创建 Drizzle 实例
      this.drizzle = createDrizzleDB(this.db);
      console.log('[Database] ✅ Drizzle ORM initialized');

      // 6. 创建表结构（使用 Drizzle 推送）
      await this.pushSchema();

      // 7. 标记所有表为 CRDT 表
      await this.enableCRDTForTables();

      // 8. 显示站点 ID
      const currentSiteId = this.db.prepare('SELECT crsql_site_id() as site_id').get() as { site_id: Buffer };
      console.log(`[Database] ✅ Site ID: ${currentSiteId.site_id.toString('hex')}`);

      this.isInitialized = true;
      console.log('[Database] 🎉 Database initialized successfully');
    } catch (error) {
      console.error('[Database] ❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * 加载 CR-SQLite 扩展
   */
  private async loadCRSQLiteExtension(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened');
    }

    try {
      const extensionPath = this.getCRSQLiteExtensionPath();

      if (!fs.existsSync(extensionPath)) {
        throw new Error(`CR-SQLite extension not found at: ${extensionPath}`);
      }

      this.db.loadExtension(extensionPath);
      console.log('[Database] ✅ CR-SQLite extension loaded');
    } catch (error) {
      console.error('[Database] ❌ Failed to load CR-SQLite extension:', error);
      throw error;
    }
  }

  /**
   * 获取 CR-SQLite 扩展路径
   */
  private getCRSQLiteExtensionPath(): string {
    const platform = process.platform;
    let extensionName: string;

    if (platform === 'win32') {
      extensionName = 'crsqlite.dll';
    } else if (platform === 'darwin') {
      extensionName = 'crsqlite.dylib';
    } else {
      extensionName = 'crsqlite.so';
    }

    // 在开发环境和生产环境中查找扩展
    const possiblePaths = [
      path.join(process.cwd(), 'node_modules', '@vlcn.io', 'crsqlite', 'dist', extensionName),
      path.join(app.getAppPath(), 'node_modules', '@vlcn.io', 'crsqlite', 'dist', extensionName),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    return possiblePaths[0];
  }

  /**
   * 使用 Drizzle 推送 Schema 到数据库
   */
  private async pushSchema(): Promise<void> {
    if (!this.drizzle || !this.db) {
      throw new Error('Drizzle or Database not initialized');
    }

    try {
      console.log('[Database] 📊 Applying database migrations...');

      // 使用 Drizzle 迁移系统
      migrate(this.drizzle, { 
        migrationsFolder: path.join(process.cwd(), 'drizzle', 'migrations') 
      });

      console.log('[Database] ✅ Schema migrations applied successfully');
    } catch (error) {
      console.error('[Database] ❌ Failed to apply migrations:', error);
      throw error;
    }
  }

  /**
   * 为所有表启用 CRDT 功能
   */
  private async enableCRDTForTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened');
    }

    console.log(`[Database] 🔄 Enabling CRDT for ${this.CRDT_TABLES.length} tables...`);

    for (const tableName of this.CRDT_TABLES) {
      try {
        // 检查表是否存在
        const tableExists = this.db
          .prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`)
          .get(tableName) as { count: number };

        if (tableExists.count === 0) {
          console.log(`[Database] ⚠️  Table '${tableName}' does not exist, skipping CRDT setup`);
          continue;
        }

        // 检查表是否已经是 CRDT 表
        let isCRDTTable = false;
        try {
          const result = this.db
            .prepare(`SELECT COUNT(*) as count FROM crsql_master WHERE tbl_name = ?`)
            .get(tableName) as { count: number };
          isCRDTTable = result.count > 0;
        } catch (error) {
          // crsql_master 表可能不存在，忽略错误
          isCRDTTable = false;
        }

        if (isCRDTTable) {
          console.log(`[Database] ✅ Table '${tableName}' is already a CRDT table`);
          continue;
        }

        // 标记表为 CRDT 表
        this.db.prepare(`SELECT crsql_as_crr(?)`).get(tableName);
        console.log(`[Database] ✅ Table '${tableName}' marked as CRDT`);
      } catch (error) {
        console.error(`[Database] ❌ Failed to enable CRDT for table '${tableName}':`, error);
        // 不抛出错误，继续处理其他表
      }
    }

    console.log('[Database] 🎉 CRDT setup completed');
  }

  /**
   * 获取 better-sqlite3 数据库实例（用于原生 SQL 查询）
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * 获取 Drizzle ORM 实例（类型安全查询）
   */
  getDrizzle(): DrizzleDB {
    if (!this.drizzle) {
      throw new Error('Drizzle not initialized');
    }
    return this.drizzle;
  }

  /**
   * 获取当前数据库版本（用于同步）
   */
  getCurrentVersion(): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.prepare(`SELECT crsql_db_version() as version`).get() as { version: number };
    return result.version;
  }

  /**
   * 获取变更记录（用于同步）
   */
  getChanges(sinceVersion: number = 0): DatabaseChange[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return this.db
      .prepare(
        `
      SELECT "table", "pk", "cid", "val", "col_version", "db_version", "site_id", "cl", "seq"
      FROM crsql_changes
      WHERE db_version > ?
      ORDER BY db_version ASC
    `
      )
      .all(sinceVersion) as DatabaseChange[];
  }

  /**
   * 应用远程变更（用于同步）
   */
  applyChanges(changes: DatabaseChange[]): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stmt = this.db.prepare(`
      INSERT INTO crsql_changes 
      ("table", "pk", "cid", "val", "col_version", "db_version", "site_id", "cl", "seq")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const applyBatch = this.db.transaction((changeBatch: DatabaseChange[]) => {
      for (const change of changeBatch) {
        stmt.run(
          change.table,
          change.pk,
          change.cid,
          change.val,
          change.col_version,
          change.db_version,
          change.site_id,
          change.cl,
          change.seq
        );
      }
    });

    applyBatch(changes);
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.drizzle = null;
      this.isInitialized = false;
      console.log('[Database] Database closed');
    }
  }
}
