# ChapterTree 章节树组件

章节树组件是一个支持无限嵌套、拖拽排序的树形结构组件,用于管理作品的章节和内容。

## 📁 文件结构

```
ChapterTree/
├── index.vue       # 主容器组件 (ChapterTree)
├── Node.vue        # 递归节点组件 (ChapterTreeNode)
├── types.ts        # TypeScript 类型定义
└── README.md       # 本文档
```

## 🎯 组件职责

### index.vue (ChapterTree)
**容器组件** - 负责整体布局和顶层逻辑

- 📊 **布局管理**: 工具栏、头部、根内容区域
- 🎯 **根级别操作**: 添加根章节、添加根内容
- 📡 **事件总线**: 汇总并向上传递所有子节点事件
- 🔍 **数据准备**: 过滤和排序根级别章节

```vue
<ChapterTree
  :chapters="chapters"
  :contents="contents"
  :selected-chapter-id="selectedChapterId"
  @chapter-toggle="handleToggle"
  @chapters-reorder="saveChapterOrder"
/>
```

### Node.vue (ChapterTreeNode)
**递归节点组件** - 负责单个节点的渲染和子树递归

- 🔄 **递归渲染**: 自我引用实现无限层级嵌套
- 📝 **节点显示**: 展开/折叠、图标、标题、操作按钮
- 🎨 **状态管理**: 选中状态、展开状态、拖拽状态
- 🖱️ **拖拽排序**: 支持章节和内容的拖拽重排
- ⚠️ **深度验证**: 3层嵌套限制的实时验证

```vue
<!-- 在 Node.vue 内部递归调用自己 -->
<ChapterTreeNode
  v-for="child in children"
  :chapter="child"
  @chapter-toggle="$emit('chapter-toggle', $event)"
/>
```

## 🌳 树形结构示例

```
📚 作品
├── 📄 根内容 1                    ← 根级别内容
├── 📄 根内容 2
├── 📂 第一卷 (Level 0)            ← 一级章节
│   ├── 📄 卷内容 1
│   ├── 📁 第一章 (Level 1)        ← 二级章节
│   │   ├── 📄 章节内容 1
│   │   ├── 📄 章节内容 2
│   │   └── 📄 第一节 (Level 2)    ← 三级章节 (最大深度)
│   │       ├── 📄 节内容 1
│   │       └── 📄 节内容 2
│   └── 📁 第二章 (Level 1)
│       └── 📄 章节内容
└── 📂 第二卷 (Level 0)
    └── 📁 第一章 (Level 1)
```

## 🎨 Props 接口

```typescript
interface ChapterTreeProps {
  /** 所有章节数据 */
  chapters: ChapterLocal[]
  /** 所有内容数据 */
  contents: Content[]
  /** 当前选中的章节ID */
  selectedChapterId?: string
  /** 当前选中的内容ID */
  selectedContentId?: string
}
```

## 📡 Events 事件

### 章节操作
- `chapter-toggle` - 展开/折叠章节
- `chapter-select` - 选中章节
- `chapter-edit` - 编辑章节
- `chapter-delete` - 删除章节
- `add-chapter` - 添加根章节
- `add-sub-chapter` - 添加子章节

### 内容操作
- `add-content` - 添加内容
- `content-select` - 选中内容
- `content-edit` - 编辑内容
- `content-delete` - 删除内容

### 批量操作
- `chapters-reorder` - 章节重新排序后触发
- `contents-reorder` - 内容重新排序后触发
- `drag-error` - 拖拽验证失败时触发

## 🔧 核心功能

### 1️⃣ 三层嵌套限制

系统限制最多 3 层嵌套 (Level 0, 1, 2):

```typescript
// Level 0: 卷/部
// Level 1: 章
// Level 2: 节
// Level 3: ❌ 不允许
```

**验证逻辑**:
- ✅ Level 0 可以添加子章节 → Level 1
- ✅ Level 1 可以添加子章节 → Level 2
- ❌ Level 2 **不能**添加子章节
- ❌ 拖拽到 Level 2 章节内部会被阻止

### 2️⃣ 拖拽排序

支持以下拖拽操作:

| 拖拽源 | 目标位置 | 结果 |
|-------|---------|------|
| 章节 | 其他章节前/后 | 修改 `orderIndex` |
| 章节 | 其他章节内部 | 修改 `parentId` 和 `level` |
| 内容 | 其他内容前/后 | 修改 `orderIndex` |
| 内容 | 章节内部 | 修改 `chapterId` |

