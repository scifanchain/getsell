# 🎯 类型系统重构详细计划

**目标**: 统一使用 Drizzle 生成的类型，消除类型重复和混乱

---

## 📊 当前状态分析

### 1. 类型定义文件对比

#### A. `src/db/schema.ts` (✅ 标准来源)
**自动生成的类型**:
```typescript
export type Author = typeof authors.$inferSelect;
export type Work = typeof works.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Content = typeof contents.$inferSelect;
export type ContentVersion = typeof contentVersions.$inferSelect;
export type CollaborativeDocument = typeof collaborativeDocuments.$inferSelect;

export type NewAuthor = typeof authors.$inferInsert;
export type NewWork = typeof works.$inferInsert;
export type NewChapter = typeof chapters.$inferInsert;
export type NewContent = typeof contents.$inferInsert;
```

**特点**:
- ✅ 与数据库结构完全一致
- ✅ 包含所有字段（包括新字段如 passwordHash）
- ✅ 自动同步更新
- ✅ 类型安全

---

#### B. `src/shared/types.ts` (⚠️ 部分过时)
**手动定义的类型**:
```typescript
export interface Author {
  id: string
  username: string
  displayName?: string
  email: string
  bio?: string
  publicKey?: string
  walletAddress?: string
  createdAt: string      // ❌ 应该是 number (timestamp)
  updatedAt: string      // ❌ 应该是 number
}

export interface Work {
  id: string
  title: string
  subtitle?: string
  description?: string
  authorId: string
  genre?: string
  status?: string
  collaborationMode?: string
  createdAt: string      // ❌ 应该是 number
  updatedAt: string      // ❌ 应该是 number
  chapters?: Chapter[]   // ✅ 关系字段（需要保留）
}

export interface Chapter {
  id: string
  title: string
  content?: string       // ❌ 已删除此字段
  workId: string
  orderIndex: number
  level: number
  parentId?: string
  subtitle?: string
  description?: string
  type?: 'chapter' | 'volume' | 'section'
  authorId?: string
  createdAt: string      // ❌ 应该是 number
  updatedAt: string      // ❌ 应该是 number
}

export interface Content {
  id: string;
  title: string;
  content: string;       // ❌ 已删除此字段
  chapterId: string;
  orderIndex: number;
  tags?: string[];       // ❌ 应该是 string (JSON)
  workId: string;
  type?: string;
  contentJson?: string;
  contentHtml?: string;  // ❌ 不存在此字段
  authorId?: string;
  createdAt: string;     // ❌ 应该是 number
  updatedAt: string;     // ❌ 应该是 number
}
```

**问题**:
- ❌ 缺少新字段（passwordHash, totalWorks, status, preferences 等）
- ❌ 时间戳类型错误（string vs number）
- ❌ 包含已删除的字段（content, contentHtml）
- ❌ 标签类型错误（string[] vs string）

**需要保留的部分**:
```typescript
// ✅ IPC 相关
export interface IPCResponse<T = any> { ... }
export interface AuthorCreateResponse { ... }
export interface WindowResponse { ... }
export interface KeyPair { ... }
export interface SystemStats { ... }

// ✅ 输入数据类型（简化版）
export interface AuthorData { ... }
export interface WorkData { ... }
export interface ChapterData { ... }
export interface ContentData { ... }
```

---

#### C. `src/repositories/interfaces/types.ts` (❌ 完全重复)
**重复定义**:
```typescript
export interface AuthorData { ... }  // 与 shared/types.ts 重复
export interface WorkData { ... }    // 与 shared/types.ts 重复
export interface ChapterData { ... } // 与 shared/types.ts 重复
export interface ContentData { ... } // 与 shared/types.ts 重复
export interface PaginationOptions { ... }
export interface SortOptions { ... }
export interface Stats { ... }
```

**结论**: 可以完全删除，迁移到 shared/types.ts

---

## 🎯 重构策略

### 核心原则
1. **单一数据源**: 所有数据库实体类型来自 `schema.ts`
2. **职责分离**: 
   - `schema.ts` - 数据库实体类型
   - `shared/types.ts` - IPC 接口、响应类型、输入数据类型
3. **向后兼容**: 保留必要的别名，避免大规模改动

---

## 🔧 具体执行步骤

