# 章节拖拽验证逻辑设计

## 🎯 目标
实现3层目录限制（level 0, 1, 2），阻止违反限制的拖拽操作

## 📐 核心算法

### 1. 深度计算函数
```typescript
// 计算章节子树的相对深度（从0开始）
getSubTreeDepth(chapterId: string): number {
  const children = chapters.filter(ch => ch.parentId === chapterId)
  if (children.length === 0) return 0
  
  let maxDepth = 0
  for (const child of children) {
    const childDepth = getSubTreeDepth(child.id)
    maxDepth = Math.max(maxDepth, childDepth + 1)
  }
  return maxDepth
}
```

### 2. 验证规则
```
目标层级 + 子树深度 ≤ 2
```

### 3. 示例

#### 情况1：单个章节
- 章节A（无子章节）
- 子树深度 = 0
- 拖到 level 0: 0 + 0 = 0 ✅
- 拖到 level 1: 1 + 0 = 1 ✅
- 拖到 level 2: 2 + 0 = 2 ✅

#### 情况2：两层章节
- 章节A
  - 子章节B
- 子树深度 = 1
- 拖到 level 0: 0 + 1 = 1 ✅
- 拖到 level 1: 1 + 1 = 2 ✅
- 拖到 level 2: 2 + 1 = 3 ❌

#### 情况3：三层章节
- 章节A
  - 子章节B
    - 子章节C
- 子树深度 = 2
- 拖到 level 0: 0 + 2 = 2 ✅
- 拖到 level 1: 1 + 2 = 3 ❌
- 拖到 level 2: 2 + 2 = 4 ❌

## 🔧 实现位置

### ChapterTree.vue
验证拖到**根级别**（level 0）的操作
```typescript
validateRootMove(evt): boolean {
  const draggedChapter = evt.draggedContext.element
  const subTreeDepth = getSubTreeDepth(draggedChapter.id)
  const targetLevel = 0
  
  if (targetLevel + subTreeDepth > 2) {
    showError(`无法移动：会超过3层限制`)
    return false
  }
  return true
}
```

### ChapterTreeNode.vue
验证拖到**子级别**（level 1或2）的操作
```typescript
checkMove(evt): boolean {
  const draggedChapter = evt.draggedContext.element
  const subTreeDepth = getSubTreeDepth(draggedChapter.id)
  const targetLevel = this.chapter.level + 1
  
  if (targetLevel + subTreeDepth > 2) {
    showError(`无法移动：会超过3层限制`)
    return false
  }
  return true
}
```

## ✅ 关键点

1. **统一计算**：两个组件使用完全相同的 `getSubTreeDepth` 函数
2. **目标层级**：
   - 根级别：`targetLevel = 0`
   - 子级别：`targetLevel = parentLevel + 1`
3. **返回 false**：立即阻止拖拽，不等到拖拽完成后再验证
4. **用户反馈**：返回 false 的同时显示错误提示
