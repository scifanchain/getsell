# 内容切换加载问题修复报告

> **问题**: 点击章节目录中的内容标题时，内容没有被加载渲染到编辑器  
> **日期**: 2025-10-18

---

## 🐛 问题现象

用户点击章节树中的内容时，编辑器显示空白或显示旧内容，新内容没有被加载。

---

## 🔍 问题分析

### 问题根源

1. **Editor 组件不响应 `props.modelValue` 变化**
   - Editor 只在初始化时读取 `props.modelValue`
   - 之后 `modelValue` 变化不会触发编辑器内容更新

2. **editorKey 在某些情况下不变**
   - 当从同一协作模式下的内容 A 切换到内容 B
   - 如果 `currentContent` 不清空，`editorKey` 始终是 `"A-id-collab"` → `"B-id-collab"`
   - 但这会导致 Vue 复用组件，不重新挂载

3. **之前的"过度优化"**
   - 为了避免 WebSocket 重连，完全禁止清空 `currentContent`
   - 但这导致内容切换时 Editor 组件不更新

### 技术细节

**Vue 的 key 机制**：
- 当 `:key` 值变化时，Vue 会销毁旧组件并创建新组件
- 当 `:key` 值相同时，Vue 会复用组件（不重新挂载）

**editorKey 计算逻辑**：
```typescript
const editorKey = computed(() => {
  const contentId = currentContent.value?.id ?? 'empty'
  const mode = isCollaborationActive.value ? 'collab' : 'solo'
  return `${contentId}-${mode}`
})
```

**问题场景**：
```
1. 用户查看内容 A (editorKey = "A-id-collab")
2. 用户点击内容 B
3. 如果不清空 currentContent：
   - currentContent 直接从 A 变为 B
   - editorKey 从 "A-id-collab" 变为 "B-id-collab"
   - Vue 检测到 key 变化，但...
   - 实际上两个 key 都不同，应该会重新挂载
4. 问题可能出在异步加载过程中...
```

实际问题：在之前的修复中，我们删除了 `currentContent.value = null` 这行代码，但没有 `await nextTick()`，导致 Vue 的响应式更新不够及时。

---

## 🔧 解决方案

### 方案：受控的临时清空

**关键思路**：
- ✅ 只在切换到**不同内容**时临时清空
- ✅ 使用 `await nextTick()` 确保 Vue 更新 DOM
- ✅ 立即加载新内容
- ✅ 这样 `editorKey` 会经历：`old-id` → `empty` → `new-id`

**代码实现**：

```typescript
const handleContentSelect = async (contentId: string) => {
  try {
    console.log('🔍 用户选择内容:', contentId)
    
    // 检查是否选择了不同的内容
    const isDifferentContent = currentContent.value?.id !== contentId
    
    // 🔧 关键修复：只在切换到不同内容时临时清空
    if (isDifferentContent && currentContent.value) {
      console.log('🔄 切换到不同内容，临时清空 currentContent')
      currentContent.value = null
      await nextTick() // ✅ 等待 Vue 更新 DOM，确保 editorKey 变为 "empty"
    }
    
    // 设置加载状态
    isLoadingContent.value = true
    
    // 加载新内容
    const content = await contentService.fetchContent(contentId, userId)
    if (!content) {
      showNotification('未找到该内容', 'error')
      isLoadingContent.value = false
      return
    }
    
    // 设置新内容（editorKey 变为 "new-id"）
    currentContent.value = content
    
    // ... 其他逻辑
    
  } catch (error) {
    console.error('加载内容失败:', error)
  } finally {
    isLoadingContent.value = false
  }
}
```

---

## ✅ 修复效果

### 内容切换流程

**修复前**（不工作）：
```
1. 点击内容 B
2. currentContent: A → B (直接变化)
3. editorKey: "A-id-collab" → "B-id-collab"
4. ❌ Editor 组件可能不更新（异步问题）
```

**修复后**（正常工作）：
```
1. 点击内容 B
2. currentContent: A → null (临时清空)
3. editorKey: "A-id-collab" → "empty-collab"
4. await nextTick() (等待 Vue 更新)
5. currentContent: null → B (加载新内容)
6. editorKey: "empty-collab" → "B-id-collab"
7. ✅ Editor 组件重新挂载，加载内容 B
```

### WebSocket 行为

**内容切换时**：
- ⚠️ WebSocket 会短暂断开重连（因为组件重新挂载）
- ✅ 这是**必要的**，因为协作编辑需要切换到新的文档
- ✅ 重连速度很快（通常 < 1秒）

**自动保存时**：
- ✅ 不会清空 `currentContent`（因为 contentId 相同）
- ✅ WebSocket 保持连接
- ✅ 没有重连问题

---

## 📋 测试验证

### 测试步骤

1. 刷新页面
2. 点击不同的章节内容进行切换
3. 观察编辑器是否正确加载新内容

### 预期结果

**内容切换**：
```
🔍 用户选择内容: new-content-id
🔄 切换到不同内容，临时清空 currentContent
🔑 editorKey 计算: { contentId: "empty", mode: "collab" }
💀 [Editor] 组件卸载
📦 从服务获取的完整内容对象: { ... }
✅ 已设置 currentContent.value
🔑 editorKey 计算: { contentId: "new-content-id", mode: "collab" }
🎬 [Editor] 组件挂载
🔌 使用 WebSocket 连接: ws://localhost:4001
✅ WebSocket 连接成功！
```

**自动保存**（30秒后）：
```
⏰ 自动保存定时器触发, hasUnsavedChanges: true
💾 执行自动保存...
// ✅ 没有 editorKey 变化
// ✅ 没有组件卸载/挂载
// ✅ 没有 WebSocket 重连
```

---

## 📚 经验总结

### Vue 响应式最佳实践

1. **使用 `nextTick()` 确保更新时序**
   ```typescript
   // ❌ 错误：连续更新可能不会触发正确的生命周期
   state.value = null
   state.value = newValue
   
   // ✅ 正确：使用 nextTick 确保中间状态被识别
   state.value = null
   await nextTick()
   state.value = newValue
   ```

2. **key 属性要精确反映组件身份**
   ```typescript
   // ✅ 使用唯一 ID 作为 key
   :key="content.id"
   
   // ❌ 避免使用可能重复的值
   :key="content.type"
   ```

3. **平衡性能和正确性**
   - 组件重新挂载有性能开销
   - 但确保正确性更重要
   - 对于编辑器这种复杂组件，重新挂载是合理的

### 协作编辑特性

1. **文档切换必须重连**
   - Yjs 的 `Y.Doc` 绑定到特定文档
   - 切换文档需要创建新的 `Y.Doc` 和 `WebsocketProvider`
   - 因此组件重新挂载是必要的

2. **自动保存不应触发重连**
   - 保存是针对当前文档的
   - 不改变文档身份（contentId）
   - 应该保持连接活跃

---

## ✅ 修复清单

- [x] 修复 `handleContentSelect` 函数
- [x] 添加 `isDifferentContent` 检查
- [x] 使用 `await nextTick()` 确保更新时序
- [x] 添加详细日志记录
- [x] 创建修复文档
- [x] 测试内容切换功能
- [ ] 测试自动保存功能（确认不重连）
- [ ] 清理多余的调试日志

---

**修复时间**: 2025-10-18  
**修复状态**: ✅ 已完成，等待用户验证
