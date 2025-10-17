# Gestell 项目当前架构全面分析

**分析时间:** 2025年10月17日  
**项目状态:** 已完成 Prisma → CR-SQLite 迁移，准备进入功能开发阶段

---

## 📋 项目概述

**Gestell（座架）** 是一个基于现代技术栈构建的**去中心化科幻写作平台**，具有以下核心特性：

- 🎨 **现代化桌面应用** - Electron 32.x + Vue 3 + TypeScript
- 📝 **专业富文本编辑** - ProseMirror 富文本编辑器
- 🔄 **实时协作** - Yjs CRDT 字符级协同编辑
- 💾 **CRDT 数据库** - CR-SQLite 原生支持冲突自动解决
- 🏗️ **清洁架构** - Repository Pattern + Service Layer + DI 容器
- 🔐 **加密安全** - RSA/AES 端到端加密
- 🌐 **去中心化** - P2P 协作，无需中心服务器

---

## 🏗️ 技术架构

### 核心技术栈

```typescript
// 前端框架
- Vue 3.5.22 + Composition API
- TypeScript 5.9.3 (严格模式)
- Pinia 3.0.3 (状态管理)
- Vue Router 4.5.1 (路由)

// 桌面框架
- Electron 32.0.0
  - 主进程: Node.js + TypeScript
  - 渲染进程: Vue 3 + Vite
  - IPC通信: 类型安全的事件系统

// 构建工具
- Vite 6.3.6 (前端构建)
- TypeScript Compiler (主进程构建)
- Electron Builder (打包)

// 数据库层
- CR-SQLite (@vlcn.io/crsqlite 0.16.3)
  - 基于 SQLite 的 CRDT 数据库
  - 自动冲突解决
  - P2P 同步支持
- better-sqlite3 12.4.1 (Node.js 驱动)

// 实时协作
- Yjs 13.6.27 (CRDT 框架)
- y-prosemirror 1.3.7 (编辑器绑定)
- y-webrtc 10.3.0 (P2P 连接)
- y-websocket 3.0.0 (WebSocket 信令)

// 富文本编辑
- ProseMirror 生态系统
  - prosemirror-model
  - prosemirror-state
  - prosemirror-view
  - prosemirror-commands
  - prosemirror-history
  - prosemirror-menu

// 加密与安全
- Node.js Crypto API (内置)
- crypto-js 4.2.0 (辅助加密)

// 工具库
- ULID 2.3.0 (时间排序的唯一ID)
- Sortable.js 1.15.6 (拖拽排序)
- JSZip 3.10.1 (文件压缩)
- Highlight.js 11.10.0 (代码高亮)
- Marked 14.1.2 (Markdown 解析)
```

---

## 📁 项目结构分析

### 目录结构

