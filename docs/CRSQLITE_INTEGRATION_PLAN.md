# CR-SQLite 集成方案

## 📋 现有架构分析

### 当前技术栈

```typescript
// 1. 数据库层
- Prisma ORM (6.17.0)
  - 生成的客户端: src/generated/prisma
  - Schema: prisma/schema.prisma
  - 数据库: SQLite (D:/gestell/data/gestell.db)

// 2. 数据访问层 (Repository Pattern)
src/data/
├── RepositoryContainer.ts          // Repository 容器
├── interfaces/                     // 接口定义
└── prisma/                         // Prisma 实现
    ├── UserRepository.ts
    ├── WorkRepository.ts
    ├── ChapterRepository.ts
    ├── ContentRepository.ts
    ├── StatsRepository.ts
    └── CollaborationRepository.ts

// 3. 业务逻辑层 (Service Pattern)
src/services/
├── ServiceContainer.ts             // 服务容器
├── UserService.ts
├── WorkService.ts
├── ChapterService.ts
├── ContentService.ts
├── YjsCollaborationService.ts
└── CollaborativeEditingIntegrationService.ts

// 4. IPC 通信层
src/ipc/
├── IPCManager.ts                   // IPC 管理器
├── UserIPCHandler.ts
├── WorkIPCHandler.ts
├── ChapterIPCHandler.ts
├── ContentIPCHandler.ts
└── SystemIPCHandler.ts

// 5. 核心层
src/core/
├── database.ts                     // DatabaseManager
├── prismadb.ts                     // GestallPrismaDatabase (旧版)
└── ulid.ts                        // ID 生成器

// 6. 主进程
src/main.ts
└── 初始化: DatabaseManager → RepositoryContainer → ServiceContainer → IPCManager
```

### 数据模型 (Prisma Schema)

```prisma
核心表:
- Author (用户)
  * 密码哈希 (PBKDF2)
  * 公钥/私钥 (加密存储)
  * 用户偏好设置

- Work (作品)
  * 协作模式: solo/collaborative
  * 协作者列表 (JSON 字符串)
  * 区块链哈希
  
- Chapter (章节)
  * 树形结构 (parentId, level)
  * 排序索引 (orderIndex)
  
- Content (内容)
  * ProseMirror JSON (contentJson)
  * 版本号
  * 协作标记
  
关联表:
- ContentVersion (内容版本)
- CollaborativeDocument (协同文档)
- CollaborativeSession (协作会话)
- CollaborationInvite (协作邀请)
- CollaborationLog (协作日志)
```

### 现有同步机制

```typescript
// 1. Yjs 实时协作 (字符级别)
YjsCollaborationService:
- WebRTC 连接: y-webrtc
- WebSocket 信令: ws://localhost:4001/signaling
- 自动保存: 5秒间隔
- ProseMirror 绑定: y-prosemirror

// 2. 本地数据库 (Prisma + SQLite)
- 单机模式: 完全本地存储
- 无跨设备同步
- 无冲突解决
```

---

## 🎯 集成目标

### 要实现的功能

1. **跨设备同步**: 同一用户的多个设备数据同步
2. **P2P 去中心化**: 无需中央服务器
3. **冲突解决**: CRDT 自动处理并发修改
4. **离线优先**: 离线编辑，联网后同步
5. **权限控制**: 基于密码学的权限验证

### 不改变的部分

```typescript
✅ 保留:
- Prisma Schema (继续用于类型生成和迁移)
- Repository 接口 (IWorkRepository, IChapterRepository, etc.)
- Service 层接口 (IWorkService, IChapterService, etc.)
- IPC 层接口
- UI 层代码

❌ 替换:
- Prisma Client 的数据操作 (prisma.work.create, etc.)
- 改用 CR-SQLite 直接操作
```

---

## 📦 CR-SQLite 选型

### 版本选择

```json
{
  "@vlcn.io/crsqlite-wasm": "^0.16.0",  // ❌ WASM 版本 (跨平台但慢)
  "@vlcn.io/crsqlite": "^0.16.0"        // ✅ 原生版本 (Electron 适用)
}
```

**选择原因**:
- Electron 环境支持原生模块
- 原生性能比 WASM 快 3-5 倍
- 已有 better-sqlite3 经验，集成容易

### 兼容性检查

```typescript
// CR-SQLite 要求:
- Node.js >= 16
- SQLite >= 3.38
- 支持 loadExtension

// Electron 32.0 环境:
- Node.js: 20.x ✅
- SQLite: 3.45 ✅
- 原生模块: 支持 ✅
```

---

## 🔧 集成方案设计

### 方案 A: 完全替换 Prisma (推荐)

