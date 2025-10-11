# Prisma 架构与数据交互完整指南

> 本文档详细说明了 Gestell 项目中前端与数据库的完整交互流程，以及 Prisma 自动生成的类型定义的作用和价值。

---

## 📊 项目整体架构

Gestell 是一个基于 **Electron + Vue 3 + Prisma + SQLite** 的桌面科幻写作应用，采用清洁架构（Clean Architecture）设计。

### 分层架构概览

```
┌─────────────────────────────────────────────┐
│  前端层（Renderer Process）                  │
│  Vue 3 Components + Pinia Stores + Router   │
│  位置: src/ui/                               │
└─────────────────────────────────────────────┘
                    ↕ IPC 通信
┌─────────────────────────────────────────────┐
│  IPC 处理层（Main Process）                  │
│  IPC Handlers (ChapterIPCHandler等)         │
│  位置: src/ipc/                              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  服务层（Service Layer）                     │
│  业务逻辑 (ChapterService, WorkService等)   │
│  位置: src/services/                         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  仓储层（Repository Layer）                  │
│  数据访问接口实现 (PrismaXXXRepository)      │
│  位置: src/data/prisma/                      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  数据库层（Database Layer）                  │
│  Prisma ORM + SQLite                        │
│  位置: prisma/ + data/gestell.db            │
└─────────────────────────────────────────────┘
```

---

## 🔄 完整的数据交互流程

以**创建章节**为例，展示从前端到数据库的完整数据流向：

### 1️⃣ 前端发起请求（Vue Component）

```typescript
// src/ui/views/某个Vue组件.vue
import { useChapterStore } from '../stores/chapter'

const chapterStore = useChapterStore()

// 用户点击"创建章节"按钮
async function handleCreateChapter() {
  await chapterStore.createChapter({
    workId: 'work_123',
    title: '第一章',
    authorId: 'user_001'
  })
}
```

### 2️⃣ Store 调用 API 服务（Pinia Store）

```typescript
// src/ui/stores/chapter.ts
import { chapterApi } from '../services/api'

async function createChapter(chapterData: CreateChapterData) {
  const chapter = await chapterApi.create(chapterData)
  chapters.value.push(chapter)
  return chapter
}
```

### 3️⃣ API 通过 IPC 与主进程通信（API Layer）

```typescript
// src/ui/services/api.ts
export const chapterApi = {
  async create(chapterData) {
    // 通过 preload.js 暴露的 electronAPI 调用主进程
    return await window.electronAPI.invoke('chapter:create', chapterData)
  }
}
```

### 4️⃣ Preload 桥接层（安全隔离）

```javascript
// src/preload.js
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  chapter: {
    create: (chapterData) => ipcRenderer.invoke('chapter:create', chapterData)
  }
})
```

### 5️⃣ IPC Handler 接收请求（Main Process）

```typescript
// src/ipc/ChapterIPCHandler.ts
export class ChapterIPCHandler {
  initialize(): void {
    ipcMain.handle('chapter:create', async (event, authorId, chapterData) => {
      try {
        // 调用服务层
        const chapter = await this.services.chapterService.createChapter(
          authorId, 
          chapterData
        )
        return { success: true, data: chapter }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })
  }
}
```

### 6️⃣ Service 处理业务逻辑（Service Layer）

```typescript
// src/services/ChapterService.ts
export class ChapterService {
  async createChapter(authorId: string, chapterData: CreateChapterData) {
    // 1. 验证权限
    const work = await this.repositories.workRepository.findById(chapterData.workId)
    if (work.authorId !== authorId) {
      throw new Error('没有权限')
    }
    
    // 2. 生成 ID 和处理业务逻辑
    const createData = {
      id: ulid(),
      title: chapterData.title,
      workId: chapterData.workId,
      authorId: authorId,
      // ... 其他字段
    }
    
    // 3. 调用 Repository 保存数据
    return await this.repositories.chapterRepository.create(createData)
  }
}
```

### 7️⃣ Repository 执行数据库操作（Repository Layer）

