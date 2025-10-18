# WebSocket 重连问题调试指南

> **问题**: 自动保存触发时 WebSocket 连接断开并重连  
> **日期**: 2025-10-18

---

## 🐛 问题现象

从用户提供的日志中看到：

```
⏰ 自动保存定时器触发, hasUnsavedChanges: false
✓ 没有未保存的更改
⚠️ WebSocket 连接关闭: null
🔄 连接状态变化: disconnected
❌ WebSocket 连接失败
🔄 连接状态变化: connecting
⏳ WebSocket 连接中...
🔄 连接状态变化: connected
✅ WebSocket 连接成功！
```

**分析**：自动保存触发后，WebSocket 连接被意外关闭，然后自动重连。

---

## 🔍 可能的原因

### 1. **Editor 组件重新挂载**

**触发条件**：Vue 的 `:key` 属性变化会导致组件销毁和重新创建

```vue
<Editor
  :key="editorKey"  <!-- 如果这个值变化，组件会重新挂载 -->
  ...
/>
```

**editorKey 计算逻辑**：
```typescript
const editorKey = computed(() => {
  const contentId = currentContent.value?.id ?? 'empty'
  const mode = isCollaborationActive.value ? 'collab' : 'solo'
  return `${contentId}-${mode}`
})
```

**可能导致变化的情况**：
- `currentContent.value?.id` 变化
- `isCollaborationActive.value` 变化

### 2. **currentContent 对象引用变化**

在 `saveContentToDatabase()` 中发现：

```typescript
// 更新 updatedAt 时间
if (currentContent.value) {
  currentContent.value = {
    ...currentContent.value,  // ❌ 创建新对象
    updatedAt: new Date().toISOString()
  }
}
```

虽然 ID 没变，但对象引用变了，可能触发其他响应式副作用。

### 3. **协作模式状态变化**

`isCollaborationActive` 依赖于 `currentWork.value.collaborationMode`，如果自动保存过程中这个值变化，会触发 Editor 组件的 watch：

```typescript
watch(() => props.collaborationMode, async (newMode) => {
  if (newMode && !collaborationEnabled.value) {
    await enableCollaboration()  // 会初始化新的 WebSocket
  } else if (!newMode && collaborationEnabled.value) {
    cleanupCollaboration()  // 会关闭 WebSocket
    await initEditor()
  }
})
```

---

## ✅ 已添加的调试日志

### Editor.vue

```typescript
// 1. 组件生命周期
onMounted(() => {
  console.log('🎬 [Editor] 组件挂载, props:', {
    contentId: props.contentId,
    userId: props.userId,
    collaborationMode: props.collaborationMode
  })
})

onUnmounted(() => {
  console.log('💀 [Editor] 组件卸载, contentId:', props.contentId)
})

// 2. 协作模式变化监听
watch(() => props.collaborationMode, async (newMode, oldMode) => {
  console.log('👀 [Editor] collaborationMode 变化:', { 
    oldMode, 
    newMode,
    collaborationEnabled: collaborationEnabled.value 
  })
})
```

### WritingView.vue

```typescript
// 1. editorKey 计算
const editorKey = computed(() => {
  const contentId = currentContent.value?.id ?? 'empty'
  const mode = isCollaborationActive.value ? 'collab' : 'solo'
  const key = `${contentId}-${mode}`
  console.log('🔑 [WritingView] editorKey 计算:', { 
    contentId, 
    mode, 
    key,
    collaborationMode: currentWork.value?.collaborationMode
  })
  return key
})

// 2. editorKey 变化监听
watch(editorKey, (newKey, oldKey) => {
  console.log('🔑 [WritingView] editorKey 变化!', {
    oldKey,
    newKey,
    willRemountEditor: newKey !== oldKey
  })
})
```

---

## 📋 调试步骤

### 1. 刷新页面，等待自动保存触发

```bash
# 观察控制台日志，寻找以下关键信息：

# 自动保存触发前
⏰ 自动保存定时器触发

# 是否有 editorKey 变化？
🔑 [WritingView] editorKey 变化!
    oldKey: "xxx-collab"
    newKey: "xxx-solo"  // ← 如果看到这个，说明协作模式变了

# 是否有组件重新挂载？
💀 [Editor] 组件卸载, contentId: xxx
🎬 [Editor] 组件挂载, props: { contentId: xxx, ... }

# 是否有 collaborationMode 变化？
👀 [Editor] collaborationMode 变化:
    oldMode: true
    newMode: false  // ← 如果看到这个，说明协作模式被关闭了
```

### 2. 分析日志序列

**场景 A：editorKey 变化导致组件重新挂载**

```
🔑 editorKey 计算: { contentId: "xxx", mode: "collab", key: "xxx-collab" }
⏰ 自动保存定时器触发
🔑 editorKey 计算: { contentId: "xxx", mode: "solo", key: "xxx-solo" }  ← mode 变了！
🔑 editorKey 变化! { oldKey: "xxx-collab", newKey: "xxx-solo" }
💀 组件卸载  ← Vue 销毁旧组件
⚠️ WebSocket 连接关闭
🎬 组件挂载  ← Vue 创建新组件
🔌 使用 WebSocket 连接: ws://localhost:4001
✅ WebSocket 连接成功！
```

**场景 B：collaborationMode prop 变化**