```typescript
架构:
UI Layer
    ↓
IPC Layer
    ↓
Service Layer (不变)
    ↓
Repository Layer (不变接口，新实现)
    ↓
CR-SQLite Layer (新增)
    ↓
SQLite Database

优势:
✅ 最简单，改动最小
✅ 充分利用 CRDT
✅ 性能最优
✅ 维护成本低

劣势:
⚠️ 失去 Prisma 的类型安全 (但可以保留类型定义)
⚠️ 失去 Prisma Migrate (但可以保留用于 Schema 管理)
```

### 方案 B: Prisma + CR-SQLite 双层 (不推荐)

```typescript
架构:
Repository Layer
    ↓
├─→ Prisma (查询用)
└─→ CR-SQLite (写入 + 同步)

优势:
✅ 保留 Prisma 类型安全

劣势:
❌ 双倍维护成本
❌ 数据一致性问题
❌ 性能差
❌ 复杂度高
```

**结论: 采用方案 A**

---

## 🏗️ 详细实施计划

### Phase 1: 基础架构 (Day 1-2)

#### 1.1 安装依赖

```bash
# 安装 CR-SQLite 原生模块
npm install @vlcn.io/crsqlite --save

# 安装类型定义
npm install @types/better-sqlite3 --save-dev
```

#### 1.2 创建 CR-SQLite 管理器

```typescript
// 新建: src/core/crsqlite-manager.ts

import { DB } from '@vlcn.io/crsqlite';
import path from 'path';
import fs from 'fs';

/**
 * CR-SQLite 数据库管理器
 * 负责初始化、连接和基础操作
 */
export class CRSQLiteManager {
  private db: DB | null = null;
  private dbPath: string;
  private siteId: string; // 设备唯一标识
  
  constructor(dbPath: string, siteId: string) {
    this.dbPath = dbPath;
    this.siteId = siteId;
  }
  
  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    console.log('🔧 初始化 CR-SQLite 数据库...');
    console.log('   路径:', this.dbPath);
    console.log('   Site ID:', this.siteId);
    
    // 确保目录存在
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 打开数据库
    this.db = await DB.open(this.dbPath);
    
    // 设置 Site ID (设备唯一标识)
    await this.db.exec(`SELECT crsql_site_id('${this.siteId}')`);
    
    // 创建表结构
    await this.createTables();
    
    // 标记为 CRDT 表
    await this.enableCRDT();
    
    console.log('✅ CR-SQLite 数据库初始化完成');
  }
  
  /**
   * 创建表结构 (从 Prisma Schema 转换)
   */
  private async createTables(): Promise<void> {
    await this.db!.exec(`
      -- 用户表
      CREATE TABLE IF NOT EXISTS authors (
        id TEXT PRIMARY KEY NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        display_name TEXT,
        email TEXT UNIQUE,
        bio TEXT,
        avatar_url TEXT,
        wallet_address TEXT,
        public_key TEXT,
        private_key_encrypted TEXT,
        total_works INTEGER DEFAULT 0,
        total_words INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        preferences TEXT,
        last_active_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      -- 作品表
      CREATE TABLE IF NOT EXISTS works (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        cover_image_url TEXT,
        genre TEXT,
        tags TEXT,
        author_id TEXT NOT NULL,
        collaboration_mode TEXT DEFAULT 'solo',
        collaborators TEXT,
        status TEXT DEFAULT 'draft',
        progress_percentage REAL DEFAULT 0.0,
        total_words INTEGER DEFAULT 0,
        total_characters INTEGER DEFAULT 0,
        chapter_count INTEGER DEFAULT 0,
        target_words INTEGER,
        target_completion_date INTEGER,
        blockchain_hash TEXT,
        nft_token_id TEXT,
        nft_contract_address TEXT,
        copyright_hash TEXT,
        is_public INTEGER DEFAULT 0,
        license_type TEXT DEFAULT 'all_rights_reserved',
        published_at INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (author_id) REFERENCES authors(id)
      );
      
      -- 章节表
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY NOT NULL,
        work_id TEXT NOT NULL,
        parent_id TEXT,
        level INTEGER DEFAULT 1,
        order_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        type TEXT DEFAULT 'chapter',
        status TEXT DEFAULT 'draft',
        word_count INTEGER DEFAULT 0,
        character_count INTEGER DEFAULT 0,
        content_count INTEGER DEFAULT 0,
        child_chapter_count INTEGER DEFAULT 0,
        progress_percentage REAL DEFAULT 0.0,
        target_words INTEGER,
        author_id TEXT NOT NULL,
        story_timeline_start TEXT,
        story_timeline_end TEXT,
        tags TEXT,
        blockchain_hash TEXT,
        is_public INTEGER DEFAULT 0,
        published_at INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (work_id) REFERENCES works(id),
        FOREIGN KEY (parent_id) REFERENCES chapters(id),
        FOREIGN KEY (author_id) REFERENCES authors(id)
      );
      
      -- 内容表
      CREATE TABLE IF NOT EXISTS contents (
        id TEXT PRIMARY KEY NOT NULL,
        work_id TEXT NOT NULL,
        chapter_id TEXT,
        order_index INTEGER NOT NULL,
        title TEXT,
        type TEXT DEFAULT 'text',
        content_json TEXT,
        word_count INTEGER DEFAULT 0,
        character_count INTEGER DEFAULT 0,
        paragraph_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'draft',
        version INTEGER DEFAULT 1,
        author_id TEXT NOT NULL,
        is_collaborative INTEGER DEFAULT 0,
        contributors TEXT,
        story_timeline TEXT,
        characters_involved TEXT,
        location TEXT,
        scene_description TEXT,
        tags TEXT,
        emotion_tone TEXT,
        importance_level INTEGER DEFAULT 3,
        content_hash TEXT,
        blockchain_timestamp INTEGER,
        copyright_status TEXT DEFAULT 'draft',
        is_public INTEGER DEFAULT 0,
        published_at INTEGER,
        writing_duration INTEGER DEFAULT 0,
        last_edited_at INTEGER NOT NULL,
        last_editor_id TEXT NOT NULL,
        notes TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (work_id) REFERENCES works(id),
        FOREIGN KEY (chapter_id) REFERENCES chapters(id),
        FOREIGN KEY (author_id) REFERENCES authors(id),
        FOREIGN KEY (last_editor_id) REFERENCES authors(id)
      );
      
      -- 索引
      CREATE INDEX IF NOT EXISTS idx_works_author ON works(author_id);
      CREATE INDEX IF NOT EXISTS idx_chapters_work ON chapters(work_id);
      CREATE INDEX IF NOT EXISTS idx_chapters_parent ON chapters(parent_id);
      CREATE INDEX IF NOT EXISTS idx_contents_work ON contents(work_id);
      CREATE INDEX IF NOT EXISTS idx_contents_chapter ON contents(chapter_id);
    `);
  }
  
  /**
   * 启用 CRDT 功能
   */
  private async enableCRDT(): Promise<void> {
    // 标记需要同步的表为 CRDT 表
    await this.db!.exec(`
      SELECT crsql_as_crr('authors');
      SELECT crsql_as_crr('works');
      SELECT crsql_as_crr('chapters');
      SELECT crsql_as_crr('contents');
    `);
    
    console.log('✅ CRDT 功能已启用');
  }
  
  /**
   * 获取数据库实例
   */
  getDB(): DB {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }
    return this.db;
  }
  
  /**
   * 获取当前数据库版本
   */
  async getDBVersion(): Promise<bigint> {
    const result = await this.db!.execA('SELECT crsql_db_version()');
    return result[0][0] as bigint;
  }
  
  /**
   * 获取 Site ID
   */
  getSiteId(): string {
    return this.siteId;
  }
  
  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('🗄️ CR-SQLite 数据库已关闭');
    }
  }
}
```

