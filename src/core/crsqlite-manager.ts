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
   * 基于项目数据模型的定义
   */
  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not opened')
    }

    // 注意：不要删除已存在的表，以保持数据持久性
    // 只有在开发时需要重置数据结构时才手动删除表

    // 创建 authors 表
    // 统一使用 camelCase 字段命名，不再做映射转换
    // 注意: CR-SQLite 要求:
    // 1. 不支持除主键外的 UNIQUE 约束（唯一性在应用层检查）
    // 2. 所有 NOT NULL 列必须有 DEFAULT 值（确保模式兼容性）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS authors (
        id TEXT PRIMARY KEY NOT NULL,
        username TEXT NOT NULL DEFAULT '',
        passwordHash TEXT,
        displayName TEXT,
        email TEXT,
        bio TEXT,
        avatarUrl TEXT,
        walletAddress TEXT,
        publicKey TEXT,
        privateKeyEncrypted TEXT,
        totalWorks INTEGER NOT NULL DEFAULT 0,
        totalWords INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        preferences TEXT,
        lastActiveAt INTEGER,
        createdAt INTEGER NOT NULL DEFAULT 0,
        updatedAt INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 works 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS works (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        subtitle TEXT,
        description TEXT,
        coverImageUrl TEXT,
        genre TEXT,
        tags TEXT,
        authorId TEXT NOT NULL DEFAULT '',
        collaborationMode TEXT NOT NULL DEFAULT 'solo',
        collaborators TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        progressPercentage REAL NOT NULL DEFAULT 0.0,
        totalWords INTEGER NOT NULL DEFAULT 0,
        totalCharacters INTEGER NOT NULL DEFAULT 0,
        chapterCount INTEGER NOT NULL DEFAULT 0,
        targetWords INTEGER,
        targetCompletionDate INTEGER,
        blockchainHash TEXT,
        nftTokenId TEXT,
        nftContractAddress TEXT,
        copyrightHash TEXT,
        isPublic INTEGER NOT NULL DEFAULT 0,
        licenseType TEXT NOT NULL DEFAULT 'all_rights_reserved',
        publishedAt INTEGER,
        metadata TEXT,
        createdAt INTEGER NOT NULL DEFAULT 0,
        updatedAt INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 chapters 表
    // 注意: CR-SQLite 不支持外键约束，外键引用关系在应用层维护
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY NOT NULL,
        workId TEXT NOT NULL DEFAULT '',
        parentId TEXT,
        level INTEGER NOT NULL DEFAULT 1,
        orderIndex INTEGER NOT NULL DEFAULT 0,
        title TEXT NOT NULL DEFAULT '',
        subtitle TEXT,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'chapter',
        status TEXT NOT NULL DEFAULT 'draft',
        wordCount INTEGER NOT NULL DEFAULT 0,
        characterCount INTEGER NOT NULL DEFAULT 0,
        contentCount INTEGER NOT NULL DEFAULT 0,
        childChapterCount INTEGER NOT NULL DEFAULT 0,
        progressPercentage REAL NOT NULL DEFAULT 0.0,
        targetWords INTEGER,
        authorId TEXT NOT NULL DEFAULT '',
        storyTimelineStart TEXT,
        storyTimelineEnd TEXT,
        tags TEXT,
        blockchainHash TEXT,
        isPublic INTEGER NOT NULL DEFAULT 0,
        publishedAt INTEGER,
        metadata TEXT,
        createdAt INTEGER NOT NULL DEFAULT 0,
        updatedAt INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 contents 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contents (
        id TEXT PRIMARY KEY NOT NULL,
        workId TEXT NOT NULL DEFAULT '',
        chapterId TEXT,
        orderIndex INTEGER NOT NULL DEFAULT 0,
        title TEXT,
        type TEXT NOT NULL DEFAULT 'text',
        contentJson TEXT,
        wordCount INTEGER NOT NULL DEFAULT 0,
        characterCount INTEGER NOT NULL DEFAULT 0,
        paragraphCount INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft',
        version INTEGER NOT NULL DEFAULT 1,
        authorId TEXT NOT NULL DEFAULT '',
        isCollaborative INTEGER NOT NULL DEFAULT 0,
        contributors TEXT,
        storyTimeline TEXT,
        charactersInvolved TEXT,
        location TEXT,
        sceneDescription TEXT,
        tags TEXT,
        emotionTone TEXT,
        importanceLevel INTEGER NOT NULL DEFAULT 3,
        contentHash TEXT,
        blockchainTimestamp INTEGER,
        copyrightStatus TEXT NOT NULL DEFAULT 'draft',
        isPublic INTEGER NOT NULL DEFAULT 0,
        publishedAt INTEGER,
        writingDuration INTEGER NOT NULL DEFAULT 0,
        lastEditedAt INTEGER NOT NULL DEFAULT 0,
        lastEditorId TEXT NOT NULL DEFAULT '',
        notes TEXT,
        metadata TEXT,
        createdAt INTEGER NOT NULL DEFAULT 0,
        updatedAt INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 content_versions 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contentVersions (
        id TEXT PRIMARY KEY NOT NULL,
        contentId TEXT NOT NULL DEFAULT '',
        contentJson TEXT NOT NULL DEFAULT '',
        contentHtml TEXT,
        contentText TEXT,
        wordCount INTEGER NOT NULL DEFAULT 0,
        characterCount INTEGER NOT NULL DEFAULT 0,
        versionNumber INTEGER NOT NULL DEFAULT 1,
        changeSummary TEXT,
        authorId TEXT NOT NULL DEFAULT '',
        blockchainHash TEXT,
        createdAt INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建 collaborative_documents 表（用于 Yjs 协作）
    // 注意: CR-SQLite 不支持除主键外的 UNIQUE 约束
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collaborativeDocuments (
        id TEXT PRIMARY KEY NOT NULL,
        contentId TEXT NOT NULL DEFAULT '',
        workId TEXT NOT NULL DEFAULT '',
        documentType TEXT NOT NULL DEFAULT 'text',
        yjsState BLOB,
        stateVector BLOB,
        maxConnections INTEGER NOT NULL DEFAULT 10,
        lastSyncAt INTEGER,
        createdAt INTEGER NOT NULL DEFAULT 0,
        updatedAt INTEGER NOT NULL DEFAULT 0
      )
    `)

    // 创建索引以提高查询性能
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_works_author ON works(authorId);
      CREATE INDEX IF NOT EXISTS idx_chapters_work ON chapters(workId);
      CREATE INDEX IF NOT EXISTS idx_chapters_parent ON chapters(parentId);
      CREATE INDEX IF NOT EXISTS idx_contents_work ON contents(workId);
      CREATE INDEX IF NOT EXISTS idx_contents_chapter ON contents(chapterId);
      CREATE INDEX IF NOT EXISTS idx_content_versions_content ON contentVersions(contentId);
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
      'contentVersions',
      'collaborativeDocuments'
    ]

    console.log(`[CRSQLite] 开始为 ${tables.length} 个表启用 CRDT 功能`)

    for (const table of tables) {
      try {
        console.log(`[CRSQLite] 正在检查表 ${table}...`)
        
        // 首先检查表是否存在
        const tableExists = this.db.prepare(`
          SELECT COUNT(*) as count 
          FROM sqlite_master 
          WHERE type='table' AND name=?
        `).get(table) as { count: number }

        if (tableExists.count === 0) {
          console.log(`[CRSQLite] 表 ${table} 不存在，跳过 CRDT 设置`)
          continue
        }

        // 检查表是否已经是 CRDT 表
        let isCRDTTable = false
        try {
          const result = this.db.prepare(`
            SELECT COUNT(*) as count 
            FROM crsql_master 
            WHERE tbl_name = ?
          `).get(table) as { count: number }
          
          isCRDTTable = result.count > 0
        } catch (masterTableError) {
          // crsql_master 可能不存在，说明还没有任何 CRDT 表
          console.log(`[CRSQLite] crsql_master 表不存在，${table} 需要设置为 CRDT 表`)
          isCRDTTable = false
        }

        if (!isCRDTTable) {
          // 表还不是 CRDT 表，将其标记为 CRDT 表（Clock-Replicated Table）
          console.log(`[CRSQLite] 正在为表 ${table} 启用 CRDT...`)
          this.db.exec(`SELECT crsql_as_crr('${table}')`)
          console.log(`[CRSQLite] ✅ CRDT 已为表 ${table} 启用`)
        } else {
          console.log(`[CRSQLite] ✅ 表 ${table} 已经是 CRDT 表`)
        }
      } catch (error) {
        // 更详细的错误处理
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase()
          
          if (errorMessage.includes('already a crr') || 
              errorMessage.includes('table is already') ||
              errorMessage.includes('already has clock')) {
            console.log(`[CRSQLite] ✅ 表 ${table} 已经是 CRDT 表 (通过错误确认)`)
          } else {
            console.error(`[CRSQLite] ❌ 为表 ${table} 启用 CRDT 失败:`, error.message)
            // 不要抛出错误，继续处理其他表
            console.error(`[CRSQLite] 继续处理其他表...`)
          }
        } else {
          console.error(`[CRSQLite] ❌ 为表 ${table} 启用 CRDT 时出现未知错误:`, error)
        }
      }
    }

    console.log(`[CRSQLite] ✅ CRDT 表设置完成`)
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