```
gestell/
├── src/                          # 源代码
│   ├── main.ts                   # Electron 主进程入口
│   ├── preload.js                # 渲染进程预加载脚本
│   │
│   ├── core/                     # 核心基础设施层
│   │   ├── crsqlite-manager.ts   # CR-SQLite 管理器（核心）
│   │   ├── storage/              # 本地存储
│   │   │   └── AuthorConfigStore.ts  # 用户配置存储
│   │   └── ulid.ts               # ULID 生成器
│   │
│   ├── repositories/             # 数据访问层（Repository Pattern）
│   │   ├── RepositoryContainer.ts    # Repository 容器（DI）
│   │   ├── interfaces/               # Repository 接口定义
│   │   │   ├── IAuthorRepository.ts
│   │   │   ├── IWorkRepository.ts
│   │   │   ├── IChapterRepository.ts
│   │   │   ├── IContentRepository.ts
│   │   │   └── IStatsRepository.ts
│   │   └── crsqlite/                 # CR-SQLite 实现
│   │       ├── CRSQLiteAuthorRepository.ts
│   │       ├── CRSQLiteWorkRepository.ts
│   │       ├── CRSQLiteChapterRepository.ts
│   │       ├── CRSQLiteContentRepository.ts
│   │       └── CRSQLiteCollaborationRepository.ts
│   │
│   ├── services/                 # 业务逻辑层（Service Layer）
│   │   ├── ServiceContainer.ts           # 服务容器（DI）
│   │   ├── interfaces/                   # 服务接口定义
│   │   ├── AuthorService.ts              # 用户服务
│   │   ├── WorkService.ts                # 作品服务
│   │   ├── ChapterService.ts             # 章节服务
│   │   ├── ContentService.ts             # 内容服务
│   │   ├── YjsCollaborationService.ts    # Yjs 协作服务
│   │   └── CollaborativeEditingIntegrationService.ts  # 协作集成
│   │
│   ├── ipc/                      # IPC 通信层
│   │   ├── IPCManager.ts                 # IPC 管理器
│   │   ├── AuthorIPCHandler.ts           # 用户 IPC
│   │   ├── WorkIPCHandler.ts             # 作品 IPC
│   │   ├── ChapterIPCHandler.ts          # 章节 IPC
│   │   ├── ContentIPCHandler.ts          # 内容 IPC
│   │   ├── SystemIPCHandler.ts           # 系统 IPC
│   │   ├── test-crsqlite-handlers.ts     # CR-SQLite 测试
│   │   └── test-crsqlite-full-handlers.ts # 完整测试
│   │
│   ├── crypto/                   # 加密模块
│   │   └── crypto.ts             # RSA/AES 加密服务
│   │
│   ├── shared/                   # 共享类型和工具
│   │   └── types.ts              # 通用类型定义
│   │
│   ├── utils/                    # 工具函数
│   │
│   └── ui/                       # Vue 3 前端应用
│       ├── index.html            # 应用入口页面
│       ├── main.ts               # Vue 应用启动
│       ├── App.vue               # 根组件
│       ├── style.css             # 全局样式
│       │
│       ├── components/           # 可复用组件
│       │   ├── ChapterNode.vue           # 章节树节点
│       │   ├── ChapterTree.vue           # 章节树组件
│       │   ├── ProseMirrorEditor.vue     # 富文本编辑器
│       │   ├── StatusBar.vue             # 状态栏
│       │   └── TitleBar.vue              # 自定义标题栏
│       │
│       ├── views/                # 页面视图
│       │   ├── HomeView.vue              # 主页
│       │   ├── LoginView.vue             # 登录页
│       │   ├── WorkListView.vue          # 作品列表
│       │   ├── WorkView.vue              # 作品管理
│       │   ├── EditorView.vue            # 编辑器
│       │   ├── WritingView.vue           # 写作视图
│       │   ├── CharactersView.vue        # 角色管理
│       │   ├── LocationsView.vue         # 地点管理
│       │   ├── TimelineView.vue          # 时间线
│       │   ├── SettingsView.vue          # 设置
│       │   └── AboutView.vue             # 关于
│       │
│       ├── stores/               # Pinia 状态管理
│       │   ├── index.ts                  # Store 导出
│       │   ├── app.ts                    # 应用状态
│       │   ├── user.ts                   # 用户状态
│       │   ├── work.ts                   # 作品状态
│       │   ├── chapter.ts                # 章节状态
│       │   └── editor.ts                 # 编辑器状态
│       │
│       ├── router/               # Vue Router 配置
│       │   └── index.ts                  # 路由定义
│       │
│       ├── services/             # 前端服务层
│       │   └── api.ts                    # IPC 通信封装
│       │
│       ├── composables/          # 组合式函数
│       │
│       ├── types/                # UI 类型定义
│       │   ├── electron.ts               # Electron IPC 类型
│       │   └── models.ts                 # 前端数据模型
│       │
│       └── utils/                # UI 工具函数
│           └── prosemirror-menu.ts       # 编辑器菜单配置
│
├── data/                         # 应用数据目录
│   └── gestell-crsqlite.db       # CR-SQLite 主数据库
│
├── dist/                         # 构建输出
│   ├── main.js                   # 编译后的主进程
│   └── renderer/                 # 前端构建产物
│
├── docs/                         # 项目文档
│   ├── README.md                         # 项目说明
│   ├── PROJECT_ARCHITECTURE_ANALYSIS.md  # 架构分析
│   ├── PRISMA_REMOVAL_COMPLETE.md        # Prisma 迁移报告
│   ├── WHY_CRSQLITE_NOW.md               # CR-SQLite 选择理由
│   ├── CRSQLITE_INTEGRATION_PLAN.md      # CR-SQLite 集成方案
│   └── ... (其他文档)
│
├── test/                         # 测试文件
│   └── database-performance.html # 数据库性能测试
│
├── yjs-server/                   # Yjs WebSocket 信令服务器
│
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 全局配置
├── tsconfig.main.json            # 主进程 TS 配置
├── vite.config.ts                # Vite 构建配置
├── dev-safe.ps1                  # 安全启动脚本
└── cleanup-project.ps1           # 项目清理脚本
```

---

## 🔄 架构层次分析

