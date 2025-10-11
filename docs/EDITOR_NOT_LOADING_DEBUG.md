# 编辑器未加载问题 - 调试报告

## 问题时间
2025-10-11

## 问题描述

用户报告：
> "现在新创建内容和点击内容标题，都没有加载编辑器。"

### 症状
1. 在 ChapterTree 中点击内容标题
2. 或者创建新内容后
3. 编辑器区域没有显示

---

## 问题排查

### 编辑器显示的条件

**WritingView.vue 模板中的条件**:
```vue
<div v-if="selectedChapterId && currentContent" class="editor-wrapper">
  <EnhancedEditor
    :content-id="currentContent.id"
    :user-id="currentUser?.id || ''"
    :chapter-id="selectedChapterId"
    :initial-content="currentContent.content"
    :initial-title="currentContent.title"
    ...
  />
</div>
```

**必须满足的条件**:
1. ✅ `selectedChapterId` 必须有值
2. ✅ `currentContent` 必须有值
3. ✅ `currentContent.id` 必须存在
4. ✅ `currentContent.content` 必须存在（可以是空字符串）
5. ✅ `currentContent.title` 必须存在（可以是空字符串）

---

## 可能的原因

### 原因 1: API 返回的数据格式不对

**数据库字段名**:
```prisma
model Content {
  contentJson  String?  @map("content_json")  // ProseMirror JSON
}
```

**Service 层映射**:
```typescript
// ContentService.ts - mapToContentInfo()
return {
  id: content.id,
  chapterId: content.chapterId,
  title: content.title,
  content: contentText,  // ← 从 contentJson 映射过来
  format: content.type || 'prosemirror',
  ...
};
```

**可能的问题**:
- API 返回的对象可能缺少 `content` 字段
- 或者 `content` 是 `null`/`undefined`
- 或者 `chapterId` 为空

### 原因 2: 响应式更新问题

**可能的情况**:
- `currentContent.value = response` 执行了
- 但 Vue 的响应式系统没有触发更新
- 或者更新时机有问题

### 原因 3: selectedChapterId 未设置

**可能的情况**:
- 创建内容时没有正确设置 `selectedChapterId`
- 或者 `data.chapterId` 为 `undefined`

---

## 调试方案

### 已添加的调试日志

#### 在 `handleContentSelect` 中:
```typescript
console.log('🔍 用户选择内容:', contentId)
console.log('📦 从 API 获取的完整内容对象:', content)
console.log('📦 内容字段检查:', {
  hasId: !!content.id,
  hasTitle: !!content.title,
  hasContent: !!content.content,
  hasChapterId: !!content.chapterId,
  contentType: typeof content.content,
  contentLength: content.content?.length || 0
})
console.log('✅ 已设置 currentContent.value')
console.log('📊 当前状态检查:', {
  selectedChapterId: selectedChapterId.value,
  hasCurrentContent: !!currentContent.value,
  currentContentId: currentContent.value?.id,
  shouldShowEditor: !!(selectedChapterId.value && currentContent.value)
})
```

#### 在 `handleAddContent` 中:
```typescript
console.log('📦 创建返回的完整对象:', response)
console.log('📦 返回对象字段检查:', {
  hasId: !!response.id,
  hasTitle: !!response.title,
  hasContent: !!response.content,
  hasChapterId: !!response.chapterId,
  allKeys: Object.keys(response)
})
console.log('✅ 已设置 currentContent.value')
console.log('📊 当前状态检查:', {
  selectedChapterId: selectedChapterId.value,
  hasCurrentContent: !!currentContent.value,
  currentContentId: currentContent.value?.id,
  shouldShowEditor: !!(selectedChapterId.value && currentContent.value)
})
```

---

## 调试步骤

### 步骤 1: 测试点击内容

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 在 ChapterTree 中点击一个内容
4. 查看控制台输出

**预期日志**:
```
🔍 用户选择内容: content_xxx
📦 从 API 获取的完整内容对象: { id: "...", title: "...", content: "...", ... }
📦 内容字段检查: { hasId: true, hasTitle: true, hasContent: true, ... }
✅ 已设置 currentContent.value
📊 当前状态检查: { 
  selectedChapterId: "chapter_xxx",
  hasCurrentContent: true,
  currentContentId: "content_xxx",
  shouldShowEditor: true  ← 这个应该是 true
}
```

### 步骤 2: 测试创建内容

1. 点击 ChapterTree 中章节的 "📄 添加内容" 按钮
2. 输入标题，点击创建
3. 查看控制台输出