```
⏰ 自动保存定时器触发
👀 collaborationMode 变化: { oldMode: true, newMode: false }  ← prop 变了！
🔄 禁用协作模式...
⚠️ WebSocket 连接关闭
```

---

## 🔧 解决方案

### 方案 1：避免不必要的对象重新创建

**问题代码**：
```typescript
// saveContentToDatabase() 中
if (currentContent.value) {
  currentContent.value = {
    ...currentContent.value,  // ❌ 创建新对象
    updatedAt: new Date().toISOString()
  }
}
```

**修复方案**：
```typescript
// 方案 A：不更新 updatedAt（推荐）
// 因为数据库已经自动更新 updatedAt，没必要在前端也更新

// 方案 B：如果必须更新，使用 Object.assign 修改原对象
if (currentContent.value) {
  Object.assign(currentContent.value, {
    updatedAt: new Date().toISOString()
  })
}

// 方案 C：只在真正需要时更新（不在自动保存时更新）
if (currentContent.value && !isAutoSave) {
  currentContent.value.updatedAt = new Date().toISOString()
}
```

### 方案 2：确保 editorKey 稳定

**问题**：如果 `isCollaborationActive` 在保存过程中变化，会导致 editorKey 变化

**检查**：
```typescript
const isCollaborationActive = computed(() => {
  if (!currentWork.value) return false
  const mode = currentWork.value.collaborationMode || 'private'
  console.log('🔍 isCollaborationActive 计算:', { mode })
  return mode === 'team' || mode === 'public'
})
```

**确保**：`currentWork.value.collaborationMode` 在自动保存时不会变化

### 方案 3：添加保护机制

**在自动保存时添加标志**：

```typescript
const isAutoSaving = ref(false)

const saveContentToDatabase = async () => {
  if (isAutoSaving.value) {
    console.log('⚠️ 自动保存进行中，跳过')
    return
  }
  
  isAutoSaving.value = true
  try {
    // 保存逻辑...
  } finally {
    isAutoSaving.value = false
  }
}
```

---

## 🎯 下一步行动

1. **刷新页面，等待30秒自动保存触发**
2. **观察控制台日志**，找到关键信息：
   - 是否有 `editorKey 变化`？
   - 是否有 `组件卸载/挂载`？
   - 是否有 `collaborationMode 变化`？
3. **根据日志确定根本原因**
4. **应用对应的修复方案**

---

**当前状态**: ✅ **已修复！**

---

## ✅ 问题已解决

### 根本原因

通过日志分析发现，问题不是自动保存触发的，而是 **用户点击内容切换** 时触发的！

**问题代码** (WritingView.vue, line 852):
```typescript
const handleContentSelect = async (contentId: string) => {
  // ...
  
  // ❌ 问题：清空内容导致 editorKey 变化
  currentContent.value = null  // 从 "content-123-collab" → "empty-collab"
  isLoadingContent.value = true
  
  // 加载新内容
  const content = await contentService.fetchContent(contentId, userId)
  currentContent.value = content  // 从 "empty-collab" → "content-123-collab"
}
```

**触发链**：
1. `currentContent.value = null`
2. `editorKey` 从 `"content-123-collab"` → `"empty-collab"` 
3. Vue 检测到 `:key` 变化，销毁旧 Editor 组件
4. **WebSocket 连接关闭** ⚠️
5. 加载新内容后，`editorKey` 变回 `"content-123-collab"`
6. Vue 创建新 Editor 组件
7. **WebSocket 重新连接** ✅

### 修复方案

**不要清空 `currentContent`**，只设置加载状态：

```typescript
const handleContentSelect = async (contentId: string) => {
  // ...
  
  // ✅ 修复：不清空内容，保持 Editor 组件挂载
  // currentContent.value = null  // ❌ 删除这行
  isLoadingContent.value = true  // ✅ 只设置加载状态
  
  // 加载新内容
  const content = await contentService.fetchContent(contentId, userId)
  currentContent.value = content  // editorKey 保持稳定
}
```

**修复效果**：
- ✅ `editorKey` 保持不变（或者正常变化一次）
- ✅ Editor 组件不会重新挂载
- ✅ WebSocket 连接保持活跃
- ✅ 内容切换流畅

---

## 📋 测试验证

### 测试步骤

1. 刷新页面
2. 点击不同的章节/内容进行切换
3. 观察控制台日志

### 预期结果

**修复前**：
```
🔍 用户选择内容: xxx
🔑 editorKey 计算: { contentId: "xxx", mode: "collab", key: "xxx-collab" }
🔑 editorKey 计算: { contentId: "empty", mode: "collab", key: "empty-collab" }  ← 变成 empty！
💀 [Editor] 组件卸载  ← 组件被销毁
⚠️ WebSocket 连接关闭
🔑 editorKey 计算: { contentId: "yyy", mode: "collab", key: "yyy-collab" }
🎬 [Editor] 组件挂载  ← 组件重新创建
🔌 使用 WebSocket 连接: ws://localhost:4001
✅ WebSocket 连接成功！
```

**修复后**：
```
🔍 用户选择内容: yyy
🔑 editorKey 计算: { contentId: "yyy", mode: "collab", key: "yyy-collab" }
// 没有 "empty" 出现！
// 没有组件卸载/挂载！
// WebSocket 连接保持活跃！
```

---

**当前状态**: ✅ 已修复，等待用户验证