#### 1.3 修改 main.ts 初始化流程

```typescript
// src/main.ts

import { CRSQLiteManager } from './core/crsqlite-manager';
import { ulid } from 'ulid';
import Store from 'electron-store';

// 全局实例
let crSqliteManager: CRSQLiteManager;

// 在 app.whenReady() 中初始化
app.whenReady().then(async () => {
  try {
    // 1. 生成或加载设备 ID
    const store = new Store();
    let deviceId = store.get('deviceId') as string;
    if (!deviceId) {
      deviceId = ulid();
      store.set('deviceId', deviceId);
      console.log('🆔 生成新设备 ID:', deviceId);
    } else {
      console.log('🆔 加载设备 ID:', deviceId);
    }
    
    // 2. 初始化 CR-SQLite (替代 DatabaseManager)
    const dbPath = path.join(app.getPath('userData'), 'gestell-cr.db');
    crSqliteManager = new CRSQLiteManager(dbPath, deviceId);
    await crSqliteManager.initialize();
    
    // 3. 初始化 Repositories (使用 CR-SQLite)
    repositories = new RepositoryContainer(crSqliteManager);
    
    // 4. 初始化 Services
    services = new ServiceContainer(repositories);
    
    // 5. 创建窗口
    createWindow();
    
    // 6. 初始化 IPC
    ipcManager = new IPCManager(services, mainWindow);
    ipcManager.initialize();
    
    console.log('✅ Gestell 启动成功');
  } catch (error) {
    console.error('❌ 启动失败:', error);
    app.quit();
  }
});
```

---

### Phase 2: Repository 层改造 (Day 3-4)

#### 2.1 创建 CR-SQLite Repository 基类

