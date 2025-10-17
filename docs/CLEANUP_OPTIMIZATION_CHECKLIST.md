# 🧹 Gestell 项目清理和优化清单

**生成时间**: 2025年10月17日  
**当前状态**: 重构完成，需要进一步优化

---

## 📋 清理项目

### 🔴 高优先级（建议立即处理）

#### 1. 删除重复的类型定义
**位置**: `src/shared/types.ts` 和 `src/repositories/interfaces/types.ts`

**问题**:
- 存在多处重复的类型定义（Author, Work, Chapter, Content）
- 一些类型定义与 Drizzle 生成的类型重复
- 增加维护成本，容易不同步

**建议**:
```typescript
// ❌ 删除或合并
src/shared/types.ts            // 包含 Author, Work, Chapter 等
src/repositories/interfaces/types.ts  // 包含 AuthorData, WorkData 等

// ✅ 统一使用
src/db/schema.ts               // Drizzle 自动生成的类型
```

**操作**:
- [ ] 检查哪些类型仍在使用
- [ ] 将所有引用改为 Drizzle 生成的类型
- [ ] 删除或精简旧的类型文件
- [ ] 只保留 IPC 通信相关的接口定义

---

#### 2. 删除过时的测试文件
**位置**: `test/` 目录

**文件列表**:
- `test/test-crsqlite-basic.ts` ❌
- `test/test-crsqlite-simple.js` ❌
- `test/run-crsqlite-test-console.js` ❌

**问题**:
- 这些测试文件引用旧的 `CRSQLiteManager`
- 与新架构不兼容
- 占用空间，容易误导

**建议**:
- [ ] 删除所有 `test/*crsqlite*` 文件
- [ ] 如需测试，重新编写基于新架构的测试

---

#### 3. 统一 Repository 接口定义
**位置**: `src/repositories/interfaces/`

**问题**:
- 接口定义与实现不完全匹配
- `WorkRepository.findByAuthor()` 参数类型不一致
- `ContentRepository` 缺少部分方法（findByWork, reorder, search, getVersionHistory）

**当前错误**:
```typescript
// WorkRepository
Type 'WorkRepository' is not assignable to type 'IWorkRepository'
  - findByAuthor 参数类型不匹配

// ContentRepository  
Type 'ContentRepository' is missing properties:
  - findByWork
  - reorder
  - search
  - getVersionHistory
```

**建议**:
- [ ] 统一 `PaginationOptions` 和 `SortOptions` 类型定义
- [ ] 补充 `ContentRepository` 缺失的方法
- [ ] 或者更新接口定义以匹配当前实现
- [ ] 移除临时的 `as any` 类型断言

---

#### 4. 清理测试 IPC Handler 残留
**位置**: `src/ipc/test-crsqlite-handlers.ts`

**问题**:
- 文件仍然存在但已禁用
- IPC handler 名称仍包含 'crsqlite' 字样

**建议**:
- [ ] 完全删除该文件（已在 main.ts 中移除引用）
- [ ] 或重命名为 `test-handlers.ts` 并重新实现

---

### 🟡 中优先级（可以后续处理）

#### 5. 实现 CollaborationRepository
**位置**: `src/repositories/`（待创建）

**问题**:
- `RepositoryContainer` 中有 `ICollaborationRepository` 接口
- 但没有对应的实现文件
- 协同编辑功能缺失

**建议**:
- [ ] 创建 `CollaborationRepository.ts`
- [ ] 实现协同文档管理
- [ ] 集成 Yjs（如果需要）
- [ ] 更新 `RepositoryContainer`

---

#### 6. 优化数据库迁移流程
**位置**: `src/core/db-manager.ts` 和 `drizzle/`

**当前问题**:
- 迁移文件路径硬编码
- 生产环境可能找不到迁移文件

**代码**:
```typescript
// 硬编码路径
migrationsFolder: path.join(process.cwd(), 'drizzle', 'migrations')
```

**建议**:
- [ ] 使用 `app.getAppPath()` 处理生产环境路径
- [ ] 添加迁移文件存在性检查
- [ ] 提供降级方案（如果迁移失败）

---

#### 7. 补充错误处理
**位置**: 所有 Repository 文件

**问题**:
- 大部分方法没有错误处理
- 数据库错误会直接抛出
- 用户体验差

**建议**:
- [ ] 添加 try-catch 包装
- [ ] 统一错误处理逻辑
- [ ] 返回友好的错误信息
- [ ] 记录错误日志

**示例**:
```typescript
async create(data: Omit<NewAuthor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Author> {
  try {
    const db = this.dbManager.getDrizzle();
    // ...
  } catch (error) {
    console.error('[AuthorRepository] Create failed:', error);
    throw new Error('创建作者失败');
  }
}
```

---

#### 8. 添加数据验证
**位置**: 所有 Repository 文件

**问题**:
- 没有输入数据验证
- 可能存储无效数据
- 缺少业务规则检查

**建议**:
- [ ] 添加 Zod 或其他验证库
- [ ] 在 Repository 层验证输入
- [ ] 统一验证错误消息

**示例**:
```typescript
import { z } from 'zod';

const authorSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  displayName: z.string().max(100).optional(),
});

async create(data: any): Promise<Author> {
  const validated = authorSchema.parse(data);
  // ...
}
```

---

#### 9. 优化导入语句
**位置**: 多个文件

**问题**:
- 部分文件有未使用的导入
- 导入顺序不统一