```typescript
// src/data/prisma/ChapterRepository.ts
export class PrismaChapterRepository {
  async create(chapterData: ChapterData): Promise<any> {
    const timestamp = getCurrentTimestamp()
    
    // 使用 Prisma ORM 操作数据库
    return await this.prisma.chapter.create({
      data: {
        id: chapterData.id,
        title: chapterData.title,
        workId: chapterData.workId,
        authorId: chapterData.authorId,
        createdAt: timestamp,
        updatedAt: timestamp
      },
      include: {
        author: { select: { id: true, username: true } },
        work: { select: { id: true, title: true } }
      }
    })
  }
}
```

### 8️⃣ Prisma 执行 SQL 并返回（Database Layer）

```typescript
// src/core/database.ts
export class DatabaseManager {
  private prisma: PrismaClient
  
  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: { url: 'file:data/gestell.db' }  // SQLite 数据库文件
      }
    })
  }
}
```

**Prisma 生成的 SQL：**
```sql
INSERT INTO chapters (id, work_id, title, author_id, created_at, updated_at)
VALUES ('01HXXX...', 'work_123', '第一章', 'user_001', '2025-10-11', '2025-10-11')
```

### 9️⃣ 数据原路返回前端

数据按照相反的路径返回：
```
SQLite → Prisma → Repository → Service → IPC Handler 
→ Preload → API → Store → Vue Component
```

---

## 🎯 核心设计模式

### 1. 依赖注入容器（DI Container）

```typescript
// src/data/RepositoryContainer.ts
export class RepositoryContainer {
  get chapterRepository() {
    return new PrismaChapterRepository(this.prisma)
  }
}

// src/services/ServiceContainer.ts
export class ServiceContainer {
  get chapterService() {
    return new ChapterService(this.repositories)
  }
}

// src/ipc/IPCManager.ts
export class IPCManager {
  constructor(services: ServiceContainer) {
    this.chapterHandler = new ChapterIPCHandler(services)
  }
}
```

### 2. Repository Pattern（仓储模式）

```typescript
// 接口定义
interface IChapterRepository {
  create(data: ChapterData): Promise<Chapter>
  findById(id: string): Promise<Chapter | null>
  // ...
}

// Prisma 实现
class PrismaChapterRepository implements IChapterRepository {
  // 具体实现
}
```

### 3. IPC 通信安全隔离

```
渲染进程 (无 Node.js 权限)
    ↓ contextBridge
Preload Script (受限的 Node.js API)
    ↓ ipcRenderer
主进程 (完整 Node.js 权限)
```

---

## 📦 关键模块职责

| 模块 | 位置 | 职责 |
|------|------|------|
| **Vue Components** | `src/ui/views/` | UI 渲染和用户交互 |
| **Pinia Stores** | `src/ui/stores/` | 前端状态管理 |
| **API Service** | `src/ui/services/api.ts` | 封装 IPC 调用 |
| **Preload** | `src/preload.js` | 安全桥接前后端 |
| **IPC Handlers** | `src/ipc/` | 接收并路由 IPC 请求 |
| **Services** | `src/services/` | 业务逻辑处理 |
| **Repositories** | `src/data/prisma/` | 数据访问层 |
| **Prisma Client** | `src/generated/prisma/` | ORM 客户端 |
| **Database** | `data/gestell.db` | SQLite 数据文件 |

---

## 🔐 安全机制

1. **Context Isolation**: 渲染进程完全隔离，无法直接访问 Node.js API
2. **Preload Script**: 只暴露白名单 API 给前端
3. **加密服务**: RSA/AES 加密用户数据（`src/crypto/crypto.ts`）
4. **权限验证**: Service 层验证用户操作权限

---

## 🎁 Prisma 生成的类型定义

### `src/generated/prisma/` 目录是什么？

这个目录包含 **Prisma ORM 自动生成的客户端代码**，是整个项目数据库交互的核心。

### 生成配置

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"  // ← 输出到这里
}
```

### 目录结构

```
src/generated/prisma/
├── index.js                      # 主入口（Node.js）
├── index.d.ts                    # TypeScript 类型定义（22,084 行！）
├── client.js / client.d.ts       # 客户端核心代码
├── edge.js / edge.d.ts           # Edge Runtime 版本
├── wasm.js / wasm.d.ts           # WebAssembly 版本
├── package.json                  # NPM 包配置
├── schema.prisma                 # Schema 副本
├── query_engine-windows.dll.node # 查询引擎（Windows 原生）
└── runtime/                      # 运行时库
```

### 数据对比

```
Schema 文件 (您维护的):     232 行  ← 很小！
生成的类型文件:          22,084 行  ← 自动生成，859 KB

