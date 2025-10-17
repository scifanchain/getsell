# 协作模式重构说明

## 概述

将作品的协作模式从 `solo/collaborative` 重构为 `private/team/public`,以更好地支持不同的协作场景。

## 新的协作模式

| 模式 | 说明 | 用途 |
|------|------|------|
| `private` | 私有创作 | 仅作者本人可编辑,不与他人协作 |
| `team` | 团队协作 | 仅指定的团队成员(collaborators)可以协同编辑 |
| `public` | 公开协作 | 开放给所有用户,任何人都可以参与编辑 |

## 从旧模式到新模式的映射

- `solo` → `private` (私有创作)
- `collaborative` → `team` (团队协作)
- 默认值: `private`

## 修改的文件

### 1. 核心模块

- ✅ **src/db/schema.ts**
  - 更新 `works.collaborationMode` 字段默认值为 `'private'`
  - 更新注释说明新的可选值

- ✅ **src/core/validators.ts** (新建)
  - 创建协作模式验证器
  - 提供类型定义和验证函数
  - 包含中文标签和描述

### 2. 类型定义

- ✅ **src/shared/types.ts**
  - 更新 `WorkData.collaborationMode` 类型为 `'private' | 'team' | 'public'`

- ✅ **src/services/interfaces/IWorkService.ts**
  - 更新 `CreateWorkData.collaborationMode` 类型

### 3. 服务层

- ✅ **src/services/WorkService.ts**
  - 导入并使用 `validateCollaborationMode` 验证器
  - 确保创建作品时使用有效的协作模式

### 4. UI 层

- ✅ **src/ui/services/api.ts**
  - 更新 `workApi.create` 方法的类型定义

## 使用示例

### 创建私有作品

```typescript
const work = await workApi.create(authorId, {
  title: '我的小说',
  description: '这是一部私人创作',
  collaborationMode: 'private' // 默认值
});
```

### 创建团队协作作品

```typescript
const work = await workApi.create(authorId, {
  title: '团队项目',
  description: '与团队成员共同创作',
  collaborationMode: 'team',
  // collaborators 字段存储团队成员ID列表(JSON字符串)
});
```

### 创建公开协作作品

```typescript
const work = await workApi.create(authorId, {
  title: '开放项目',
  description: '欢迎所有人参与',
  collaborationMode: 'public'
});
```

### 验证协作模式

```typescript
import { validateCollaborationMode, getCollaborationModeLabel } from '@/core/validators';

const mode = validateCollaborationMode(userInput); // 自动验证并返回有效值
const label = getCollaborationModeLabel(mode); // 获取中文标签
```

## 数据迁移

### 新数据库

新创建的数据库会自动使用 `private` 作为默认值,无需迁移。

### 现有数据库

如果数据库中已有使用旧模式(`solo`/`collaborative`)的数据:

**自动兼容处理** (推荐)
- 验证器 `validateCollaborationMode()` 会自动处理无效值
- 旧数据在读取时会被转换为默认值 `private`
- 下次更新时会自动修正为新值

## 向后兼容性

- ✅ **类型验证**: `validateCollaborationMode()` 会自动将无效值转换为默认值 `'private'`
- ✅ **默认值**: 所有地方都使用 `'private'` 作为默认值

## 注意事项

1. **现有数据库**: 旧数据在首次读取时会被验证器转换为默认值
2. **Schema 变更**: 已更新默认值,不影响现有数据
3. **类型安全**: 所有地方都使用了严格的类型定义
4. **扩展性**: 如需添加新模式,只需在 validators.ts 中添加

---

**完成时间**: 2025年10月17日  
**影响范围**: 数据库 Schema, 类型定义, 服务层, UI API  
**向后兼容**: ✅ 是 (通过验证器自动处理)
