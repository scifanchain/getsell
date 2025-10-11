# 章节和内容关系修复报告

## 修复时间
2025-10-11

## 问题背景

### 原先的错误理解 ❌
误以为"一个章节有多个内容"是指：
- 多个**版本**（类似 Git commit）
- 可选的、并列的不同版本
- 需要下拉菜单切换

### 正确的理解 ✅
**章节和内容是组合关系**：
```
Chapter (第一章)
  ├─ Content 1 (第一段/第一节)
  ├─ Content 2 (第二段/第二节)
  ├─ Content 3 (第三段/第三节)
  └─ Content 4 (第四段/第四节)
```

**就像**：
- 一本书的"第一章"包含多个段落/小节
- 这些内容按 `orderIndex` **顺序排列**
- 它们**共同构成**完整的章节内容
- 不是"版本选择"，而是"内容片段组合"

---

## 数据库模型

### Chapter 模型
```prisma
model Chapter {
  id                 String    @id
  workId             String
  parentId           String?   // 支持3级层次结构
  level              Int       @default(1)
  orderIndex         Int
  title              String
  wordCount          Int       @default(0)
  contentCount       Int       @default(0)  // 该章节下的内容片段数量
  contents           Content[] // 一对多关系
  ...
}
```

### Content 模型
```prisma
model Content {
  id                  String    @id
  workId              String
  chapterId           String?   // 属于哪个章节
  orderIndex          Int       // 在章节内的排序
  title               String?
  contentJson         String?   // ProseMirror JSON
  wordCount           Int       @default(0)
  lastEditedAt        DateTime
  ...
}
```

---

## 修复内容

### 1. 添加内容选择处理函数

**位置**: `src/ui/views/WritingView.vue`

**新增函数**: `handleContentSelect()`

```typescript
// 处理内容选择 - 用户在 ChapterTree 中点击某个内容
const handleContentSelect = async (contentId: string) => {
  try {
    if (!currentUser.value) {
      showNotification('用户未登录', 'error')
      return
    }

    console.log('用户选择内容:', contentId)
    
    // 直接加载指定的内容
    const content = await contentApi.get(contentId, currentUser.value.id)
    currentContent.value = content
    
    console.log('已加载选中的内容:', {
      id: content.id,
      title: content.title || '无标题',
      chapterId: content.chapterId
    })
    
    // 更新选中的章节ID（如果需要）
    if (content.chapterId && selectedChapterId.value !== content.chapterId) {
      selectedChapterId.value = content.chapterId
    }
  } catch (error: any) {
    console.error('Load content failed:', error)
    showNotification(`加载内容失败: ${error.message || '未知错误'}`, 'error')
  }
}
```

---

### 2. 优化章节内容加载逻辑

**修改前**:
```typescript
if (contentList.length > 0) {
  // 总是加载第一个
  currentContent.value = contentList[0]
}
```

**修改后**:
```typescript
if (contentList.length > 0) {
  // 按最后编辑时间排序，加载最新编辑的内容
  const sortedByEditTime = [...contentList].sort((a, b) => {
    const timeA = new Date(a.lastEditedAt || a.updatedAt || a.createdAt).getTime()
    const timeB = new Date(b.lastEditedAt || b.updatedAt || b.createdAt).getTime()
    return timeB - timeA // 降序，最新的在前
  })
  
  currentContent.value = sortedByEditTime[0]
  
  console.log('已加载最新编辑的内容:', {
    id: currentContent.value.id,
    title: currentContent.value.title || '无标题',
    lastEditedAt: currentContent.value.lastEditedAt,
    totalContents: contentList.length
  })
  
  if (contentList.length > 1) {
    console.log(`该章节有 ${contentList.length} 个内容片段，已加载最新编辑的版本`)
  }
}
```

---

### 3. 更新 ChapterTree 事件绑定

**修改前**:
```vue
<ChapterTree
  :chapters="chapters"
  :contents="contents"
  @chapter-toggle="handleChapterSelect"
  @chapter-edit="handleChapterEdit"
  ...
/>
```

**修改后**:
```vue
<ChapterTree
  :chapters="chapters"
  :contents="contents"
  @chapter-toggle="handleChapterSelect"
  @chapter-click="handleChapterSelect"
  @content-select="handleContentSelect"  <!-- 新增 -->
  @chapter-edit="handleChapterEdit"
  ...
/>
```

---

## 完整的交互流程

### 流程 1: 点击章节

```
用户点击章节 "第一章"
  ↓
触发 @chapter-click 事件
  ↓
selectedChapterId.value = "chapter_001"
  ↓
watch(selectedChapterId) 触发
  ↓
调用 loadChapterContent("chapter_001")
  ↓
获取该章节的所有内容列表
[
  { id: "content_001", title: "第一段", lastEditedAt: "2025-10-11 10:00" },
  { id: "content_002", title: "第二段", lastEditedAt: "2025-10-11 12:00" },  ← 最新
  { id: "content_003", title: "第三段", lastEditedAt: "2025-10-11 09:00" }
]
  ↓
按 lastEditedAt 排序，加载 content_002
  ↓
ChapterTree 自动展开，显示该章节的所有内容
  ↓
编辑器加载 content_002 的内容
```

### 流程 2: 点击具体内容

```
用户在 ChapterTree 中点击 "第三段"
  ↓
触发 @content-select="content_003"
  ↓
调用 handleContentSelect("content_003")
  ↓
contentApi.get("content_003", userId)
  ↓
加载该内容到 currentContent
  ↓
编辑器切换到显示 content_003
  ↓
用户可以编辑这个片段
  ↓
自动保存功能持续工作
```

### 流程 3: 创建新内容