比例: 1 行 Schema → 约 95 行生成代码
```

---

## ⚙️ 完整的开发流程

### 第一步：维护 Schema（源头）

```prisma
// prisma/schema.prisma - 只需维护这个文件！

model Chapter {
  id         String   @id
  workId     String   @map("work_id")
  title      String
  orderIndex Int      @map("order_index")
  authorId   String   @map("author_id")
  createdAt  DateTime @map("created_at")
  updatedAt  DateTime @map("updated_at")
  
  // 关系定义
  author     Author   @relation(fields: [authorId], references: [id])
  work       Work     @relation(fields: [workId], references: [id])
  contents   Content[]
  
  @@map("chapters")
}
```

**您只需要写 20 行清晰的 Schema！**

### 第二步：执行生成命令

```bash
# 方式1: 生成 Prisma Client
npx prisma generate

# 方式2: 推送到数据库（会自动生成）
npx prisma db push

# 方式3: 创建迁移（会自动生成）
npx prisma migrate dev --name add_chapter_model
```

**发生了什么？**

```
┌─────────────────────┐
│ schema.prisma       │  您维护的 20 行
│ (20 lines)          │
└──────────┬──────────┘
           │
           ▼
    [Prisma 代码生成器]
           │
           ├─────────────────────────┐
           │                         │
           ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐
│ index.d.ts       │    │ index.js             │
│ (22,084 lines)   │    │ (运行时代码)          │
│ TypeScript类型   │    │ 数据库操作逻辑        │
└──────────────────┘    └──────────────────────┘
```

---

## 🎯 类型定义的七大作用

### 作用 1: 提供类型安全的数据库操作 API

```typescript
// src/data/prisma/ChapterRepository.ts
import { PrismaClient } from '../../generated/prisma'

export class PrismaChapterRepository {
  constructor(private prisma: PrismaClient) {}

  async create(chapterData: any) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterData.parentId },
      select: { 
        level: true,      // ✅ TypeScript 知道这个字段存在
        workId: true      // ✅ TypeScript 知道这个字段存在
      }
    })
    
    // ✅ TypeScript 知道 chapter 的类型：
    // chapter: { level: number; workId: string } | null
    
    return chapter
  }
}
```

**如果写错了：**

```typescript
// ❌ TypeScript 会立即报错！
await this.prisma.chapter.findUnique({
  where: { id: '123' },
  select: {
    titel: true,    // ❌ 错误：没有 'titel' 字段（应该是 'title'）
    levle: true,    // ❌ 错误：没有 'levle' 字段（应该是 'level'）
    age: true       // ❌ 错误：Chapter 模型没有 'age' 字段
  }
})
```

### 作用 2: 智能的代码自动完成

当您在 VS Code 中输入时：

```typescript
await this.prisma.chapter.   // ← 输入这里时，VS Code 自动提示：
```

```
📋 自动提示列表：
├─ findUnique      - 查找单个记录
├─ findMany        - 查找多个记录
├─ findFirst       - 查找第一个
├─ create          - 创建记录
├─ update          - 更新记录
├─ delete          - 删除记录
├─ upsert          - 更新或创建
├─ count           - 计数
├─ aggregate       - 聚合查询
└─ groupBy         - 分组查询
```

### 作用 3: 自动推断返回值类型

```typescript
// 不需要手动定义类型，TypeScript 自动知道！

// 例子 1: 基础查询
const chapter = await prisma.chapter.findUnique({
  where: { id: '123' }
})
// TypeScript 自动推断:
// chapter: {
//   id: string
//   workId: string
//   title: string
//   orderIndex: number
//   authorId: string
//   createdAt: Date
//   updatedAt: Date
// } | null

// 例子 2: 只选择部分字段
const partial = await prisma.chapter.findUnique({
  where: { id: '123' },
  select: {
    id: true,
    title: true
  }
})
// TypeScript 自动推断:
// partial: { id: string; title: string } | null