```typescript
// 新建: src/data/crsqlite/CRSQLiteBaseRepository.ts

import { DB } from '@vlcn.io/crsqlite';
import { CRSQLiteManager } from '../../core/crsqlite-manager';

/**
 * CR-SQLite Repository 基类
 * 提供通用的数据库操作方法
 */
export abstract class CRSQLiteBaseRepository {
  protected db: DB;
  protected manager: CRSQLiteManager;
  
  constructor(manager: CRSQLiteManager) {
    this.manager = manager;
    this.db = manager.getDB();
  }
  
  /**
   * 执行查询 (返回数组)
   */
  protected async execA<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return await this.db.execA(sql, params) as T[];
  }
  
  /**
   * 执行查询 (返回对象数组)
   */
  protected async execO<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return await this.db.execO(sql, params) as T[];
  }
  
  /**
   * 执行命令 (INSERT/UPDATE/DELETE)
   */
  protected async exec(sql: string, params: any[] = []): Promise<void> {
    await this.db.exec(sql, params);
  }
  
  /**
   * 开启事务
   */
  protected async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return await this.db.tx(callback);
  }
  
  /**
   * 当前时间戳 (毫秒)
   */
  protected now(): number {
    return Date.now();
  }
  
  /**
   * 生成 ULID
   */
  protected generateId(): string {
    const { ulid } = require('ulid');
    return ulid();
  }
  
  /**
   * 布尔值转整数
   */
  protected boolToInt(value: boolean): number {
    return value ? 1 : 0;
  }
  
  /**
   * 整数转布尔值
   */
  protected intToBool(value: number): boolean {
    return value === 1;
  }
  
  /**
   * JSON 序列化
   */
  protected toJson(obj: any): string {
    return JSON.stringify(obj);
  }
  
  /**
   * JSON 反序列化
   */
  protected fromJson<T = any>(json: string | null): T | null {
    if (!json) return null;
    try {
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }
}
```

#### 2.2 实现 WorkRepository (CR-SQLite 版本)