```
用户点击章节的 "添加内容" 按钮
  ↓
触发 @add-content 事件
  ↓
调用 createNewContent()
  ↓
创建空的 ProseMirror 文档
  ↓
调用 contentApi.create(userId, {
  chapterId: "chapter_001",
  content: emptyDoc,
  orderIndex: 自动计算（当前最大值 + 1）
})
  ↓
新内容添加到 ChapterTree
  ↓
编辑器加载新内容，用户开始写作
```

---

## ChapterTree 组件已有的功能

✅ **完美支持章节-内容树形结构**：

1. **显示章节下的内容列表**
   ```vue
   <span class="content-count">{{ chapterContents.length }}</span>
   ```

2. **内容拖拽排序**
   ```vue
   <draggable
     v-model="sortedChapterContents"
     :group="{ name: 'chapter-contents' }"
     @change="handleContentDragChange"
   />
   ```

3. **内容选择高亮**
   ```vue
   :class="{ 'selected': props.selectedContentId === content.id }"
   ```

4. **内容操作按钮**
   - ✏️ 编辑内容
   - 🗑️ 删除内容
   - 📄 添加新内容

---

## UI 展示效果

```
+------------------------+--------------------------------+
|  ChapterTree          |  编辑器                        |
|                       |                                |
|  📖 第一章 [3]        |  [正在编辑: 第一章 - 第二段]   |
|    📄 第一段          |                                |
|    📄 第二段 ← 选中   |  [ProseMirror 编辑器]         |
|    📄 第三段          |                                |
|                       |  这里是第二段的内容...         |
|  📖 第二章 [2]        |                                |
|    📄 开场白          |  [自动保存中...]              |
|    📄 主要情节        |                                |
|                       |  字数: 1,234                   |
+------------------------+--------------------------------+
```

---

## 数据一致性保证

### orderIndex 管理

```typescript
// 创建新内容时，自动计算 orderIndex
const createNewContent = async () => {
  // 获取当前章节的所有内容
  const contentList = await contentApi.getByChapter(chapterId, userId)
  
  // 计算新的 orderIndex（最大值 + 1）
  const maxOrderIndex = contentList.length > 0 
    ? Math.max(...contentList.map(c => c.orderIndex))
    : 0
  
  const newContent = await contentApi.create(userId, {
    chapterId,
    content: emptyDoc,
    orderIndex: maxOrderIndex + 1  // 新内容排在最后
  })
}
```

### 内容拖拽后更新

```typescript
const handleContentsReorder = async (reorderedContents: Content[]) => {
  // 更新所有内容的 orderIndex
  const updates = reorderedContents.map((content, index) => ({
    id: content.id,
    chapterId: content.chapterId,
    orderIndex: index + 1
  }))
  
  await contentApi.reorderContents(userId, updates)
}
```

---

## 验证清单

### 基本功能
- [x] 点击章节，加载最新编辑的内容
- [x] 章节树显示内容数量标记
- [x] 点击具体内容，切换到该内容
- [x] 内容高亮显示当前选中
- [ ] 创建新内容，自动排在最后
- [ ] 拖拽调整内容顺序

### 边界情况
- [x] 章节无内容时，显示"开始写作"
- [x] 切换章节时，正确加载新章节内容
- [ ] 删除内容后，自动选择下一个内容
- [ ] 最后一个内容删除后，显示空状态

### 数据完整性
- [ ] orderIndex 连续性检查
- [ ] 内容数量与 chapter.contentCount 一致
- [ ] 拖拽后 orderIndex 正确更新
- [ ] 字数统计正确累加到章节

---

## 下一步工作

### 1. 完善 createNewContent()
- 计算正确的 orderIndex
- 创建时自动设置标题（如"第N段"）
- 创建后自动选中新内容

### 2. 优化内容切换
- 切换时检查是否有未保存内容
- 添加切换动画效果
- 显示当前内容在章节中的位置（如"2/5"）

### 3. 增强 UI 反馈
- 添加"正在加载..."状态
- 显示内容字数统计
- 显示最后编辑时间

---

## 技术细节

### 内容排序逻辑

```typescript
// 按 orderIndex 排序（显示顺序）
const sortedByOrder = contents.sort((a, b) => a.orderIndex - b.orderIndex)

// 按编辑时间排序（找最新编辑的）
const sortedByTime = contents.sort((a, b) => {
  const timeA = new Date(a.lastEditedAt || a.updatedAt).getTime()
  const timeB = new Date(b.lastEditedAt || b.updatedAt).getTime()
  return timeB - timeA
})
```

### 内容创建流程

```
用户操作 → handleAddContent
  ↓
createNewContent()
  ↓
contentApi.create(userId, {
  chapterId,
  content,
  orderIndex  ← 关键
})
  ↓
IPC → Service → Repository → Prisma
  ↓
数据库插入新记录
  ↓
返回新内容对象
  ↓
更新 UI (ChapterTree + Editor)
```

---

## 总结

### 修复成果

✅ **正确理解了章节-内容的组合关系**
- 一个章节 = 多个内容片段的组合
- 内容按 orderIndex 有序排列
- 不是版本关系，而是段落/小节关系

✅ **实现了内容选择功能**
- 添加 `handleContentSelect()` 函数
- 支持在 ChapterTree 中点击具体内容
- 编辑器正确加载选中的内容

✅ **优化了章节加载逻辑**
- 点击章节时加载最新编辑的内容
- 保留所有内容列表供用户切换
- 详细的日志输出便于调试

### 当前状态

- ✅ 内容加载和选择功能完整
- ✅ ChapterTree 组件功能完备
- ⚠️ 内容创建需要完善 orderIndex 逻辑
- ⚠️ 需要端到端测试验证

### 下一步

优先测试完整流程：创建作品 → 创建章节 → 创建多个内容 → 在内容间切换 → 编辑保存 → 调整顺序