**预期日志**:
```
WritingView: handleAddContent 被调用 { title: "新内容", chapterId: "chapter_xxx", ... }
准备创建内容: { userId: "...", workId: "...", chapterId: "...", title: "新内容" }
内容创建成功: { id: "...", ... }
📦 创建返回的完整对象: { ... }
📦 返回对象字段检查: { hasId: true, hasTitle: true, hasContent: true, ... }
✅ 已设置 currentContent.value
📊 当前状态检查: { shouldShowEditor: true }
```

---

## 可能的问题和解决方案

### 问题 1: API 返回的对象缺少 `content` 字段

**检查方法**:
看日志中 `allKeys` 或完整对象输出

**解决方案**:
如果 API 返回的字段名是 `contentJson` 而不是 `content`，需要在 WritingView 中做映射：

```typescript
// 方案 A: 在设置前映射
const content = await contentApi.get(contentId, currentUser.value.id)
currentContent.value = {
  ...content,
  content: content.content || content.contentJson || ''
}

// 方案 B: 修改模板
:initial-content="currentContent.content || currentContent.contentJson"
```

### 问题 2: `shouldShowEditor` 为 `false`

**可能原因**:
- `selectedChapterId` 为空
- `currentContent` 为空
- 其中一个是 `null` 或 `undefined`

**解决方案**:
检查日志中的状态，根据具体情况修复：
- 如果 `selectedChapterId` 为空，确保在设置 `currentContent` 前先设置 `selectedChapterId`
- 如果 `currentContent` 为空，检查 API 调用是否成功

### 问题 3: 响应式更新延迟

**可能原因**:
Vue 的响应式更新有时候需要一个事件循环

**解决方案**:
```typescript
// 使用 nextTick 确保 DOM 更新
import { nextTick } from 'vue'

currentContent.value = response
await nextTick()
console.log('DOM 应该已经更新')
```

---

## 下一步操作

### 立即执行
1. ✅ 打开浏览器控制台
2. ✅ 测试点击内容
3. ✅ 查看日志输出
4. ✅ 截图或复制日志内容
5. ✅ 根据日志分析问题

### 根据日志结果

#### 如果 `shouldShowEditor: true` 但编辑器仍未显示
→ 问题在 EnhancedEditor 组件内部或模板渲染

#### 如果 `shouldShowEditor: false`
→ 检查哪个条件不满足（`selectedChapterId` 或 `currentContent`）

#### 如果 `hasContent: false`
→ API 返回的数据格式问题，需要修改映射逻辑

#### 如果根本没有日志输出
→ 事件没有触发，检查 ChapterTree 的事件绑定

---

## 临时解决方案

如果需要快速修复，可以先强制显示编辑器：

```vue
<!-- 临时方案：去掉 selectedChapterId 条件 -->
<div v-if="currentContent" class="editor-wrapper">
  <EnhancedEditor
    :content-id="currentContent.id"
    :user-id="currentUser?.id || ''"
    :chapter-id="currentContent.chapterId || ''"
    :initial-content="currentContent.content || ''"
    :initial-title="currentContent.title || ''"
    ...
  />
</div>
```

---

## 检查清单

### API 层面
- [ ] contentApi.get() 是否成功返回数据？
- [ ] 返回的数据是否包含所有必需字段？
- [ ] `content` 字段是否存在且有值？

### 状态层面
- [ ] `currentContent.value` 是否正确设置？
- [ ] `selectedChapterId.value` 是否有值？
- [ ] 响应式更新是否触发？

### 模板层面
- [ ] `v-if` 条件是否满足？
- [ ] EnhancedEditor 的 props 是否都有值？
- [ ] 是否有其他 CSS 隐藏了编辑器？

### 组件层面
- [ ] EnhancedEditor 是否正确接收 props？
- [ ] EnhancedEditor 的 watch 是否触发？
- [ ] ProseMirrorEditor 是否正确初始化？

---

## 总结

已添加详细的调试日志来追踪问题。请：

1. **打开浏览器控制台**
2. **执行操作**（点击内容或创建内容）
3. **复制控制台的所有日志**
4. **提供日志内容**

根据日志输出，我们可以准确定位问题所在。

**特别关注**:
- `📦 从 API 获取的完整内容对象` - 看返回的数据结构
- `📦 内容字段检查` - 看哪些字段是 `false`
- `📊 当前状态检查` 中的 `shouldShowEditor` - 这个必须是 `true`

有了这些信息，就能快速找到并修复问题！