```typescript
// 新建: src/data/crsqlite/CRSQLiteWorkRepository.ts

import { CRSQLiteBaseRepository } from './CRSQLiteBaseRepository';
import { IWorkRepository, WorkData, PaginationOptions, SortOptions } from '../interfaces';

/**
 * CR-SQLite 作品仓储实现
 */
export class CRSQLiteWorkRepository 
  extends CRSQLiteBaseRepository 
  implements IWorkRepository 
{
  /**
   * 创建新作品
   */
  async create(workData: WorkData): Promise<any> {
    const id = this.generateId();
    const timestamp = this.now();
    
    await this.exec(`
      INSERT INTO works (
        id, title, description, genre, author_id, collaboration_mode,
        status, is_public, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      workData.title,
      workData.description || null,
      workData.genre || 'science_fiction',
      workData.authorId,
      workData.collaborationMode || 'solo',
      'draft',
      this.boolToInt(false),
      timestamp,
      timestamp
    ]);
    
    // 查询创建的作品 (包含关联数据)
    return await this.findById(id);
  }
  
  /**
   * 根据 ID 查找作品
   */
  async findById(id: string): Promise<any | null> {
    // 查询作品基本信息
    const works = await this.execO<any>(`
      SELECT 
        w.*,
        a.id as author_id,
        a.username as author_username,
        a.display_name as author_display_name
      FROM works w
      LEFT JOIN authors a ON w.author_id = a.id
      WHERE w.id = ?
    `, [id]);
    
    if (works.length === 0) return null;
    
    const work = works[0];
    
    // 查询章节数量
    const chapterCount = await this.execA<[number]>(`
      SELECT COUNT(*) FROM chapters WHERE work_id = ?
    `, [id]);
    
    // 查询内容数量
    const contentCount = await this.execA<[number]>(`
      SELECT COUNT(*) FROM contents WHERE work_id = ?
    `, [id]);
    
    // 组装返回数据 (模拟 Prisma 的 include 结构)
    return {
      ...work,
      is_public: this.intToBool(work.is_public),
      author: {
        id: work.author_id,
        username: work.author_username,
        displayName: work.author_display_name
      },
      _count: {
        chapters: chapterCount[0][0],
        contents: contentCount[0][0]
      }
    };
  }
  
  /**
   * 获取作者的作品列表
   */
  async findByAuthor(
    authorId: string,
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Promise<any[]> {
    const limit = pagination?.take || 20;
    const offset = pagination?.skip || 0;
    const sortField = sort?.field || 'updated_at';
    const sortDir = sort?.direction || 'desc';
    
    const works = await this.execO<any>(`
      SELECT 
        w.*,
        a.username as author_username,
        a.display_name as author_display_name,
        (SELECT COUNT(*) FROM chapters WHERE work_id = w.id) as chapter_count,
        (SELECT COUNT(*) FROM contents WHERE work_id = w.id) as content_count
      FROM works w
      LEFT JOIN authors a ON w.author_id = a.id
      WHERE w.author_id = ?
      ORDER BY w.${sortField} ${sortDir.toUpperCase()}
      LIMIT ? OFFSET ?
    `, [authorId, limit, offset]);
    
    // 转换数据类型
    return works.map(work => ({
      ...work,
      is_public: this.intToBool(work.is_public),
      author: {
        id: authorId,
        username: work.author_username,
        displayName: work.author_display_name
      },
      _count: {
        chapters: work.chapter_count,
        contents: work.content_count
      }
    }));
  }
  
  /**
   * 获取所有作品
   */
  async findAll(
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Promise<any[]> {
    const limit = pagination?.take || 100;
    const offset = pagination?.skip || 0;
    const sortField = sort?.field || 'updated_at';
    const sortDir = sort?.direction || 'desc';
    
    const works = await this.execO<any>(`
      SELECT 
        w.*,
        a.id as author_id,
        a.username as author_username,
        a.display_name as author_display_name,
        (SELECT COUNT(*) FROM chapters WHERE work_id = w.id) as chapter_count,
        (SELECT COUNT(*) FROM contents WHERE work_id = w.id) as content_count
      FROM works w
      LEFT JOIN authors a ON w.author_id = a.id
      ORDER BY w.${sortField} ${sortDir.toUpperCase()}
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    
    return works.map(work => ({
      ...work,
      is_public: this.intToBool(work.is_public),
      author: {
        id: work.author_id,
        username: work.author_username,
        displayName: work.author_display_name
      },
      _count: {
        chapters: work.chapter_count,
        contents: work.content_count
      }
    }));
  }
  
  /**
   * 更新作品
   */
  async update(id: string, data: Partial<WorkData>): Promise<any> {
    const setClauses: string[] = [];
    const values: any[] = [];
    
    // 构建 SET 子句
    if (data.title !== undefined) {
      setClauses.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      setClauses.push('description = ?');
      values.push(data.description);
    }
    if (data.genre !== undefined) {
      setClauses.push('genre = ?');
      values.push(data.genre);
    }
    if (data.collaborationMode !== undefined) {
      setClauses.push('collaboration_mode = ?');
      values.push(data.collaborationMode);
    }
    
    // 更新时间
    setClauses.push('updated_at = ?');
    values.push(this.now());
    
    // WHERE 条件
    values.push(id);
    
    await this.exec(`
      UPDATE works SET ${setClauses.join(', ')} WHERE id = ?
    `, values);
    
    return await this.findById(id);
  }
  
  /**
   * 删除作品
   */
  async delete(id: string): Promise<void> {
    // 软删除: 仅更新状态
    await this.exec(`
      UPDATE works SET status = 'deleted', updated_at = ? WHERE id = ?
    `, [this.now(), id]);
    
    // 如果需要硬删除:
    // await this.exec('DELETE FROM works WHERE id = ?', [id]);
  }
  
  /**
   * 统计作品数据
   */
  async getStats(workId: string): Promise<any> {
    const stats = await this.execO<any>(`
      SELECT
        (SELECT COUNT(*) FROM chapters WHERE work_id = ?) as chapter_count,
        (SELECT SUM(word_count) FROM contents WHERE work_id = ?) as total_words,
        (SELECT SUM(character_count) FROM contents WHERE work_id = ?) as total_characters
    `, [workId, workId, workId]);
    
    return stats[0] || { chapter_count: 0, total_words: 0, total_characters: 0 };
  }
}
```

#### 2.3 类似地实现其他 Repositories

```typescript
// 新建: src/data/crsqlite/CRSQLiteUserRepository.ts
// 新建: src/data/crsqlite/CRSQLiteChapterRepository.ts
// 新建: src/data/crsqlite/CRSQLiteContentRepository.ts
// 新建: src/data/crsqlite/CRSQLiteStatsRepository.ts
// 新建: src/data/crsqlite/CRSQLiteCollaborationRepository.ts
```

#### 2.4 修改 RepositoryContainer

```typescript
// src/data/RepositoryContainer.ts

import { CRSQLiteManager } from '../core/crsqlite-manager';
import { CRSQLiteWorkRepository } from './crsqlite/CRSQLiteWorkRepository';
import { CRSQLiteUserRepository } from './crsqlite/CRSQLiteUserRepository';
// ... 其他 imports

export class RepositoryContainer {
    private manager: CRSQLiteManager;
    
    // Repositories
    private _userRepository?: IUserRepository;
    private _workRepository?: IWorkRepository;
    // ...
    
    constructor(manager: CRSQLiteManager) {
        this.manager = manager;
    }
    
    get userRepository(): IUserRepository {
        if (!this._userRepository) {
            this._userRepository = new CRSQLiteUserRepository(this.manager);
        }
        return this._userRepository;
    }
    
    get workRepository(): IWorkRepository {
        if (!this._workRepository) {
            this._workRepository = new CRSQLiteWorkRepository(this.manager);
        }
        return this._workRepository;
    }
    
    // ... 其他 getters
}
```

---

### Phase 3: P2P 同步层 (Day 5-7)

#### 3.1 创建 P2P 同步服务

```typescript
// 新建: src/services/CRSQLiteSyncService.ts

import { CRSQLiteManager } from '../core/crsqlite-manager';
import { EventEmitter } from 'events';

interface SyncChange {
  table: string;
  pk: string;
  cid: string;
  val: any;
  col_version: bigint;
  db_version: bigint;
  site_id: string;
}

/**
 * CR-SQLite P2P 同步服务
 * 负责设备间的数据同步
 */
export class CRSQLiteSyncService extends EventEmitter {
  private manager: CRSQLiteManager;
  private lastSyncVersion: bigint = 0n;
  private syncInterval: NodeJS.Timeout | null = null;
  private p2pNetwork: any; // P2P 网络层 (稍后实现)
  
  constructor(manager: CRSQLiteManager) {
    super();
    this.manager = manager;
  }
  
  /**
   * 启动同步
   */
  async start(p2pNetwork: any): Promise<void> {
    this.p2pNetwork = p2pNetwork;
    
    // 加载上次同步版本
    this.lastSyncVersion = await this.manager.getDBVersion();
    
    // 监听远程变更
    this.p2pNetwork.on('crsql-changes', (data: { changes: SyncChange[], fromPeer: string }) => {
      this.handleRemoteChanges(data.changes, data.fromPeer);
    });
    
    // 定期推送本地变更
    this.syncInterval = setInterval(() => {
      this.pushLocalChanges();
    }, 5000); // 每 5 秒同步一次
    
    console.log('✅ CR-SQLite 同步服务已启动');
  }
  
  /**
   * 停止同步
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('🛑 CR-SQLite 同步服务已停止');
  }
  
  /**
   * 推送本地变更到其他设备
   */
  private async pushLocalChanges(): Promise<void> {
    try {
      const changes = await this.getLocalChanges();
      
      if (changes.length > 0) {
        console.log(`📤 推送 ${changes.length} 个变更到远程设备`);
        
        // 广播到所有连接的设备
        this.p2pNetwork.broadcast({
          type: 'crsql-changes',
          changes
        });
        
        // 更新同步版本
        this.lastSyncVersion = await this.manager.getDBVersion();
      }
    } catch (error) {
      console.error('❌ 推送本地变更失败:', error);
    }
  }
  
  /**
   * 获取本地变更
   */
  private async getLocalChanges(): Promise<SyncChange[]> {
    const db = this.manager.getDB();
    
    const changes = await db.execO<SyncChange>(`
      SELECT 
        "table", 
        "pk", 
        "cid", 
        "val", 
        "col_version", 
        "db_version", 
        "site_id"
      FROM crsql_changes
      WHERE db_version > ?
      ORDER BY db_version ASC
    `, [this.lastSyncVersion]);
    
    return changes;
  }
  
  /**
   * 处理远程变更
   */
  private async handleRemoteChanges(changes: SyncChange[], fromPeer: string): Promise<void> {
    if (changes.length === 0) return;
    
    console.log(`📥 接收到来自 ${fromPeer} 的 ${changes.length} 个变更`);
    
    try {
      await this.applyRemoteChanges(changes);
      
      // 触发事件通知 UI 更新
      this.emit('data-changed', {
        source: 'remote',
        peer: fromPeer,
        changeCount: changes.length
      });
      
      console.log('✅ 远程变更已应用');
    } catch (error) {
      console.error('❌ 应用远程变更失败:', error);
    }
  }
  
  /**
   * 应用远程变更
   */
  private async applyRemoteChanges(changes: SyncChange[]): Promise<void> {
    const db = this.manager.getDB();
    
    // 在事务中批量应用
    await db.tx(async () => {
      for (const change of changes) {
        // CR-SQLite 会自动处理冲突解决
        await db.exec(`
          INSERT INTO crsql_changes 
            ("table", "pk", "cid", "val", "col_version", "db_version", "site_id")
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          change.table,
          change.pk,
          change.cid,
          change.val,
          change.col_version,
          change.db_version,
          change.site_id
        ]);
      }
    });
    
    // 更新同步版本
    this.lastSyncVersion = await this.manager.getDBVersion();
  }
  
  /**
   * 手动触发全量同步
   */
  async fullSync(): Promise<void> {
    console.log('🔄 开始全量同步...');
    
    // 获取所有变更
    this.lastSyncVersion = 0n;
    await this.pushLocalChanges();
    
    console.log('✅ 全量同步完成');
  }
}
```

#### 3.2 创建 P2P 网络层

```typescript
// 新建: src/services/P2PNetworkService.ts

