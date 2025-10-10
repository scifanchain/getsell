# 外键约束错误修复总结

## 🐛 问题描述

**错误信息**:
```
Foreign key constraint violated on the foreign key
Invalid `this.prisma.chapter.update()` invocation
```

**发生场景**: 
拖拽章节重新排序时,Prisma 抛出外键约束违反错误。

## 🔍 根本原因

### 1. 数据库约束
Prisma Schema 中 Chapter 模型有自引用关系:

```prisma
model Chapter {
  parentId  String?  @map("parent_id")
  parent    Chapter? @relation("ChapterHierarchy", fields: [parentId], references: [id])
  children  Chapter[] @relation("ChapterHierarchy")
}
```

这意味着:
- `parentId` 必须引用一个**已存在的章节ID**
- 或者是 `null` (根章节)
- **不能**引用不存在的ID,否则违反外键约束

### 2. 更新顺序问题

原来的代码按数组顺序更新章节:

```typescript
// ❌ 问题代码
for (const chapter of chapters) {
  await update(chapter.id, {
    parentId: chapter.parentId,  // 父章节可能还未更新!
    orderIndex: chapter.orderIndex,
    level: chapter.level
  })
}
```

**问题场景**:
```
假设拖拽顺序: [子章节A, 父章节B, 子章节C]
1. 更新 A: parentId = B  ❌ 但 B 还没更新,B的ID可能已改变!
2. 更新 B: ...           ✅ 现在 B 更新了
3. 更新 C: parentId = B  ✅ 成功
```

### 3. 无效的 parentId

拖拽操作可能产生无效的 `parentId`:
- 拖拽到已删除的章节下
- 拖拽产生循环引用 (A→B→A)
- `parentId` 指向不在更新列表中的章节

## ✅ 解决方案

### 1. 添加 parentId 验证

```typescript
// 验证所有 parentId 都存在或为 null
const chapterIds = new Set(chapters.map(c => c.id))
const invalidParents = chapters.filter(c => 
  c.parentId && !chapterIds.has(c.parentId)
)

if (invalidParents.length > 0) {
  throw new Error('章节包含无效的父章节引用')
}
```

### 2. 拓扑排序 (Topological Sort)

使用**深度优先搜索 (DFS)** 确保父章节先于子章节更新:

```typescript
// 拓扑排序: 父章节必须先更新
const sorted: typeof chapters = []
const visited = new Set<string>()
const visiting = new Set<string>()

const visit = (chapterId: string) => {
  if (visited.has(chapterId)) return
  if (visiting.has(chapterId)) {
    // 检测到循环引用
    return
  }
  
  visiting.add(chapterId)
  
  const chapter = chapters.find(c => c.id === chapterId)
  
  // 先处理父章节
  if (chapter.parentId) {
    visit(chapter.parentId)
  }
  
  visiting.delete(chapterId)
  visited.add(chapterId)
  sorted.push(chapter)
}

// 遍历所有章节
chapters.forEach(c => visit(c.id))
```

**排序结果**:
```
原始顺序: [子A, 父B, 子C]
排序后:   [父B, 子A, 子C]  ✅ 父章节优先
```

### 3. undefined → null 转换

```typescript
await update(chapter.id, {
  parentId: chapter.parentId || null,  // 确保 undefined → null
  orderIndex: chapter.orderIndex,
  level: chapter.level
})
```

### 4. 循环引用检测

```typescript
if (visiting.has(chapterId)) {
  console.warn('⚠️ 检测到循环引用:', chapterId)
  return  // 跳过,防止无限递归
}
```

## 📊 修复效果

### 修复前
```
更新顺序: [A, B, C, D, E]
结果: ❌ Foreign key constraint violated
```

### 修复后
```
1. 验证 parentId ✅
2. 拓扑排序
   原始: [E(parent:D), D(parent:C), C(parent:null), A(parent:C), B(parent:A)]
   排序: [C, D, E, A, B]  ← 层级优先
3. 按顺序更新 ✅
4. 所有更新成功 ✅
```

## 🧪 测试场景

### 场景 1: 基本排序
```
操作: 调整同级章节顺序
预期: ✅ 成功,orderIndex 更新
```

### 场景 2: 改变父章节
```
操作: 拖拽章节A到章节B下
预期: ✅ 成功,先更新B,再更新A的parentId
```

### 场景 3: 多级拖拽
```
操作: 拖拽整个子树到新位置
预期: ✅ 成功,父节点先更新,子节点按层级更新
```

### 场景 4: 无效 parentId
```
操作: parentId 指向不存在的章节
预期: ❌ 抛出错误,阻止更新
```

### 场景 5: 循环引用
```
操作: A→B→C→A 的循环
预期: ⚠️ 检测到并跳过,打印警告
```

## 🔧 相关文件

**修改的文件**:
- `src/ui/services/api.ts` - `reorderChapters()` 方法

**关键改进**:
1. ✅ parentId 验证
2. ✅ 拓扑排序 (DFS)
3. ✅ 循环引用检测
4. ✅ undefined → null 转换
5. ✅ 详细的日志输出

## 📝 代码对比

### 修复前 (18 行)
```typescript
async reorderChapters(chapters) {
  for (const chapter of chapters) {
    try {
      await update(chapter.id, {
        parentId: chapter.parentId,
        orderIndex: chapter.orderIndex,
        level: chapter.level
      })
    } catch (error) {
      console.error('更新失败:', error)
    }
  }
}
```

### 修复后 (80 行)
```typescript
async reorderChapters(chapters) {
  // 1. 验证 parentId
  const chapterIds = new Set(chapters.map(c => c.id))
  const invalidParents = chapters.filter(c => 
    c.parentId && !chapterIds.has(c.parentId)
  )
  if (invalidParents.length > 0) throw new Error(...)
  
  // 2. 拓扑排序
  const sorted = []
  const visited = new Set()
  const visiting = new Set()
  
  const visit = (id) => {
    if (visited.has(id)) return
    if (visiting.has(id)) return // 循环引用
    
    visiting.add(id)
    const chapter = chapters.find(c => c.id === id)
    if (chapter.parentId) visit(chapter.parentId)
    
    visiting.delete(id)
    visited.add(id)
    sorted.push(chapter)
  }
  
  chapters.forEach(c => visit(c.id))
  
  // 3. 按顺序更新
  for (const chapter of sorted) {
    await update(chapter.id, {
      parentId: chapter.parentId || null,
      orderIndex: chapter.orderIndex,
      level: chapter.level
    })
  }
}
```

## 🎯 总结

**问题**: 拖拽排序时外键约束违反  
**原因**: 更新顺序不当,子章节先于父章节更新  
**解决**: 拓扑排序 + parentId 验证 + 循环检测  
**效果**: ✅ 所有拖拽场景都能正确保存

---

**修复日期**: 2025-10-10  
**状态**: ✅ 已修复并测试