**建议**:
- [ ] 移除未使用的导入
- [ ] 统一导入顺序（标准库 → 第三方库 → 本地文件）
- [ ] 使用 ESLint 自动格式化

---

### 🟢 低优先级（可选优化）

#### 10. 添加 JSDoc 注释
**位置**: 所有 Repository 方法

**当前状态**:
- 部分方法有注释
- 大部分方法缺少详细说明

**建议**:
- [ ] 为所有公共方法添加 JSDoc
- [ ] 说明参数、返回值、抛出的错误
- [ ] 提供使用示例

**示例**:
```typescript
/**
 * 根据用户名查找作者
 * 
 * @param username - 作者用户名（唯一）
 * @returns 找到的作者对象，如果不存在返回 null
 * @throws {Error} 数据库查询失败时抛出错误
 * 
 * @example
 * ```typescript
 * const author = await repo.findByUsername('john_doe');
 * if (author) {
 *   console.log(author.displayName);
 * }
 * ```
 */
async findByUsername(username: string): Promise<Author | null> {
  // ...
}
```

---

#### 11. 性能优化
**位置**: Repository 查询方法

**潜在问题**:
- 没有索引优化
- 可能存在 N+1 查询问题
- 缺少查询性能监控

**建议**:
- [ ] 为常用查询字段添加索引
- [ ] 使用 `with` 预加载关联数据
- [ ] 添加查询性能日志
- [ ] 考虑添加缓存层

---

#### 12. 统一命名规范
**位置**: 整个项目

**不一致的地方**:
- 有的用 `Author`，有的用 `User`
- 有的用 `Work`，有的用 `Project`
- 日志标签不统一

**建议**:
- [ ] 统一使用 `Author`（而非 User）
- [ ] 统一使用 `Work`（而非 Project）
- [ ] 统一日志格式和标签
- [ ] 更新所有注释和文档

---

#### 13. 添加单元测试
**位置**: 新建 `__tests__/` 目录

**当前状态**:
- 没有单元测试
- 重构后未验证

**建议**:
- [ ] 使用 Jest 或 Vitest
- [ ] 为每个 Repository 编写测试
- [ ] 测试 CRUD 操作
- [ ] 测试边界条件和错误处理

**示例结构**:
```
__tests__/
├── repositories/
│   ├── AuthorRepository.test.ts
│   ├── WorkRepository.test.ts
│   ├── ChapterRepository.test.ts
│   └── ContentRepository.test.ts
└── core/
    └── db-manager.test.ts
```

---

#### 14. 优化类型导出
**位置**: `src/db/index.ts` 和 `src/db/schema.ts`

**当前问题**:
- 类型导出不够集中
- 使用时需要从多个文件导入

**建议**:
- [ ] 在 `src/db/index.ts` 中集中导出所有类型
- [ ] 简化导入语句

**示例**:
```typescript
// src/db/index.ts
export * from './schema';
export type { DrizzleDB };

// 使用时
import { Author, Work, Chapter, DrizzleDB } from '../db';
```

---

#### 15. 文档更新
**位置**: `docs/` 目录

**需要更新的文档**:
- [ ] README.md - 更新项目说明
- [ ] 架构文档 - 反映新的架构
- [ ] API 文档 - Repository 使用说明
- [ ] 开发指南 - 如何添加新功能

---

## 📊 优先级总结

### 立即处理（影响开发和维护）
1. ✅ **删除重复类型定义** - 统一使用 Drizzle 类型
2. ✅ **删除过时测试文件** - 清理 test/ 目录
3. ✅ **统一 Repository 接口** - 修复类型不匹配
4. ✅ **清理测试 Handler** - 删除残留文件

### 后续处理（提升质量）
5. 🔄 **实现 CollaborationRepository**
6. 🔄 **优化迁移流程**
7. 🔄 **补充错误处理**
8. 🔄 **添加数据验证**

### 可选优化（锦上添花）
9. 📝 **添加 JSDoc 注释**
10. ⚡ **性能优化**
11. 📚 **统一命名规范**
12. 🧪 **添加单元测试**
13. 📦 **优化类型导出**
14. 📖 **更新文档**

---

## 🎯 建议的执行顺序

### 第一阶段：清理（1-2小时）
1. 删除 test/ 目录中的旧测试文件
2. 删除或合并重复的类型定义
3. 删除 `src/ipc/test-crsqlite-handlers.ts`

### 第二阶段：修复（2-3小时）
4. 统一 Repository 接口定义
5. 补充 ContentRepository 缺失的方法
6. 移除临时的 `as any` 类型断言

### 第三阶段：完善（3-5小时）
7. 实现 CollaborationRepository
8. 添加错误处理
9. 添加数据验证

### 第四阶段：优化（可选）
10. 添加单元测试
11. 优化性能
12. 完善文档

---

## 💡 自动化建议

可以使用以下工具自动化部分工作：

```bash
# 1. 查找未使用的导入
npx depcheck

# 2. 格式化代码
npx prettier --write "src/**/*.{ts,tsx}"

# 3. 检查类型错误
npx tsc --noEmit

# 4. 运行 ESLint
npx eslint "src/**/*.ts" --fix
```

---

## ✅ 完成标准

清理和优化完成后，项目应该：

- ✅ 无编译错误和警告
- ✅ 无重复的类型定义
- ✅ 所有 Repository 接口匹配
- ✅ 无过时的测试文件
- ✅ 有基本的错误处理
- ✅ 代码风格统一
- ✅ 文档保持最新

---

**需要我帮你执行哪些清理和优化任务？**