import { EventEmitter } from 'events';
import Peer, { DataConnection } from 'peerjs';

/**
 * P2P 网络服务
 * 基于 PeerJS 实现设备间连接
 */
export class P2PNetworkService extends EventEmitter {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private userId: string;
  private peerId: string;
  
  constructor(userId: string) {
    super();
    this.userId = userId;
    this.peerId = `gestell-${userId}`;
  }
  
  /**
   * 初始化 P2P 网络
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 创建 Peer 实例
      this.peer = new Peer(this.peerId, {
        host: 'localhost', // 或使用公共信令服务器
        port: 9000,
        path: '/peerjs'
      });
      
      this.peer.on('open', (id) => {
        console.log('✅ P2P 网络已连接, Peer ID:', id);
        this.setupPeerHandlers();
        resolve();
      });
      
      this.peer.on('error', (error) => {
        console.error('❌ P2P 网络错误:', error);
        reject(error);
      });
    });
  }
  
  /**
   * 设置 Peer 事件处理器
   */
  private setupPeerHandlers(): void {
    if (!this.peer) return;
    
    // 监听连接请求
    this.peer.on('connection', (conn) => {
      this.handleConnection(conn);
    });
    
    // 监听断开
    this.peer.on('disconnected', () => {
      console.log('⚠️ P2P 网络断开连接');
      this.emit('disconnected');
    });
  }
  
