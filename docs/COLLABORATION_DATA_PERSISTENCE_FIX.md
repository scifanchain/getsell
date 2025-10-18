# 协作模式数据持久化问题修复

> **严重问题**: 协作模式下的内容只保存在 Yjs 服务器内存中，服务器重启后数据丢失  
> **日期**: 2025-10-18

---

## 🐛 问题现象

用户发现的问题：

1. ❌ 协作模式（team/public）下，内容保存和读取依赖 Yjs WebSocket 服务器
2. ❌ 停掉 yjs-server，打开文档显示空内容
3. ✅ 开启 yjs-server，保存和打开内容正常
4. ❌ 再次停掉 yjs-server，内容丢失

**根本原因**：协作模式下的内容没有持久化到 SQLite 数据库。

---

## 🔍 问题分析

### 当前架构

**私有模式（private）**：
```
编辑器 → handleContentUpdate → SQLite 数据库
                                    ↓
                              持久化存储 ✅
```

**协作模式（team/public）**：
```
编辑器 → Yjs (ySyncPlugin) → WebSocket 服务器内存
                                    ↓
                              服务器重启丢失 ❌
```

### 代码追踪

#### 1. Editor 组件（协作状态）

**问题代码** (`src/ui/components/Editor.vue`, line 210-228):
```typescript
const createCollaborativeState = () => {
  if (!ydoc) throw new Error('Y.Doc not initialized')
  
  const yXmlFragment = ydoc.getXmlFragment('prosemirror')
  
  const plugins = [
    ySyncPlugin(yXmlFragment),        // ← Yjs 同步插件
    yCursorPlugin(awareness!),
    yUndoPlugin(),
    // ...
  ]

  return EditorState.create({
    schema,
    plugins
  })
}
```

**问题**：
- `ySyncPlugin` 会自动同步 Yjs 文档变化到其他客户端
- 但**不会**触发 ProseMirror 的 `dispatchTransaction`
- 导致 `handleContentUpdate` 不被调用
- `currentContent.value.content` 不更新

#### 2. 保存逻辑（WritingView）

**原问题代码** (`src/ui/views/WritingView.vue`, line 518):
```typescript
// 在协同模式下，同时保存内容和记录位置
if (isCollaborationActive.value && currentWork.value) {
  // 保存内容到数据库 (作为备份)
  await contentService.updateContent(activeContent.id, author.id, {
    content: activeContent.content,  // ❌ 这个值从未更新！
    format: 'prosemirror'
  })
}
```

**问题**：
- `activeContent.content` 在协作模式下不会更新
- 保存的是旧内容或空内容
- SQLite 数据库中没有最新数据

---

## 🔧 解决方案

### 修复 1：从 Editor 获取实时内容

**添加 Editor ref** (`src/ui/views/WritingView.vue`):
```vue
<template>
  <Editor
    ref="editorRef"  <!-- ✅ 添加 ref -->
    :key="editorKey"
    :collaboration-mode="isCollaborationActive"
    @change="handleContentUpdate"
    <!-- ... -->
  />
</template>

<script setup>
// ✅ 定义 ref
const editorRef = ref<{ getContent: () => string } | null>(null)
</script>
```

**修改保存逻辑**:
```typescript
// 在协同模式下，同时保存内容和记录位置
if (isCollaborationActive.value && currentWork.value) {
  saveStatus.value = 'saving'
  try {
    // ✅ 修复：在协作模式下，从 Editor 组件获取最新内容
    let contentToSave = activeContent.content
    if (editorRef.value && editorRef.value.getContent) {
      contentToSave = editorRef.value.getContent()
      console.log('📝 从 Editor 获取最新内容 (协作模式):', {
        contentLength: contentToSave.length
      })
    }
    
    // 保存内容到数据库 (作为备份)
    await contentService.updateContent(activeContent.id, author.id, {
      content: contentToSave,  // ✅ 使用从 Editor 获取的最新内容
      format: 'prosemirror'
    })
    
    // ...
  }
}
```

### Editor 组件已有的支持

Editor 组件已经暴露了 `getContent` 方法 (`src/ui/components/Editor.vue`, line 466):
```typescript
defineExpose({
  focus: () => editorView?.focus(),
  getContent: getDocumentContent,  // ✅ 已有
  updateContent
})

// getDocumentContent 实现 (line 350)
const getDocumentContent = (): string => {
  if (!editorView) return ''
  
  // 将 ProseMirror 文档序列化为 JSON 格式
  const json = editorView.state.doc.toJSON()
  return JSON.stringify(json)
}
```

---

## ✅ 修复后的工作流程

### 协作模式保存流程

