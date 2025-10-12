/**
 * CR-SQLite 数据库管理器
 * 负责初始化、管理和同步 CR-SQLite 数据库
 * 
 * CR-SQLite 是一个 SQLite 扩展，为 SQLite 添加 CRDT 功能
 * 使得多个设备可以进行去中心化的数据同步
 */

import Database from 'better-sqlite3'
import { ulid } from 'ulid'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'

export interface CRSQLiteConfig {
  dbPath: string
  siteId?: string
  enableWal?: boolean
  enableForeignKeys?: boolean
}

export interface CRSQLiteChange {
  table: string
  pk: string
  cid: string
  val: any
  col_version: number
  db_version: number
  site_id: Buffer
  cl: number
  seq: number
}

export class CRSQLiteManager {
  private db: Database.Database | null = null
  private siteId: string
  private dbPath: string
  private config: CRSQLiteConfig
  private isInitialized = false

  constructor(config: CRSQLiteConfig) {
    this.config = config
    this.dbPath = config.dbPath
    // 使用配置的 siteId 或生成新的
    this.siteId = config.siteId || this.generateSiteId()
  }

  /**
   * 生成唯一的站点 ID
   * 用于标识不同的设备/实例
   */
  private generateSiteId(): string {
    return ulid()
  }

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[CRSQLite] Database already initialized')
      return
    }

    try {
      // 确保数据库目录存在
      const dbDir = path.dirname(this.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      // 打开数据库连接
      this.db = new Database(this.dbPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
      })

      console.log(`[CRSQLite] Database opened: ${this.dbPath}`)

      // 加载 CR-SQLite 扩展
      await this.loadCRSQLiteExtension()

      // 启用 WAL 模式（Write-Ahead Logging）以提高性能
      if (this.config.enableWal !== false) {
        this.db.pragma('journal_mode = WAL')
      }

      // CR-SQLite 不支持外键约束检查
      // 在分布式复制环境中，外键约束可能会被违反
      // 外键引用关系需要在应用层维护
      this.db.pragma('foreign_keys = OFF')

      // 获取或设置站点 ID
      // crsql_site_id() 无参数时返回当前 site_id
      // 如果数据库是新的，它会自动生成一个
      const currentSiteId = this.db.prepare('SELECT crsql_site_id() as site_id').get() as { site_id: Buffer }
      console.log(`[CRSQLite] Site ID: ${currentSiteId.site_id.toString('hex')}`)

      // 创建数据库表结构
      await this.createTables()

      // 标记所有表为 CRDT 表
      await this.enableCRDTForTables()

      this.isInitialized = true
      console.log('[CRSQLite] Database initialized successfully')
    } catch (error) {
      console.error('[CRSQLite] Failed to initialize database:', error)
      throw error
    }
  }

  /**
   * 加载 CR-SQLite 扩展
   */
  private async loadCRSQLiteExtension(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened')
    }

    try {
      // 在 Electron 环境中加载预编译的 CR-SQLite 扩展
      // CR-SQLite 扩展应该在 node_modules/@vlcn.io/crsqlite 中
      const extensionPath = this.getCRSQLiteExtensionPath()
      
      if (!fs.existsSync(extensionPath)) {
        throw new Error(`CR-SQLite extension not found at: ${extensionPath}`)
      }

      this.db.loadExtension(extensionPath)
      console.log('[CRSQLite] Extension loaded successfully')
    } catch (error) {
      console.error('[CRSQLite] Failed to load CR-SQLite extension:', error)
      throw error
    }
  }

  /**
   * 获取 CR-SQLite 扩展路径
   */
  private getCRSQLiteExtensionPath(): string {
    const platform = process.platform
    let extensionName: string

    if (platform === 'win32') {
      extensionName = 'crsqlite.dll'
    } else if (platform === 'darwin') {
      extensionName = 'crsqlite.dylib'
    } else {
      extensionName = 'crsqlite.so'
    }

    // 在开发环境和生产环境中查找扩展
    const devPath = path.join(__dirname, '../../node_modules/@vlcn.io/crsqlite/dist', extensionName)
    const prodPath = path.join(process.resourcesPath || app.getAppPath(), 'node_modules/@vlcn.io/crsqlite/dist', extensionName)

    if (fs.existsSync(devPath)) {
      return devPath
    } else if (fs.existsSync(prodPath)) {
      return prodPath
    }

    // 默认返回开发路径，让错误在后续处理
    return devPath
  }

  /**
   * 创建数据库表结构
   * 基于 Prisma schema 的定义
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened')
    }

    // 先删除已存在的表（仅用于测试/开发）
    this.db.exec(`
      DROP TABLE IF EXISTS content_versions;
      DROP TABLE IF EXISTS collaborative_documents;
      DROP TABLE IF EXISTS contents;
      DROP TABLE IF EXISTS chapters;
      DROP TABLE IF EXISTS works;
      DROP TABLE IF EXISTS authors;
    `)

    // 创建 authors 表
    // 注意: CR-SQLite 要求:
    // 1. 不支持除主键外的 UNIQUE 约束（唯一性在应用层检查）
    // 2. 所有 NOT NULL 列必须有 DEFAULT 值（确保模式兼容性）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS authors (
        id TEXT PRIMARY KEY NOT NULL,
        username TEXT NOT NULL DEFAULT '',
        password_hash TEXT,
        display_name TEXT,
        email TEXT,
        bio TEXT,
        avatar_url TEXT,
        wallet_address TEXT,
        public_key TEXT,
        private_key_encrypted TEXT,
        total_works INTEGER NOT NULL DEFAULT 0,
        total_words INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        preferences TEXT,
        last_active_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 works 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS works (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        subtitle TEXT,
        description TEXT,
        cover_image_url TEXT,
        genre TEXT,
        tags TEXT,
        author_id TEXT NOT NULL DEFAULT '',
        collaboration_mode TEXT NOT NULL DEFAULT 'solo',
        collaborators TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        progress_percentage REAL NOT NULL DEFAULT 0.0,
        total_words INTEGER NOT NULL DEFAULT 0,
        total_characters INTEGER NOT NULL DEFAULT 0,
        chapter_count INTEGER NOT NULL DEFAULT 0,
        target_words INTEGER,
        target_completion_date INTEGER,
        blockchain_hash TEXT,
        nft_token_id TEXT,
        nft_contract_address TEXT,
        copyright_hash TEXT,
        is_public INTEGER NOT NULL DEFAULT 0,
        license_type TEXT NOT NULL DEFAULT 'all_rights_reserved',
        published_at INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 chapters 表
    // 注意: CR-SQLite 不支持外键约束，外键引用关系在应用层维护
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY NOT NULL,
        work_id TEXT NOT NULL DEFAULT '',
        parent_id TEXT,
        level INTEGER NOT NULL DEFAULT 1,
        order_index INTEGER NOT NULL DEFAULT 0,
        title TEXT NOT NULL DEFAULT '',
        subtitle TEXT,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'chapter',
        status TEXT NOT NULL DEFAULT 'draft',
        word_count INTEGER NOT NULL DEFAULT 0,
        character_count INTEGER NOT NULL DEFAULT 0,
        content_count INTEGER NOT NULL DEFAULT 0,
        child_chapter_count INTEGER NOT NULL DEFAULT 0,
        progress_percentage REAL NOT NULL DEFAULT 0.0,
        target_words INTEGER,
        author_id TEXT NOT NULL DEFAULT '',
        story_timeline_start TEXT,
        story_timeline_end TEXT,
        tags TEXT,
        blockchain_hash TEXT,
        is_public INTEGER NOT NULL DEFAULT 0,
        published_at INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 contents 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contents (
        id TEXT PRIMARY KEY NOT NULL,
        work_id TEXT NOT NULL DEFAULT '',
        chapter_id TEXT,
        order_index INTEGER NOT NULL DEFAULT 0,
        title TEXT,
        type TEXT NOT NULL DEFAULT 'text',
        content_json TEXT,
        word_count INTEGER NOT NULL DEFAULT 0,
        character_count INTEGER NOT NULL DEFAULT 0,
        paragraph_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        version INTEGER NOT NULL DEFAULT 1,
        author_id TEXT NOT NULL DEFAULT '',
        is_collaborative INTEGER NOT NULL DEFAULT 0,
        contributors TEXT,
        story_timeline TEXT,
        characters_involved TEXT,
        location TEXT,
        scene_description TEXT,
        tags TEXT,
        emotion_tone TEXT,
        importance_level INTEGER NOT NULL DEFAULT 3,
        content_hash TEXT,
        blockchain_timestamp INTEGER,
        copyright_status TEXT NOT NULL DEFAULT 'draft',
        is_public INTEGER NOT NULL DEFAULT 0,
        published_at INTEGER,
        writing_duration INTEGER NOT NULL DEFAULT 0,
        last_edited_at INTEGER NOT NULL DEFAULT 0,
        last_editor_id TEXT NOT NULL DEFAULT '',
        notes TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 content_versions 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS content_versions (
        id TEXT PRIMARY KEY NOT NULL,
        content_id TEXT NOT NULL DEFAULT '',
        content_json TEXT NOT NULL DEFAULT '',
        content_html TEXT,
        content_text TEXT,
        word_count INTEGER NOT NULL DEFAULT 0,
        character_count INTEGER NOT NULL DEFAULT 0,
        version_number INTEGER NOT NULL DEFAULT 1,
        change_summary TEXT,
        author_id TEXT NOT NULL DEFAULT '',
        blockchain_hash TEXT,
        created_at INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 collaborative_documents 表（用于 Yjs 协作）
    // 注意: CR-SQLite 不支持除主键外的 UNIQUE 约束
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collaborative_documents (
        id TEXT PRIMARY KEY NOT NULL,
        content_id TEXT NOT NULL DEFAULT '',
        work_id TEXT NOT NULL DEFAULT '',
        document_type TEXT NOT NULL DEFAULT 'text',
        yjs_state BLOB,
        state_vector BLOB,
        max_connections INTEGER NOT NULL DEFAULT 10,
        last_sync_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建索引以提高查询性能
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_works_author ON works(author_id);
      CREATE INDEX IF NOT EXISTS idx_chapters_work ON chapters(work_id);
      CREATE INDEX IF NOT EXISTS idx_chapters_parent ON chapters(parent_id);
      CREATE INDEX IF NOT EXISTS idx_contents_work ON contents(work_id);
      CREATE INDEX IF NOT EXISTS idx_contents_chapter ON contents(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_content_versions_content ON content_versions(content_id);
    `)

    console.log('[CRSQLite] Tables created successfully')
  }

  /**
   * 为所有表启用 CRDT 功能
   */
  private async enableCRDTForTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened')
    }

    const tables = [
      'authors',
      'works',
      'chapters',
      'contents',
      'content_versions',
      'collaborative_documents'
    ]

    for (const table of tables) {
      try {
        // 将表标记为 CRDT 表（Clock-Replicated Table）
        this.db.exec(`SELECT crsql_as_crr('${table}')`)
        console.log(`[CRSQLite] CRDT enabled for table: ${table}`)
      } catch (error) {
        console.error(`[CRSQLite] Failed to enable CRDT for table ${table}:`, error)
        throw error
      }
    }
  }

  /**
   * 获取数据库实例
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }

  /**
   * 获取站点 ID
   */
  getSiteId(): string {
    return this.siteId
  }

  /**
   * 获取数据库版本
   * 用于跟踪数据库的变更
   */
  getDbVersion(): number {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    const result = this.db.prepare('SELECT crsql_db_version() as version').get() as any
    return result.version
  }

  /**
   * 获取自指定版本以来的所有变更
   * 用于同步到其他设备
   */
  getChangesSince(sinceVersion: number): CRSQLiteChange[] {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const changes = this.db.prepare(`
        SELECT * FROM crsql_changes WHERE db_version > ?
      `).all(sinceVersion) as CRSQLiteChange[]

      return changes
    } catch (error) {
      console.error('[CRSQLite] Failed to get changes:', error)
      throw error
    }
  }

  /**
   * 应用从其他设备接收的变更
   */
  applyChanges(changes: CRSQLiteChange[]): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    if (changes.length === 0) {
      return
    }

    const stmt = this.db.prepare(`
      INSERT INTO crsql_changes 
        ("table", "pk", "cid", "val", "col_version", "db_version", "site_id", "cl", "seq")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const applyChangesTransaction = this.db.transaction((changesToApply: CRSQLiteChange[]) => {
      for (const change of changesToApply) {
        try {
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
          )
        } catch (error) {
          console.error('[CRSQLite] Failed to apply change:', change, error)
          // 继续应用其他变更
        }
      }
    })

    try {
      applyChangesTransaction(changes)
      console.log(`[CRSQLite] Applied ${changes.length} changes successfully`)
    } catch (error) {
      console.error('[CRSQLite] Failed to apply changes:', error)
      throw error
    }
  }

  /**
   * 执行 SQL 查询
   */
  exec(sql: string): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    this.db.exec(sql)
  }

  /**
   * 准备 SQL 语句
   */
  prepare(sql: string): Database.Statement {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db.prepare(sql)
  }

  /**
   * 开始事务
   */
  beginTransaction(): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    this.db.exec('BEGIN TRANSACTION')
  }

  /**
   * 提交事务
   */
  commit(): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    this.db.exec('COMMIT')
  }

  /**
   * 回滚事务
   */
  rollback(): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    this.db.exec('ROLLBACK')
  }

  /**
   * 使用事务执行操作
   */
  transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db.transaction(fn)()
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
      console.log('[CRSQLite] Database closed')
    }
  }

  /**
   * 检查数据库是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null
  }

  /**
   * 获取数据库统计信息
   */
  getStats(): {
    siteId: string
    dbVersion: number
    dbPath: string
    isInitialized: boolean
  } {
    return {
      siteId: this.siteId,
      dbVersion: this.isReady() ? this.getDbVersion() : 0,
      dbPath: this.dbPath,
      isInitialized: this.isInitialized
    }
  }

  /**
   * 导出数据库（用于备份）
   */
  exportDatabase(targetPath: string): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      this.db.backup(targetPath)
      console.log(`[CRSQLite] Database exported to: ${targetPath}`)
    } catch (error) {
      console.error('[CRSQLite] Failed to export database:', error)
      throw error
    }
  }

  /**
   * 压缩数据库（VACUUM）
   */
  vacuum(): void {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      this.db.exec('VACUUM')
      console.log('[CRSQLite] Database vacuumed successfully')
    } catch (error) {
      console.error('[CRSQLite] Failed to vacuum database:', error)
      throw error
    }
  }
}
