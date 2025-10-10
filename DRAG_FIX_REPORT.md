# 章节拖拽功能修复报告

## 🐛 问题诊断

### 根本原因
`getChapterMaxDepth` 函数的参数 `currentDepth` 导致深度计算错误。该函数在递归调用时累积深度，而不是返回相对深度。

### 错误的代码（之前）
```typescript
const getChapterMaxDepth = (chapterId: string, currentDepth = 0): number => {
  const childChapters = props.chapters.filter(ch => ch.parentId === chapterId)
  if (childChapters.length === 0) {
    return currentDepth  // ❌ 返回累积深度
  }
  
  let maxChildDepth = currentDepth
  for (const child of childChapters) {
    const childDepth = getChapterMaxDepth(child.id, currentDepth + 1)  // ❌ 传递累积深度
    maxChildDepth = Math.max(maxChildDepth, childDepth)
  }
  
  return maxChildDepth
}
```

**问题**：
- 第一次调用时 `currentDepth = 0`
- 但递归时会累积，导致返回值不是相对深度
- 例如：有1层子章节时，返回1而不是1（恰好正确），但逻辑本身是错的

### 正确的代码（修复后）
```typescript
const getSubTreeDepth = (chapterId: string): number => {
  const childChapters = props.chapters.filter(ch => ch.parentId === chapterId)
  if (childChapters.length === 0) {
    return 0  // ✅ 没有子章节，返回0
  }
  
  let maxChildDepth = 0
  for (const child of childChapters) {
    const childDepth = getSubTreeDepth(child.id)
    maxChildDepth = Math.max(maxChildDepth, childDepth + 1)  // ✅ +1表示当前这一层
  }
  
  return maxChildDepth
}
```

**修复**：
- 移除 `currentDepth` 参数
- 从0开始计算相对深度
- 每层递归返回时 +1
- 返回值：0（无子章节）、1（1层子章节）、2（2层子章节）

## ✅ 修复内容

### 1. ChapterTree.vue
- 重命名函数：`getChapterMaxDepth` → `getSubTreeDepth`
- 移除错误的 `currentDepth` 参数
- 简化 `validateMoveDepth` 函数逻辑
- 优化控制台输出

### 2. ChapterTreeNode.vue
- 重命名函数：`getChapterMaxDepth` → `getSubTreeDepth`
- 移除错误的 `currentDepth` 参数
- 简化 `checkMove` 函数逻辑
- 优化控制台输出

## 🧪 测试场景

### 场景1：单个章节（无子章节）
```
章节A
子树深度 = 0
```
- 拖到 level 0: 0 + 0 = 0 ✅
- 拖到 level 1: 1 + 0 = 1 ✅
- 拖到 level 2: 2 + 0 = 2 ✅

### 场景2：两层章节
```
章节A
  └─ 子章节B
子树深度 = 1
```
- 拖到 level 0: 0 + 1 = 1 ✅
- 拖到 level 1: 1 + 1 = 2 ✅
- 拖到 level 2: 2 + 1 = 3 ❌ **应该被阻止**

### 场景3：三层章节
```
章节A
  └─ 子章节B
       └─ 子章节C
子树深度 = 2
```
- 拖到 level 0: 0 + 2 = 2 ✅
- 拖到 level 1: 1 + 2 = 3 ❌ **应该被阻止**
- 拖到 level 2: 2 + 2 = 4 ❌ **应该被阻止**

## 📋 验证清单

请测试以下操作：

- [ ] 将无子章节的章节拖到任何位置 → 应该都允许
- [ ] 将有1层子章节的章节拖到根级别 → 应该允许
- [ ] 将有1层子章节的章节拖到level 1章节下 → 应该允许
- [ ] 将有1层子章节的章节拖到level 2章节下 → **应该阻止**
- [ ] 将有2层子章节的章节拖到根级别 → 应该允许
- [ ] 将有2层子章节的章节拖到任何子级别 → **应该全部阻止**
- [ ] 被阻止时应该看到红色错误提示
- [ ] 控制台应该显示清晰的日志信息

## 🔧 核心算法

### 验证公式
```
目标层级 + 子树深度 ≤ 2
```

### 层级定义
- Level 0：根级章节
- Level 1：一级子章节
- Level 2：二级子章节

### 深度定义（相对深度）
- 深度 0：无子章节
- 深度 1：有1层子章节
- 深度 2：有2层子章节

## 📝 注意事项

1. **两个组件使用完全相同的逻辑**
   - ChapterTree.vue：检查拖到根级别
   - ChapterTreeNode.vue：检查拖到子级别

2. **返回 false 立即阻止拖拽**
   - 不等拖拽完成后再检查
   - 用户会立即看到不允许拖放的视觉反馈

3. **错误提示友好**
   - 显示章节名称
   - 说明子树层数
   - 解释为什么不能移动

## 🎯 预期效果

- ✅ 严格执行3层目录限制
- ✅ 实时阻止违规拖拽
- ✅ 清晰的错误提示
- ✅ 控制台详细日志
- ✅ 不影响合法的同级排序
- ✅ 不影响合法的跨级移动