### 1. 核心架构模式：Clean Architecture

项目采用经典的**清洁架构（Clean Architecture）**分层设计：

```
┌──────────────────────────────────────────────────────┐
│                   Presentation Layer                  │
│              Vue 3 UI + Pinia + Router               │
│  (views/, components/, stores/, composables/)        │
└────────────────────┬─────────────────────────────────┘
                     │ IPC Communication
┌────────────────────▼─────────────────────────────────┐
│                   Application Layer                   │
│              IPC Handlers + Orchestration            │
│               (ipc/, main.ts)                        │
└────────────────────┬─────────────────────────────────┘
                     │ Service Calls
┌────────────────────▼─────────────────────────────────┐
│                    Business Layer                     │
│                   Service Container                   │
│  (services/: AuthorService, WorkService, etc.)       │
└────────────────────┬─────────────────────────────────┘
                     │ Repository Interfaces
┌────────────────────▼─────────────────────────────────┐
│                    Domain Layer                       │
│              Repository Interfaces                    │
│         (repositories/interfaces/)                    │
└────────────────────┬─────────────────────────────────┘
                     │ Implementations
┌────────────────────▼─────────────────────────────────┐
│                Infrastructure Layer                   │
│           CR-SQLite Repository Implementations        │
│         (repositories/crsqlite/)                      │
└────────────────────┬─────────────────────────────────┘
                     │ Database Access
┌────────────────────▼─────────────────────────────────┐
│                    Database Layer                     │
│                  CR-SQLite Manager                    │
│              (core/crsqlite-manager.ts)               │
└──────────────────────────────────────────────────────┘
```

### 2. 依赖注入容器

项目采用**依赖注入（Dependency Injection）**模式：

```typescript
// 初始化流程 (main.ts)
async function initCore() {
  // 1. 初始化 CR-SQLite 管理器
  crsqliteManager = new CRSQLiteManager({
    dbPath: 'gestell-crsqlite.db',
    enableWal: true
  });
  await crsqliteManager.initialize();
  
  // 2. 创建 Repository 容器（数据访问层）
  repositories = new RepositoryContainer(crsqliteManager);
  
  // 3. 创建 Service 容器（业务逻辑层）
  services = new ServiceContainer(repositories);
  
  // 4. 创建 IPC 管理器（通信层）
  ipcManager = new IPCManager(services);
  ipcManager.registerAllHandlers();
}
```

**依赖关系：**
```
CRSQLiteManager (数据库)
    ↓ 注入
RepositoryContainer (数据访问)
    ↓ 注入
ServiceContainer (业务逻辑)
    ↓ 注入
IPCManager (通信层)
```

### 3. Repository Pattern

**仓储模式**抽象了数据访问逻辑，统一接口定义：

```typescript
// 接口定义 (repositories/interfaces/IAuthorRepository.ts)
export interface IAuthorRepository {
  create(data: CreateAuthorData): Promise<Author>;
  findById(id: string): Promise<Author | null>;
  findByUsername(username: string): Promise<Author | null>;
  findByWallet(walletAddress: string): Promise<Author | null>;
  update(id: string, data: UpdateAuthorData): Promise<Author>;
  delete(id: string): Promise<void>;
  list(): Promise<Author[]>;
}

// CR-SQLite 实现 (repositories/crsqlite/CRSQLiteAuthorRepository.ts)
export class CRSQLiteAuthorRepository implements IAuthorRepository {
  constructor(private crsqliteManager: CRSQLiteManager) {}
  
  async create(data: CreateAuthorData): Promise<Author> {
    const db = this.crsqliteManager.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO authors (id, username, password_hash, ...)
      VALUES (?, ?, ?, ...)
    `);
    stmt.run(...);
    return this.findById(data.id);
  }
  
  // ... 其他方法实现
}
```

**优势：**
- ✅ 接口与实现分离，易于测试
- ✅ 可轻松切换数据源（已完成 Prisma → CR-SQLite 迁移）
- ✅ 业务逻辑不依赖具体数据库实现

---

## 💾 数据库架构：CR-SQLite

### CR-SQLite 简介

**CR-SQLite** 是 SQLite 的 CRDT 扩展，提供：
- ✅ **原生 CRDT 支持**：自动冲突解决
- ✅ **标准 SQL 接口**：无需学习新 API
- ✅ **P2P 同步**：去中心化数据同步
- ✅ **高性能**：比 Automerge + SQLite 快 5 倍
- ✅ **低内存占用**：单一数据源，无需双层维护

### 数据模型设计

#### 核心表结构

```sql
-- 1. 作者表 (authors)
CREATE TABLE authors (
  id TEXT PRIMARY KEY,              -- ULID
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  email TEXT,
  password_hash TEXT NOT NULL,      -- PBKDF2 哈希
  public_key TEXT,                  -- RSA 公钥（加密存储）
  private_key_encrypted TEXT,       -- RSA 私钥（AES 加密）
  wallet_address TEXT UNIQUE,       -- 区块链钱包地址
  bio TEXT,
  preferences TEXT,                 -- JSON 格式的用户偏好
  created_at INTEGER NOT NULL,      -- Unix 时间戳
  updated_at INTEGER NOT NULL
);