  /**
   * 处理新连接
   */
  private handleConnection(conn: DataConnection): void {
    console.log(`🔗 新连接来自: ${conn.peer}`);
    
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.emit('peer-connected', conn.peer);
      
      // 设置数据接收处理
      conn.on('data', (data: any) => {
        this.handleData(data, conn.peer);
      });
      
      conn.on('close', () => {
        this.connections.delete(conn.peer);
        this.emit('peer-disconnected', conn.peer);
        console.log(`🔌 连接断开: ${conn.peer}`);
      });
    });
  }
  
  /**
   * 处理接收到的数据
   */
  private handleData(data: any, fromPeer: string): void {
    // 触发特定类型的事件
    if (data.type) {
      this.emit(data.type, { ...data, fromPeer });
    }
  }
  
  /**
   * 连接到其他设备
   */
  async connect(targetPeerId: string): Promise<void> {
    if (!this.peer) {
      throw new Error('P2P 网络未初始化');
    }
    
    if (this.connections.has(targetPeerId)) {
      console.log(`⚠️ 已连接到 ${targetPeerId}`);
      return;
    }
    
    console.log(`🔗 连接到: ${targetPeerId}`);
    const conn = this.peer.connect(targetPeerId);
    this.handleConnection(conn);
  }
  
  /**
   * 广播消息到所有连接的设备
   */
  broadcast(data: any): void {
    for (const [peerId, conn] of this.connections) {
      if (conn.open) {
        conn.send(data);
      }
    }
  }
  
  /**
   * 发送消息到特定设备
   */
  send(peerId: string, data: any): void {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(data);
    } else {
      console.error(`❌ 未连接到 ${peerId}`);
    }
  }
  
  /**
   * 获取已连接的设备列表
   */
  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys());
  }
  
  /**
   * 关闭 P2P 网络
   */
  close(): void {
    // 关闭所有连接
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    
    // 销毁 Peer
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    console.log('🔌 P2P 网络已关闭');
  }
}
```

---

### Phase 4: Service 层集成 (Day 8)

#### 4.1 修改 ServiceContainer

```typescript
// src/services/ServiceContainer.ts

import { CRSQLiteManager } from '../core/crsqlite-manager';
import { CRSQLiteSyncService } from './CRSQLiteSyncService';
import { P2PNetworkService } from './P2PNetworkService';

export class ServiceContainer {
    private repositories: RepositoryContainer;
    private crypto: GestallCrypto;
    
    // 新增: 同步相关服务
    private _crSQLiteSyncService?: CRSQLiteSyncService;
    private _p2pNetworkService?: P2PNetworkService;
    
    // ...现有代码...
    
    /**
     * 获取 CR-SQLite 同步服务
     */
    get crSQLiteSyncService(): CRSQLiteSyncService {
        if (!this._crSQLiteSyncService) {
            const manager = this.repositories.getManager(); // 需要添加这个方法
            this._crSQLiteSyncService = new CRSQLiteSyncService(manager);
        }
        return this._crSQLiteSyncService;
    }
    