```
1. 用户在协作模式下编辑内容
   ↓
2. Yjs 同步变化到其他客户端 (实时)
   ↓
3. 30秒后自动保存触发
   ↓
4. editorRef.value.getContent() 获取最新内容
   ↓
5. 保存到 SQLite 数据库 (持久化)
   ↓
6. 同时记录最后编辑位置
```

### 数据持久化保证

**协作模式（修复后）**：
- ✅ Yjs 服务器：实时协作同步
- ✅ SQLite 数据库：持久化备份（30秒自动保存）
- ✅ 服务器重启：从 SQLite 恢复数据

**私有模式**：
- ✅ SQLite 数据库：唯一存储（30秒自动保存）
- ✅ 无需 Yjs 服务器

---

## 📊 测试验证

### 测试步骤

1. **启动 Yjs 服务器**
   ```bash
   cd yjs-server
   npm start
   ```

2. **创建协作作品并编辑内容**
   - 创建 `collaborationMode = 'team'` 的作品
   - 编辑一些内容
   - 等待自动保存（30秒）

3. **验证 SQLite 数据库**
   - 打开 SQLite 数据库文件
   - 查询 `contents` 表
   - 确认 `contentJson` 字段有数据

4. **停止 Yjs 服务器**
   ```bash
   # 停止服务器
   Ctrl+C
   ```

5. **刷新页面并打开内容**
   - ✅ 应该能看到之前编辑的内容
   - ✅ 内容从 SQLite 加载

6. **重新启动 Yjs 服务器**
   ```bash
   npm start
   ```

7. **继续编辑**
   - ✅ Yjs 同步正常
   - ✅ 自动保存到 SQLite

### 预期日志

**自动保存时**（协作模式）：
```
⏰ 自动保存定时器触发, hasUnsavedChanges: true
💾 执行自动保存...
✅ 开始执行保存...
📝 从 Editor 获取最新内容 (协作模式): { contentLength: 1234 }
已保存内容并记录位置 (协同模式): xxx-xxx-xxx
```

**加载内容时**：
```
🔍 [ContentService] mapToContentInfo: {
  id: "xxx",
  hasContentJson: true,        ← ✅ 数据库有内容
  contentTextLength: 1234
}
📦 从服务获取的完整内容对象: { content: "{...}" }
✅ 已设置 currentContent.value
```

---

## 🎯 架构改进

### 双层持久化策略

1. **实时层（Yjs）**：
   - 用途：实时协作同步
   - 存储：WebSocket 服务器内存
   - 优点：低延迟、实时同步
   - 缺点：重启丢失

2. **持久层（SQLite）**：
   - 用途：数据备份和恢复
   - 存储：本地 SQLite 数据库
   - 优点：持久化、可靠
   - 缺点：有延迟（30秒）

### 数据流

```
┌─────────────────┐
│  用户A 编辑     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     WebSocket      ┌─────────────────┐
│  Yjs Document   │ ◄────────────────► │  用户B 实时看到  │
└────────┬────────┘                    └─────────────────┘
         │
         │ 30秒自动保存
         ▼
┌─────────────────┐
│ SQLite 数据库   │  ← 持久化备份
└────────┬────────┘
         │
         │ 服务器重启后
         ▼
┌─────────────────┐
│  恢复到 Yjs     │  ← 从数据库加载
└─────────────────┘
```

---

## 🚀 未来优化

### 1. 增量备份

目前每30秒保存整个文档，可以优化为只保存变化：

```typescript
// 记录上次保存的版本
let lastSavedVersion = 0

// 只在版本变化时保存
if (ydoc.version > lastSavedVersion) {
  await saveToDatabase()
  lastSavedVersion = ydoc.version
}
```

### 2. Yjs 持久化插件

使用 `y-indexeddb` 或 `y-leveldb` 将 Yjs 文档持久化：

```typescript
import { IndexeddbPersistence } from 'y-indexeddb'

const persistence = new IndexeddbPersistence(contentId, ydoc)
```

### 3. 版本历史

保存每次自动保存的版本到 `contentVersions` 表：

```typescript
await contentService.createVersion({
  contentId: activeContent.id,
  content: contentToSave,
  changeSummary: '自动保存 (协作模式)',
  authorId: author.id
})
```

---

## ✅ 修复清单

- [x] 添加 `editorRef` 引用
- [x] 修改保存逻辑从 Editor 获取最新内容
- [x] 添加调试日志
- [x] 创建修复文档
- [ ] 测试协作模式自动保存
- [ ] 测试服务器重启后数据恢复
- [ ] 验证私有模式不受影响
- [ ] 考虑增量备份优化
- [ ] 考虑 Yjs 持久化插件

---

**修复时间**: 2025-10-18  
**修复状态**: ✅ 代码已修复，等待测试验证  
**严重级别**: 🔴 高危（数据丢失风险）