-- 2. 作品表 (works)
CREATE TABLE works (
  id TEXT PRIMARY KEY,              -- ULID
  title TEXT NOT NULL,
  description TEXT,
  author_id TEXT NOT NULL,
  collaboration_mode TEXT NOT NULL, -- 'solo' | 'collaborative'
  collaborators TEXT,               -- JSON 数组: ['userId1', 'userId2']
  blockchain_hash TEXT,             -- 区块链哈希
  is_published INTEGER DEFAULT 0,   -- 布尔值
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);

-- 3. 章节表 (chapters)
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,              -- ULID
  work_id TEXT NOT NULL,
  parent_id TEXT,                   -- 父章节ID（支持无限层级）
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,     -- 同级排序
  level INTEGER NOT NULL,           -- 层级深度 (0 = 根章节)
  is_folder INTEGER DEFAULT 0,      -- 是否为文件夹
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- 4. 内容表 (contents)
CREATE TABLE contents (
  id TEXT PRIMARY KEY,              -- ULID
  chapter_id TEXT NOT NULL,
  content_json TEXT NOT NULL,       -- ProseMirror JSON 格式
  plain_text TEXT,                  -- 纯文本（用于搜索和统计）
  word_count INTEGER DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  is_collaborative INTEGER DEFAULT 0,
  last_edited_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  FOREIGN KEY (last_edited_by) REFERENCES authors(id)
);

-- 5. 协作文档表 (collaborative_documents)
CREATE TABLE collaborative_documents (
  id TEXT PRIMARY KEY,              -- ULID
  content_id TEXT NOT NULL UNIQUE,
  work_id TEXT NOT NULL,
  document_type TEXT NOT NULL,      -- 'chapter' | 'note' | 'character'
  yjs_state BLOB,                   -- Yjs Y.Doc 二进制状态
  state_vector BLOB,                -- Yjs 状态向量
  max_connections INTEGER DEFAULT 10,
  last_sync_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
  FOREIGN KEY (work_id) REFERENCES works(id) ON DELETE CASCADE
);

-- 6. 内容版本表 (content_versions)
CREATE TABLE content_versions (
  id TEXT PRIMARY KEY,              -- ULID
  content_id TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  content_json TEXT NOT NULL,
  plain_text TEXT,
  word_count INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES authors(id)
);
```

#### CRDT 化表

所有核心表都被标记为 CRDT 表，自动支持冲突解决：

```typescript
// 初始化时自动执行
await db.exec("SELECT crsql_as_crr('authors')");
await db.exec("SELECT crsql_as_crr('works')");
await db.exec("SELECT crsql_as_crr('chapters')");
await db.exec("SELECT crsql_as_crr('contents')");
await db.exec("SELECT crsql_as_crr('collaborative_documents')");
await db.exec("SELECT crsql_as_crr('content_versions')");
```

### CR-SQLite 同步机制

```typescript
// 1. 获取本地变更
const changes = db.prepare(`
  SELECT "table", "pk", "cid", "val", "col_version", "db_version", "site_id"
  FROM crsql_changes
  WHERE db_version > ?
`).all(lastSyncVersion);

// 2. 广播到 P2P 网络
p2pNetwork.broadcast({ type: 'crsqlite-changes', changes });