// 例子 3: 包含关联数据
const withRelations = await prisma.chapter.findUnique({
  where: { id: '123' },
  include: {
    author: true,
    work: true
  }
})
// TypeScript 自动推断:
// withRelations: {
//   id: string
//   title: string
//   // ... 其他字段
//   author: { id: string; username: string; ... }
//   work: { id: string; title: string; ... }
// } | null
```

### 作用 4: 复杂查询的类型支持

```typescript
// 聚合查询
const stats = await prisma.chapter.aggregate({
  where: { workId: 'work_123' },
  _count: { id: true },
  _avg: { orderIndex: true },
  _max: { orderIndex: true }
})
// TypeScript 知道返回类型：
// stats: {
//   _count: { id: number }
//   _avg: { orderIndex: number | null }
//   _max: { orderIndex: number | null }
// }

// 分组查询
const groups = await prisma.chapter.groupBy({
  by: ['authorId'],
  _count: { id: true },
  _sum: { orderIndex: true }
})
// TypeScript 知道返回类型：
// groups: Array<{
//   authorId: string
//   _count: { id: number }
//   _sum: { orderIndex: number | null }
// }>
```

### 作用 5: 关系查询的类型安全

```typescript
// 创建章节并关联到作品
const chapter = await prisma.chapter.create({
  data: {
    id: ulid(),
    title: '第一章',
    orderIndex: 1,
    // ✨ 关系连接 - 类型安全！
    author: {
      connect: { id: 'author_123' }  // ✅ TypeScript 知道需要 { id: string }
    },
    work: {
      connect: { id: 'work_456' }
    }
  },
  // 返回时包含关联数据
  include: {
    author: {
      select: {
        id: true,
        username: true,
        displayName: true
      }
    },
    work: {
      select: {
        id: true,
        title: true
      }
    }
  }
})

// TypeScript 精确知道返回值类型：
// chapter: {
//   id: string
//   title: string
//   orderIndex: number
//   author: { id: string; username: string; displayName: string | null }
//   work: { id: string; title: string }
// }
```

### 作用 6: 过滤条件的类型支持

```typescript
// 复杂的查询条件 - 完全类型安全
const chapters = await prisma.chapter.findMany({
  where: {
    workId: 'work_123',
    // AND/OR/NOT 逻辑
    OR: [
      { title: { contains: '第一' } },
      { title: { contains: '第二' } }
    ],
    // 数字比较
    orderIndex: {
      gte: 1,    // 大于等于
      lte: 10    // 小于等于
    },
    // 关系过滤
    author: {
      status: 'active'
    },
    // 日期过滤
    createdAt: {
      gte: new Date('2025-01-01')
    }
  },
  // 排序
  orderBy: {
    orderIndex: 'asc'
  },
  // 分页
  skip: 0,
  take: 10
})

// ✅ 所有这些选项都有类型检查！
// ❌ 如果写错任何字段名或类型，TypeScript 立即报错
```

### 作用 7: 事务支持的类型安全

```typescript
// 事务中的所有操作都是类型安全的
const result = await prisma.$transaction(async (tx) => {
  // 创建章节
  const chapter = await tx.chapter.create({
    data: {
      id: ulid(),
      title: '新章节',
      workId: 'work_123',
      authorId: 'author_001',
      orderIndex: 1
    }
  })
  
  // 更新作品的章节数
  const work = await tx.work.update({
    where: { id: 'work_123' },
    data: {
      chapterCount: { increment: 1 }
    }
  })
  
  // 所有操作都有完整的类型检查！
  return { chapter, work }
})

// TypeScript 知道 result 的类型
```

---

## 💎 类型定义的核心价值

### 1. 编译时错误检测

```typescript
// ❌ 这些错误在编译时就被发现，不会运行到生产环境
await prisma.chapter.create({
  data: {
    titel: '标题'  // 错误：字段名拼写错误
  }
})
```

### 2. 开发效率提升 10 倍

```
无类型定义:
- 手动查看文档找字段名 ⏱️ 30秒
- 不确定字段类型，试错 ⏱️ 2分钟
- 运行时才发现错误 ⏱️ 5分钟
总计: ~7.5分钟/次查询

有类型定义:
- IDE 自动提示 ⚡ 2秒
- 类型错误立即显示 ⚡ 0秒
- 编译时发现所有错误 ⚡ 5秒
总计: ~7秒/次查询 ✨