### 步骤 1: 更新 `src/shared/types.ts`

```typescript
/**
 * 共享类型定义 - 主进程和渲染进程都可以使用
 */

// ============================================
// 从 schema.ts 重新导出数据库实体类型
// ============================================
export type {
  Author,
  Work,
  Chapter,
  Content,
  ContentVersion,
  CollaborativeDocument,
  NewAuthor,
  NewWork,
  NewChapter,
  NewContent,
  NewContentVersion,
  NewCollaborativeDocument,
  UpdateAuthor,
  UpdateWork,
  UpdateChapter,
  UpdateContent,
} from '../db/schema';

// ============================================
// IPC 通信接口
// ============================================
export interface IPCResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

// ============================================
// 输入数据类型（简化版，用于 IPC 传输）
// ============================================
export interface AuthorData {
  username: string;
  email: string;
  password: string;
  displayName?: string;
  bio?: string;
}

export interface WorkData {
  title: string;
  description?: string;
  authorId: string;
  genre?: string;
  collaborationMode?: string;
}

export interface ChapterData {
  title: string;
  workId: string;
  orderIndex: number;
  parentId?: string;
  subtitle?: string;
  description?: string;
  type?: 'chapter' | 'volume' | 'section';
  authorId?: string;
}

export interface ContentData {
  title: string;
  chapterId: string;
  orderIndex: number;
  workId: string;
  type?: string;
  contentJson?: string;
  authorId?: string;
}

// ============================================
// 特殊响应类型
// ============================================
export interface AuthorCreateResponse {
  authorId: string;
  publicKey: string;
}

export interface WindowResponse {
  success: boolean;
  error?: string;
}

// ============================================
// 通用类型
// ============================================
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SystemStats {
  authors: number;
  works: number;
  chapters: number;
  storage: {
    used: number;
    total: number;
  };
}

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
```

---

### 步骤 2: 删除 `src/repositories/interfaces/types.ts`

此文件完全重复，直接删除。

---

### 步骤 3: 更新所有导入语句

#### 需要更新的文件：
1. `src/main.ts`
2. `src/ui/views/WorkView.vue`
3. `src/ui/stores/work.ts`
4. `src/ui/components/ChapterNode.vue`

**改动示例**:
```typescript
// ❌ 旧方式
import type { Work, Chapter } from '../../shared/types'

// ✅ 新方式（实际上不需要改，因为 shared/types.ts 重新导出了）
import type { Work, Chapter } from '../../shared/types'
```

由于我们在 `shared/types.ts` 中重新导出了 schema 类型，现有导入不需要修改！

---

### 步骤 4: 修复 Repository 接口不匹配

#### A. 统一查询参数类型

在 `src/shared/types.ts` 中定义：
```typescript
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

#### B. 更新 `IWorkRepository` 接口

```typescript
// src/repositories/interfaces/IWorkRepository.ts
import type { Work, NewWork, UpdateWork } from '../../db/schema';
import type { QueryOptions } from '../../shared/types';

export interface IWorkRepository {
  create(data: Omit<NewWork, 'id' | 'createdAt' | 'updatedAt'>): Promise<Work>;
  findById(id: string): Promise<Work | null>;
  findByAuthor(authorId: string, options?: QueryOptions): Promise<Work[]>;
  findAll(options?: QueryOptions): Promise<Work[]>;
  update(id: string, data: UpdateWork): Promise<Work>;
  delete(id: string): Promise<boolean>;
  search(query: string, options?: QueryOptions): Promise<Work[]>;
  getStats(authorId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    totalWords: number;
  }>;
}
```

#### C. 更新 `WorkRepository` 实现

```typescript
// src/repositories/WorkRepository.ts
async findByAuthor(authorId: string, options?: QueryOptions): Promise<Work[]> {
  const db = this.dbManager.getDrizzle();
  let query = db.select().from(works).where(eq(works.authorId, authorId));
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.offset(options.offset);
  }
  
  return await query;
}
```

---

#### D. 补充 `ContentRepository` 缺失方法

```typescript
// src/repositories/ContentRepository.ts

async findByWork(workId: string): Promise<Content[]> {
  const db = this.dbManager.getDrizzle();
  return await db
    .select()
    .from(contents)
    .where(eq(contents.workId, workId))
    .orderBy(contents.orderIndex);
}