// 3. 接收远程变更并应用（自动合并冲突）
for (const change of remoteChanges) {
  db.prepare(`
    INSERT INTO crsql_changes 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(change.table, change.pk, change.cid, ...);
}
```

---

## 🔄 实时协作架构：Yjs

### Yjs 协作系统

项目采用 **Yjs** 实现**字符级实时协作**：

```typescript
// YjsCollaborationService 架构
export class YjsCollaborationService {
  private ydoc: Y.Doc;                    // Yjs 文档
  private provider: WebrtcProvider;       // WebRTC 提供者
  private websocketProvider: WebsocketProvider;  // WebSocket 信令
  
  async createYjsDocument(contentId: string, workId: string) {
    // 1. 创建 Yjs 文档
    this.ydoc = new Y.Doc();
    
    // 2. 绑定 ProseMirror 编辑器
    const prosemirrorBinding = new ProsemirrorBinding(
      yXmlFragment,
      editorView
    );
    
    // 3. 设置 WebRTC P2P 连接
    this.provider = new WebrtcProvider(workId, this.ydoc, {
      signaling: ['ws://localhost:4001/signaling']
    });
    
    // 4. 自动保存到 CR-SQLite
    this.ydoc.on('update', () => {
      this.saveYjsState(contentId);
    });
  }
  
  async saveYjsState(contentId: string) {
    const yjsState = Y.encodeStateAsUpdate(this.ydoc);
    await this.repositories.collaborationRepository.updateYjsState(
      contentId,
      Buffer.from(yjsState)
    );
  }
}
```

### 协作层级

```
┌─────────────────────────────────────────┐
│       ProseMirror 编辑器 (UI)           │
│    (光标、选区、可视化编辑)              │
└─────────────────┬───────────────────────┘
                  │ y-prosemirror 绑定
┌─────────────────▼───────────────────────┐
│         Yjs CRDT 层 (字符级)            │
│    (自动冲突解决、操作转换)              │
└─────────────────┬───────────────────────┘
                  │ Y.encodeStateAsUpdate
┌─────────────────▼───────────────────────┐
│      WebRTC / WebSocket 传输层          │
│         (P2P 实时同步)                   │
└─────────────────┬───────────────────────┘
                  │ 定期持久化
┌─────────────────▼───────────────────────┐
│         CR-SQLite 持久化层              │
│    (离线支持、版本历史、跨设备同步)      │
└─────────────────────────────────────────┘
```

### 双层 CRDT 协作

项目采用 **Yjs + CR-SQLite 双层 CRDT** 架构：

| 层次 | 技术 | 用途 | 冲突解决 | 同步方式 |
|------|------|------|----------|----------|
| **实时编辑层** | Yjs | 字符级实时协作 | OT/CRDT 算法 | WebRTC (P2P) |
| **持久化层** | CR-SQLite | 数据库持久化、跨设备同步 | Last-Write-Wins | P2P 或中继服务器 |

**优势：**
- ✅ **实时性**：Yjs 提供毫秒级同步
- ✅ **离线支持**：CR-SQLite 本地持久化
- ✅ **跨设备**：CR-SQLite 跨设备同步
- ✅ **冲突解决**：双层自动解决冲突

---

## 🔐 加密与安全

### 加密架构

```typescript
// GestallCrypto 服务
export class GestallCrypto {
  // 1. 密码哈希 (PBKDF2)
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }
  
  // 2. RSA 密钥对生成
  generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048
    });
    return { publicKey, privateKey };
  }
  
  // 3. AES 加密私钥
  encryptPrivateKey(privateKey: string, password: string): string {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    return cipher.update(privateKey, 'utf8', 'hex') + cipher.final('hex');
  }
  
  // 4. RSA 加密数据
  encryptData(data: string, publicKey: string): string {
    return crypto.publicEncrypt(publicKey, Buffer.from(data)).toString('base64');
  }
}
```

### 安全措施

- ✅ **密码安全**：PBKDF2 (100,000 轮迭代)
- ✅ **私钥保护**：AES-256-GCM 加密存储
- ✅ **端到端加密**：RSA-2048 加密协作数据
- ✅ **本地优先**：敏感数据本地存储
- ✅ **CSP 策略**：严格的内容安全策略

---

## 🎨 前端架构：Vue 3

### Vue 3 技术栈

```typescript
// 1. Composition API
import { ref, computed, onMounted } from 'vue';

// 2. Pinia 状态管理
import { defineStore } from 'pinia';

export const useWorkStore = defineStore('work', () => {
  const currentWork = ref<Work | null>(null);
  const chapters = ref<Chapter[]>([]);
  
  async function loadWork(workId: string) {
    currentWork.value = await window.electron.invoke('work:get', workId);
  }
  
  return { currentWork, chapters, loadWork };
});

// 3. Vue Router
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/work/:id', component: WorkView },
    { path: '/editor/:chapterId', component: EditorView }
  ]
});
```

### 组件层次

```
App.vue (根组件)
├── TitleBar.vue (自定义标题栏)
├── router-view (路由视图)
│   ├── HomeView.vue (主页)
│   ├── LoginView.vue (登录)
│   ├── WorkListView.vue (作品列表)
│   ├── WorkView.vue (作品管理)
│   │   ├── ChapterTree.vue (章节树)
│   │   │   └── ChapterNode.vue (章节节点，递归)
│   │   └── ProseMirrorEditor.vue (富文本编辑器)
│   ├── WritingView.vue (写作视图)
│   ├── CharactersView.vue (角色管理)
│   ├── LocationsView.vue (地点管理)
│   ├── TimelineView.vue (时间线)
│   ├── SettingsView.vue (设置)
│   └── AboutView.vue (关于)
└── StatusBar.vue (状态栏)
```

### 状态管理（Pinia）

```typescript
// stores/
├── app.ts        // 应用全局状态（主题、窗口状态）
├── user.ts       // 用户状态（当前用户、登录状态）
├── work.ts       // 作品状态（当前作品、作品列表）
├── chapter.ts    // 章节状态（章节树、当前章节）
└── editor.ts     // 编辑器状态（编辑器实例、选区）
```

---

## 🔌 IPC 通信架构

### IPC 通信模式

项目采用 **类型安全的 IPC 通信**：

```typescript
// 1. 主进程注册处理器
class AuthorIPCHandler {
  register() {
    ipcMain.handle('author:login', async (event, username, password) => {
      return await this.services.authorService.login(username, password);
    });
    
    ipcMain.handle('author:create', async (event, data) => {
      return await this.services.authorService.createAuthor(data);
    });
  }
}

// 2. 渲染进程 API 封装
const api = {
  author: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('author:login', username, password),
    
    create: (data: CreateAuthorData) =>
      ipcRenderer.invoke('author:create', data)
  }
};

// 3. Vue 组件调用
async function handleLogin() {
  const result = await window.electron.invoke('author:login', username, password);
  if (result.success) {
    router.push('/home');
  }
}
```

### IPC 事件分类

| Handler | 职责 | 主要方法 |
|---------|------|----------|
| **AuthorIPCHandler** | 用户管理 | login, register, updateProfile |
| **WorkIPCHandler** | 作品管理 | create, list, update, delete |
| **ChapterIPCHandler** | 章节管理 | create, reorder, move, delete |
| **ContentIPCHandler** | 内容管理 | get, save, getVersions |
| **SystemIPCHandler** | 系统功能 | getStats, exportData, importData |

---

## 📊 核心业务流程

### 1. 用户登录流程

```
用户输入用户名/密码
    ↓
Vue Component (LoginView.vue)
    ↓ IPC: 'author:login'
AuthorIPCHandler
    ↓ authorService.login()
AuthorService
    ↓ authorRepository.findByUsername()
CRSQLiteAuthorRepository
    ↓ SQL Query
CR-SQLite Database
    ↓ 验证密码哈希
AuthorService
    ↓ 返回用户信息
Vue Store (userStore)
    ↓ 保存用户状态
路由跳转到主页
```

### 2. 创建作品流程

```
用户点击"新建作品"
    ↓
WorkView.vue
    ↓ IPC: 'work:create'
WorkIPCHandler
    ↓ workService.createWork()
WorkService
    ↓ ULID 生成 ID
    ↓ workRepository.create()
CRSQLiteWorkRepository
    ↓ INSERT INTO works
CR-SQLite (自动 CRDT 化)
    ↓ 返回作品对象
Vue Store (workStore)
    ↓ 更新作品列表
UI 刷新显示新作品
```

### 3. 实时协作编辑流程

```
用户打开章节编辑器
    ↓
EditorView.vue
    ↓ 加载内容
ContentService.getContent()
    ↓ 初始化 Yjs 文档
YjsCollaborationService.createYjsDocument()
    ↓ 建立 WebRTC 连接
WebrtcProvider
    ↓ 绑定 ProseMirror
y-prosemirror binding
    ↓
用户编辑内容 (字符级)
    ↓ Yjs CRDT 算法
自动同步到其他用户
    ↓ 定期保存 (5秒)
YjsCollaborationService.saveYjsState()
    ↓ 更新数据库
CRSQLiteCollaborationRepository
    ↓ UPDATE collaborative_documents
CR-SQLite (持久化)
```

### 4. 章节树拖拽排序流程

```
用户拖拽章节节点
    ↓
ChapterTree.vue (Sortable.js)
    ↓ onDragEnd 事件
计算新的 orderIndex 和 parentId
    ↓ IPC: 'chapter:reorder'
ChapterIPCHandler
    ↓ chapterService.reorderChapters()
ChapterService
    ↓ 批量更新 orderIndex
CRSQLiteChapterRepository
    ↓ UPDATE chapters SET order_index
CR-SQLite (CRDT 自动同步)
    ↓ 返回更新后的章节树
Vue Store (chapterStore)
    ↓ 重新渲染章节树
UI 动画展示新位置
```

---

## 🚀 开发与构建

### 开发模式

```bash
# 推荐：安全启动脚本（自动清理进程）
npm run dev:safe
# 执行: pwsh -ExecutionPolicy Bypass -File dev-safe.ps1

# 手动启动
npm run dev
# 执行: concurrently "npm run dev:vite" "npm run dev:electron"

# 分别启动（调试用）
npm run dev:vite      # 启动 Vite 开发服务器 (http://localhost:3000)
npm run dev:electron  # 启动 Electron (需要先启动 Vite)
```

### 构建流程

```bash
# 完整构建
npm run build
# 1. npm run build:main  → 编译主进程 (TypeScript → JavaScript)
# 2. npm run build:web   → 构建前端 (Vue → 静态资源)

# 清理构建产物
npm run clean  # 删除 dist/, dist-web/
```

### 项目脚本

| 脚本 | 用途 | 说明 |
|------|------|------|
| `dev-safe.ps1` | 安全启动开发环境 | 自动清理残留进程，启动 Vite + Electron |
| `cleanup-project.ps1` | 清理项目 | 删除 node_modules、dist、缓存 |
| `setup-build-env.ps1` | 构建环境配置 | 配置 node-gyp、Python 等 |

---

## 📝 核心配置文件

### package.json

```json
{
  "name": "gestell",
  "version": "0.1.0",
  "main": "dist/main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:safe": "pwsh -ExecutionPolicy Bypass -File dev-safe.ps1",
    "dev:vite": "vite",
    "dev:electron": "wait-on http://localhost:3000 && npm run build:main && npx electron dist/main.js --dev",
    "build": "npm run build:main && npm run build:web",
    "build:main": "tsc --project tsconfig.main.json",
    "build:web": "vite build",
    "test:unit": "jest",
    "test:coverage": "jest --coverage"
  }
}
```

### tsconfig.json

```jsonc
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/ui/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
```

### vite.config.ts

```typescript
export default defineConfig({
  plugins: [vue()],
  base: './',
  root: 'src/ui',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/ui'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  server: {
    port: 3000,
    strictPort: true
  }
});
```

---

## 🎯 当前项目状态

### ✅ 已完成

1. **核心架构搭建**
   - ✅ Clean Architecture 分层
   - ✅ Repository Pattern 数据访问层
   - ✅ Service Layer 业务逻辑层
   - ✅ Dependency Injection 容器

2. **数据库迁移**
   - ✅ **Prisma → CR-SQLite 完全迁移**
   - ✅ CR-SQLite 初始化和表结构
   - ✅ 所有核心表 CRDT 化
   - ✅ Repository 层完全重写

3. **实时协作**
   - ✅ Yjs 协作服务
   - ✅ WebRTC P2P 连接
   - ✅ ProseMirror 编辑器绑定
   - ✅ Yjs + CR-SQLite 双层持久化

4. **基础功能**
   - ✅ 用户注册/登录/加密
   - ✅ 作品创建/列表/删除
   - ✅ 章节树（无限层级）
   - ✅ 章节拖拽排序
   - ✅ 内容编辑（ProseMirror）
   - ✅ 版本历史

5. **UI 组件**
   - ✅ 自定义标题栏
   - ✅ 章节树组件（递归）
   - ✅ ProseMirror 编辑器
   - ✅ 状态栏

### 🚧 开发中

1. **高级编辑功能**
   - ⏳ Markdown 导入/导出
   - ⏳ 代码高亮
   - ⏳ 表格编辑
   - ⏳ 图片上传

2. **协作功能**
   - ⏳ 协作邀请系统
   - ⏳ 权限管理
   - ⏳ 协作日志
   - ⏳ 冲突可视化

3. **辅助工具**
   - ⏳ 角色管理
   - ⏳ 地点管理
   - ⏳ 时间线编辑
   - ⏳ 写作统计

### 📋 待开发

1. **区块链集成**
   - 📝 智能合约集成
   - 📝 版权上链
   - 📝 去中心化存储 (IPFS)

2. **导出功能**
   - 📝 导出为 EPUB
   - 📝 导出为 PDF
   - 📝 导出为 Word

3. **高级功能**
   - 📝 AI 写作助手
   - 📝 语法检查
   - 📝 敏感词检测

---

## 🔧 技术债务与优化建议

### 当前技术债务

1. **类型定义**
   - ⚠️ 部分 IPC 类型使用 `any`
   - ⚠️ Repository 接口和实现类型不完全一致
   - **建议**: 统一类型定义，使用 `Zod` 进行运行时类型验证

2. **错误处理**
   - ⚠️ 缺少统一的错误处理机制
   - ⚠️ IPC 调用没有完整的错误边界
   - **建议**: 实现全局错误处理器，统一错误响应格式

3. **测试覆盖率**
   - ⚠️ 单元测试覆盖率不足
   - ⚠️ 缺少集成测试
   - **建议**: 增加 Jest 测试，目标覆盖率 80%+

4. **性能优化**
   - ⚠️ 章节树大量节点时可能卡顿
   - ⚠️ 大文档编辑性能待优化
   - **建议**: 虚拟滚动、懒加载、Web Worker

### 优化建议

1. **代码质量**
   ```typescript
   // 使用 Zod 进行类型验证
   import { z } from 'zod';
   
   const CreateWorkSchema = z.object({
     title: z.string().min(1).max(200),
     description: z.string().optional(),
     authorId: z.string().ulid()
   });
   
   // IPC Handler 中验证
   const validated = CreateWorkSchema.parse(data);
   ```

2. **性能优化**
   ```typescript
   // 章节树虚拟滚动
   import { FixedSizeList } from 'react-window';
   
   // 大文档分片加载
   async function loadContentInChunks(contentId: string) {
     const CHUNK_SIZE = 10000;
     // 分批加载内容
   }
   ```

3. **可观测性**
   ```typescript
   // 添加性能监控
   import { performance } from 'perf_hooks';
   
   const start = performance.now();
   await service.operation();
   const duration = performance.now() - start;
   logger.info(`Operation took ${duration}ms`);
   ```

---

## 📚 重要文档索引

- **README.md** - 项目概述和快速开始
- **PROJECT_ARCHITECTURE_ANALYSIS.md** - 旧架构分析（Prisma 时代）
- **PRISMA_REMOVAL_COMPLETE.md** - Prisma → CR-SQLite 迁移报告
- **WHY_CRSQLITE_NOW.md** - CR-SQLite 选择理由
- **CRSQLITE_INTEGRATION_PLAN.md** - CR-SQLite 集成方案
- **AUTOMERGE_GUIDE.md** - Automerge 技术评估（已弃用）
- **DEVELOPMENT_READY_CHECKLIST.md** - 开发就绪检查清单

---

## 🎉 总结

### 技术亮点

1. ✅ **现代化架构**：Clean Architecture + Repository Pattern + DI
2. ✅ **CRDT 数据库**：CR-SQLite 原生冲突解决，无需手动维护
3. ✅ **实时协作**：Yjs + WebRTC 字符级协同编辑
4. ✅ **类型安全**：TypeScript 严格模式 + 接口定义
5. ✅ **去中心化**：P2P 协作，无需中心服务器
6. ✅ **高性能**：Vite 6.x + Electron 32.x + CR-SQLite

### 项目优势

- **可维护性**：清晰的分层架构，易于扩展和测试
- **可扩展性**：Repository Pattern 支持轻松切换数据源
- **开发体验**：热重载、TypeScript、Vue 3 Composition API
- **性能优越**：CR-SQLite 比 Automerge + SQLite 快 5 倍
- **离线优先**：本地存储，支持完整离线使用
- **安全可靠**：端到端加密 + CRDT 冲突解决

### 下一步计划

1. **完善核心功能**
   - 完成角色/地点/时间线管理
   - 实现导出功能（EPUB/PDF/Word）
   - 优化编辑器性能

2. **增强协作能力**
   - 完善协作邀请和权限系统
   - 实现协作日志和冲突可视化
   - 添加实时光标和选区显示

3. **区块链集成**
   - 连接智能合约
   - 实现版权上链
   - 集成 IPFS 存储

4. **测试和优化**
   - 提高测试覆盖率（目标 80%+）
   - 性能优化（虚拟滚动、懒加载）
   - 添加性能监控和日志

---

**🚀 Gestell 已准备好进入全面开发阶段！**