效率提升: 64倍！
```

### 3. 代码质量保证

```typescript
// 重构时的安全性
// 如果您在 schema.prisma 中把 orderIndex 改名为 order：

model Chapter {
  order Int  // 改名了
}

// 重新生成后，所有使用 orderIndex 的地方会立即报错：
const chapter = await prisma.chapter.findUnique({
  select: {
    orderIndex: true  // ❌ TypeScript 错误：字段不存在
  }
})

// 这样您可以快速找到所有需要修改的地方！
```

### 4. 团队协作的统一性

```typescript
// 团队成员 A 写的代码
const result = await prisma.chapter.create({...})

// 团队成员 B 使用时，TypeScript 告诉他 result 的精确类型
// 不需要沟通，不需要文档，类型就是文档！
```

---

## 🚀 实际开发流程演示

### 场景：添加新字段到 Chapter

#### 步骤 1: 修改 Schema（5 秒）

```prisma
model Chapter {
  // ... 现有字段
  summary String?  // ← 新增：章节摘要
}
```

#### 步骤 2: 运行迁移（10 秒）

```bash
npx prisma migrate dev --name add_chapter_summary
```

#### 步骤 3: 自动完成！

```typescript
// 代码中立即可以使用新字段，带完整类型支持
const chapter = await prisma.chapter.create({
  data: {
    // ... 其他字段
    summary: '这是章节摘要'  // ✅ 自动识别新字段
  }
})

// TypeScript 知道 chapter.summary 是 string | null
console.log(chapter.summary)  // ✅ 类型安全
```

**不需要：**
- ❌ 手动更新类型定义
- ❌ 手动同步接口
- ❌ 更新文档
- ❌ 通知团队成员

**全部自动完成！** 🎉

---

## 📈 文件大小增长分析

### 当前情况

```
9 个模型 → 22,084 行 → 859 KB
平均: 2,454 行/模型
```

### 未来预测

**如果增加到 20 个模型：**
```
20 模型 × 2,454 行 ≈ 49,000 行 ≈ 1.9 MB
```

**如果增加到 50 个模型（大型应用）：**
```
50 模型 × 2,454 行 ≈ 122,500 行 ≈ 4.8 MB
```

### 这不是问题！

1. ✅ **您只维护简洁的 Schema** - 现在 232 行
2. ✅ **生成的文件自动管理** - 零维护成本
3. ✅ **文件大小可接受** - 即使 50 个模型也才 5 MB
4. ✅ **性能无影响** - TypeScript 编译时处理
5. ✅ **IDE 体验流畅** - 智能加载和缓存

---

## ✨ 总结

### 架构优势

- ✅ **清晰的分层架构**，每层职责明确
- ✅ **类型安全**，全链路 TypeScript
- ✅ **高度可测试**，依赖注入便于 Mock
- ✅ **安全隔离**，前后端严格分离
- ✅ **ORM 加持**，Prisma 提供类型安全的数据库操作

### 数据流向

**Vue → Store → API → IPC → Service → Repository → Prisma → SQLite**

### 类型定义价值

```
┌────────────────────────────────────────────┐
│ 您维护的 Schema (232 行)                   │
│ ✏️  清晰、简洁、易于理解                    │
└──────────────────┬─────────────────────────┘
                   │
                   ▼ [自动生成]
┌────────────────────────────────────────────┐
│ 生成的类型定义 (22,084 行)                 │
│                                            │
│ ✨ 提供以下能力：                          │
│ 1. 类型安全的数据库操作 API                │
│ 2. 智能代码自动完成                       │
│ 3. 编译时错误检测                         │
│ 4. 精确的类型推断                         │
│ 5. 复杂查询的类型支持                     │
│ 6. 关系查询的类型安全                     │
│ 7. 事务操作的类型保证                     │
│ 8. 重构时的安全保障                       │
│ 9. 团队协作的一致性                       │
│ 10. 自动文档化                            │
└────────────────────────────────────────────┘
```

**核心价值：让您的代码从"可能正确"变成"一定正确"！** 🚀

---

## 📚 相关文档

- [Prisma 官方文档](https://www.prisma.io/docs)
- [项目架构分析](./ARCHITECTURE_ANALYSIS.md)
- [项目结构说明](./README.md)

---

**文档生成时间**: 2025年10月11日  
**维护者**: Gestell 开发团队