async reorder(workId: string, orders: { id: string; orderIndex: number }[]): Promise<void> {
  const db = this.dbManager.getDrizzle();
  const rawDb = this.dbManager.getDatabase();
  
  const updateStmt = rawDb.prepare(
    'UPDATE contents SET orderIndex = ?, updatedAt = ? WHERE id = ? AND workId = ?'
  );
  
  const transaction = rawDb.transaction((items: typeof orders) => {
    const now = Date.now();
    for (const item of items) {
      updateStmt.run(item.orderIndex, now, item.id, workId);
    }
  });
  
  transaction(orders);
}

async search(query: string): Promise<Content[]> {
  const db = this.dbManager.getDrizzle();
  const pattern = `%${query}%`;
  
  return await db
    .select()
    .from(contents)
    .where(
      or(
        like(contents.title, pattern),
        like(contents.contentJson, pattern)
      )
    )
    .limit(50);
}

async getVersionHistory(contentId: string): Promise<ContentVersion[]> {
  const db = this.dbManager.getDrizzle();
  return await db
    .select()
    .from(contentVersions)
    .where(eq(contentVersions.contentId, contentId))
    .orderBy(desc(contentVersions.versionNumber));
}
```

---

### 步骤 5: 移除 `as any` 类型断言

#### A. 更新 `RepositoryContainer.ts`

```typescript
// src/repositories/RepositoryContainer.ts

constructor(dbManager: DatabaseManager) {
  this.dbManager = dbManager;
  
  // ✅ 移除 as any
  this._authorRepository = new AuthorRepository(this.dbManager);
  this._workRepository = new WorkRepository(this.dbManager);
  this._chapterRepository = new ChapterRepository(this.dbManager);
  this._contentRepository = new ContentRepository(this.dbManager);
}
```

---

### 步骤 6: 验证编译和运行

```bash
# 1. TypeScript 编译检查
npx tsc --noEmit --project tsconfig.main.json

# 2. 启动应用测试
npm run dev:safe
```

---

## 📋 文件改动清单

### 需要修改的文件（6个）
1. ✅ `src/shared/types.ts` - 重新导出 schema 类型，保留 IPC 类型
2. ✅ `src/repositories/interfaces/IWorkRepository.ts` - 更新接口定义
3. ✅ `src/repositories/interfaces/IContentRepository.ts` - 更新接口定义
4. ✅ `src/repositories/WorkRepository.ts` - 修复参数类型
5. ✅ `src/repositories/ContentRepository.ts` - 补充缺失方法
6. ✅ `src/repositories/RepositoryContainer.ts` - 移除 as any

### 需要删除的文件（1个）
1. ✅ `src/repositories/interfaces/types.ts`

### 不需要修改的文件（4个）
- `src/main.ts` - 导入路径不变
- `src/ui/views/WorkView.vue` - 导入路径不变
- `src/ui/stores/work.ts` - 导入路径不变
- `src/ui/components/ChapterNode.vue` - 导入路径不变

---

## ⏱️ 预计时间分配

| 步骤 | 任务 | 预计时间 |
|------|------|----------|
| 1 | 重构 shared/types.ts | 20分钟 |
| 2 | 删除 types.ts | 1分钟 |
| 3 | 验证导入（不需要改动） | 5分钟 |
| 4 | 修复 Repository 接口 | 40分钟 |
| 5 | 移除 as any | 10分钟 |
| 6 | 编译测试 | 15分钟 |
| 7 | 运行测试 | 10分钟 |
| **总计** | | **~100分钟** |

---

## ✅ 成功标准

1. ✅ TypeScript 编译零错误
2. ✅ 无 `as any` 类型断言
3. ✅ 所有 Repository 接口匹配
4. ✅ 应用正常启动和运行
5. ✅ 类型定义单一来源（schema.ts）
6. ✅ 代码可读性和可维护性提升

---

## 🚀 开始执行？

准备好开始重构了吗？我将按照以下顺序执行：

1. 重构 `src/shared/types.ts`
2. 更新 Repository 接口
3. 补充 ContentRepository 方法
4. 修复 WorkRepository 参数
5. 移除 as any 断言
6. 删除重复文件
7. 验证编译和运行

确认开始执行？