**拖拽约束**:
- 不能拖拽到会导致超过 3 层的位置
- 不能拖拽到自己的子孙节点下
- 必须维持正确的层级关系

### 3️⃣ 实时深度计算

```typescript
// 计算拖拽后的新深度
function calculateDepth(targetParentId?: string): number {
  if (!targetParentId) return 0 // 根级别
  
  let depth = 0
  let current = targetParentId
  
  while (current && depth < 10) { // 防止循环引用
    const parent = chapters.find(c => c.id === current)
    if (!parent) break
    depth++
    current = parent.parentId
  }
  
  return depth
}
```

## 🎯 使用示例

```vue
<template>
  <ChapterTree
    :chapters="chapters"
    :contents="contents"
    :selected-chapter-id="currentChapterId"
    :selected-content-id="currentContentId"
    @chapter-toggle="handleToggle"
    @chapter-edit="handleEdit"
    @add-chapter="handleAddChapter"
    @chapters-reorder="handleChaptersReorder"
    @contents-reorder="handleContentsReorder"
    @drag-error="showError"
  />
</template>

<script setup lang="ts">
import ChapterTree from '@/components/ChapterTree'
import type { ChapterLocal, Content } from '@/components/ChapterTree/types'

const chapters = ref<ChapterLocal[]>([])
const contents = ref<Content[]>([])

// 处理章节重排序
const handleChaptersReorder = async (reorderedChapters) => {
  await chapterApi.reorderChapters(currentUser.value.id, reorderedChapters)
  console.log('✅ 章节顺序已保存')
}

// 处理内容重排序
const handleContentsReorder = async (reorderedContents) => {
  await contentApi.reorderContents(currentUser.value.id, reorderedContents)
  console.log('✅ 内容顺序已保存')
}
</script>
```

## 🔄 为什么分成两个文件?

### ❌ 如果合并成一个文件

```vue
<!-- ❌ 这样做会有问题 -->
<template>
  <div class="chapter-tree">
    <!-- 无法在同一文件中递归引用自己 -->
    <ChapterTree :chapters="children" />  <!-- 😱 Vue不允许! -->
  </div>
</template>
```

### ✅ 分离后的优点

1. **清晰的递归**: Node.vue 可以递归引用自己
2. **职责分离**: 容器管理布局,节点管理递归
3. **易于维护**: 修改节点逻辑不影响容器
4. **性能优化**: Vue 可以更好地追踪单个节点的变化
5. **标准模式**: 所有主流 UI 库都采用这种模式

## 🛠️ 开发指南

### 修改容器 (index.vue)
- 添加/修改工具栏按钮
- 调整整体布局样式
- 修改根级别数据处理

### 修改节点 (Node.vue)
- 调整节点显示样式
- 修改拖拽验证逻辑
- 增加节点操作按钮

### 修改类型 (types.ts)
- 添加新的接口定义
- 导出共享类型
- 更新事件类型

## 🐛 调试技巧

### 查看拖拽过程

```typescript
// 在 Node.vue 中添加日志
const checkMove = (evt) => {
  console.log('🔍 拖拽验证:', {
    from: evt.draggedContext.element.title,
    to: evt.relatedContext.element.title,
    futureIndex: evt.draggedContext.futureIndex
  })
  return validateMove(evt)
}
```

### 验证层级深度

```typescript
// 检查所有章节的层级
chapters.value.forEach(chapter => {
  const depth = calculateDepth(chapter.parentId)
  if (depth !== chapter.level) {
    console.warn('⚠️ 层级不一致:', chapter.title, { expected: depth, actual: chapter.level })
  }
})
```

## 📚 相关文档

- [Vue Draggable 文档](https://github.com/SortableJS/vue.draggable.next)
- [递归组件](https://vuejs.org/guide/essentials/component-basics.html#recursive-components)
- [作品管理 API](../../services/api.ts)

## ✨ 最佳实践

1. **始终验证拖拽**: 使用 `validateMove` 防止无效操作
2. **显示错误提示**: 拖拽失败时通过 `drag-error` 事件通知用户
3. **保持数据一致**: 重排序后立即更新 `orderIndex` 和 `level`
4. **防御性编程**: 检查 `parentId` 是否存在,防止孤儿节点
5. **性能优化**: 大量节点时使用虚拟滚动 (待实现)

---

**维护者**: Gestell Team  
**最后更新**: 2025-10-10