    /**
     * 获取 P2P 网络服务
     */
    get p2pNetworkService(): P2PNetworkService {
        if (!this._p2pNetworkService) {
            // 需要从某处获取当前用户 ID
            const currentUserId = 'user-id'; // TODO: 从配置或登录状态获取
            this._p2pNetworkService = new P2PNetworkService(currentUserId);
        }
        return this._p2pNetworkService;
    }
}
```

---

### Phase 5: 测试和调试 (Day 9-10)

#### 5.1 创建测试页面

```typescript
// test/crsqlite-sync-test.html

<!DOCTYPE html>
<html>
<head>
  <title>CR-SQLite Sync Test</title>
</head>
<body>
  <h1>CR-SQLite 同步测试</h1>
  
  <div>
    <h2>设备信息</h2>
    <p>Site ID: <span id="siteId"></span></p>
    <p>DB Version: <span id="dbVersion"></span></p>
  </div>
  
  <div>
    <h2>操作</h2>
    <button onclick="createWork()">创建作品</button>
    <button onclick="listWorks()">列出作品</button>
    <button onclick="syncNow()">立即同步</button>
  </div>
  
  <div>
    <h2>连接的设备</h2>
    <ul id="peers"></ul>
  </div>
  
  <div>
    <h2>作品列表</h2>
    <ul id="works"></ul>
  </div>
  
  <script>
    // 测试逻辑...
  </script>
</body>
</html>
```

---

## 📊 迁移策略

### 数据迁移

```typescript
// 新建: src/migrations/migrate-to-crsqlite.ts

/**
 * 从 Prisma 数据库迁移到 CR-SQLite
 */
export async function migrateToCRSQLite(
  prismaDb: PrismaClient,
  crSqliteManager: CRSQLiteManager
): Promise<void> {
  console.log('🔄 开始数据迁移...');
  
  const db = crSqliteManager.getDB();
  
  // 1. 迁移用户
  const authors = await prismaDb.author.findMany();
  for (const author of authors) {
    await db.exec(`
      INSERT OR REPLACE INTO authors (...) VALUES (...)
    `, [/* 数据 */]);
  }
  console.log(`✅ 迁移了 ${authors.length} 个用户`);
  
  // 2. 迁移作品
  const works = await prismaDb.work.findMany();
  for (const work of works) {
    await db.exec(`
      INSERT OR REPLACE INTO works (...) VALUES (...)
    `, [/* 数据 */]);
  }
  console.log(`✅ 迁移了 ${works.length} 个作品`);
  
  // 3. 迁移章节
  // 4. 迁移内容
  
  console.log('✅ 数据迁移完成');
}
```

---

## ⚠️ 注意事项

### 1. Prisma 的保留

```typescript
保留 Prisma 用于:
✅ Schema 定义 (单一数据源)
✅ 类型生成 (TypeScript 类型安全)
✅ Migration 生成 (Schema 变更管理)

但不再使用:
❌ prisma.work.create()
❌ prisma.work.findMany()
❌ prisma.$transaction()
```

### 2. 类型安全

```typescript
// 继续使用 Prisma 生成的类型
import { Work, Chapter, Content } from '../generated/prisma';

// 但数据操作使用 CR-SQLite
const work: Work = await workRepository.findById(id);
```

### 3. 性能优化

```typescript
// 1. 使用索引
CREATE INDEX idx_works_author ON works(author_id);

// 2. 批量操作
await db.tx(async () => {
  for (const item of items) {
    await db.exec('INSERT ...');
  }
});

// 3. 限制同步频率
const SYNC_INTERVAL = 5000; // 5秒
```

---

## 🎯 总结

### 集成步骤总览

```
Day 1-2: 基础架构
  ├─ 安装 CR-SQLite
  ├─ 创建 CRSQLiteManager
  └─ 修改 main.ts 初始化

Day 3-4: Repository 层
  ├─ 创建 CRSQLiteBaseRepository
  ├─ 实现各个 Repository
  └─ 修改 RepositoryContainer

Day 5-7: P2P 同步层
  ├─ 创建 CRSQLiteSyncService
  ├─ 创建 P2PNetworkService
  └─ 集成到 ServiceContainer

Day 8: Service 层集成
  └─ 修改 ServiceContainer

Day 9-10: 测试和调试
  ├─ 单设备测试
  ├─ 多设备同步测试
  └─ 冲突解决测试

总计: 10 天完成集成
```

### 核心优势

```
✅ 最小改动: 只改 Repository 层实现
✅ 类型安全: 继续使用 Prisma 类型
✅ 向后兼容: Service/IPC/UI 层无需改动
✅ 高性能: 原生 CR-SQLite
✅ 自动 CRDT: 内置冲突解决
✅ P2P 去中心化: 无需中央服务器
```

---

## 🚀 下一步

需要我开始实施第一阶段 (Day 1-2: 基础架构) 吗？

包括:
1. 安装 CR-SQLite 依赖
2. 创建 CRSQLiteManager 类
3. 修改 main.ts 初始化流程
4. 创建基础测试
