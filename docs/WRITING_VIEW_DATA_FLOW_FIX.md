# WritingView 数据流修复报告

## 修复时间
2025-01-XX

## 修复目标
修复 WritingView 组件的内容创建和加载逻辑，确保用户能够：
1. 选择章节后自动加载对应内容
2. 在章节无内容时能够创建新内容
3. 正确处理空状态和错误情况

---

## 修复内容

### 1. `loadChapterContent()` 函数增强

**位置**: `src/ui/views/WritingView.vue` 行 487-540

**修复内容**:
- ✅ 添加详细的日志记录，方便调试
- ✅ 正确处理章节无内容的情况（设置 `currentContent.value = null`）
- ✅ 添加用户和章节的有效性检查
- ✅ 区分"章节不存在"和"章节无内容"两种情况

**修复前问题**:
```typescript
// 缺少空状态处理
if (contents.length === 0) {
  console.log('Chapter has no content')
  return  // ❌ 直接 return，未设置状态
}
```

**修复后**:
```typescript
// 正确设置空状态
if (contents.length === 0) {
  console.log('章节暂无内容')
  currentContent.value = null  // ✅ 设置为 null，UI 可以显示空状态
  return
}
```

---

### 2. `createNewContent()` 函数增强

**位置**: `src/ui/views/WritingView.vue` 行 650-698

**修复内容**:
- ✅ 添加用户登录检查
- ✅ 添加章节选择检查
- ✅ 添加作品信息检查
- ✅ 创建正确的空 ProseMirror 文档结构
- ✅ **修正 API 调用签名**（主要问题）
- ✅ 创建成功后重新加载作品数据

**修复前问题**:
```typescript
// ❌ API 调用参数错误
const newContent = await contentApi.create({
  workId: currentWork.value.id,        // ❌ workId 不是必需参数
  chapterId: selectedChapterId.value,
  authorId: currentUser.value.id,      // ❌ authorId 应该是第一个独立参数
  content: emptyProseMirrorDoc,
  format: 'prosemirror',
  title: selectedChapter.value?.title || '新内容'
})
```

**修复后**:
```typescript
// ✅ 正确的 API 调用
const newContent = await contentApi.create(currentUser.value.id, {
  chapterId: selectedChapterId.value,  // ✅ 第二个参数是 contentData 对象
  content: emptyProseMirrorDoc,
  format: 'prosemirror',
  title: selectedChapter.value?.title || '新内容'
})
```

---

## API 签名说明

### `contentApi.create()` 正确签名

**定义位置**: `src/ui/services/api.ts` 行 236-244

```typescript
async create(authorId: string, contentData: {
  chapterId: string;
  content: string;
  format: 'prosemirror' | 'markdown' | 'plain';
  title?: string;
}) {
  return await window.electronAPI.invoke('content:create', authorId, contentData)
}
```

**参数说明**:
- **第一个参数**: `authorId: string` - 作者用户 ID（独立参数）
- **第二个参数**: `contentData: object` - 内容数据对象
  - `chapterId`: 章节 ID（必需）
  - `content`: 内容字符串（必需）
  - `format`: 格式类型（必需）
  - `title`: 标题（可选）

**注意**: `workId` 不需要传递，因为通过 `chapterId` 可以查询到对应的章节和作品关系。

---

## 修复验证

### TypeScript 编译检查
```powershell
# 编译前错误
Line 679: const newContent = await contentApi.create({
Error: 应有 2 个参数，但获得 1 个。

# 修复后
✅ No errors found
```

### 数据流完整性

**完整的内容创建流程**:
```
1. 用户在 ChapterTree 中选择章节
   ↓
2. WritingView 监听 selectedChapterId 变化
   ↓
3. 自动调用 loadChapterContent()
   ↓
4. 查询章节内容列表
   ├─ 有内容 → 加载第一个内容到编辑器
   └─ 无内容 → 显示空状态，提示创建内容
   ↓
5. 用户点击"创建内容"按钮
   ↓
6. 调用 createNewContent()
   ├─ 验证用户、章节、作品信息
   ├─ 创建空 ProseMirror 文档
   ├─ 调用 contentApi.create(userId, contentData)
   └─ 成功后设置 currentContent.value
   ↓
7. EnhancedEditor 组件接收 currentContent
   ↓
8. 用户开始写作，自动保存到数据库
```

---

## 待测试功能

### 1. 基本内容创建流程
- [ ] 创建作品
- [ ] 创建章节
- [ ] 选择章节后自动加载内容
- [ ] 章节无内容时显示空状态
- [ ] 点击"创建内容"按钮成功创建
- [ ] 编辑器正确显示新创建的内容

### 2. 内容编辑和保存
- [ ] 在编辑器中输入文字
- [ ] 自动保存功能正常工作
- [ ] 切换章节时正确保存和加载
- [ ] 刷新页面后内容正确恢复

### 3. 边界情况
- [ ] 未登录用户无法创建内容
- [ ] 未选择章节时无法创建内容
- [ ] 章节已有内容时不显示"创建内容"按钮
- [ ] 网络错误时正确显示错误提示

### 4. 多内容管理
- [ ] 同一章节可以创建多个内容版本
- [ ] 内容列表正确显示
- [ ] 切换内容版本正常工作

---

## 后续优化建议

### 1. 用户体验优化
```typescript
// 添加加载状态
const isLoadingContent = ref(false)

const loadChapterContent = async () => {
  isLoadingContent.value = true
  try {
    // ... 加载逻辑
  } finally {
    isLoadingContent.value = false
  }
}
```

### 2. 错误处理增强
```typescript
// 使用更友好的错误提示
try {
  const newContent = await contentApi.create(...)
} catch (error: any) {
  if (error.code === 'PERMISSION_DENIED') {
    showNotification('您没有权限创建内容', 'error')
  } else if (error.code === 'NETWORK_ERROR') {
    showNotification('网络连接失败，请稍后重试', 'error')
  } else {
    showNotification(`创建失败: ${error.message}`, 'error')
  }
}
```

### 3. 内容自动草稿
```typescript
// 在用户输入时自动创建草稿
watch(() => editorContent.value, debounce(async (newContent) => {
  if (!currentContent.value) {
    // 自动创建草稿内容
    await createNewContent()
  }
}, 3000))
```

---

## 技术细节总结

### ProseMirror 空文档格式
```json
{
  "type": "doc",
  "content": []
}
```

### IPC 调用链
```
contentApi.create(userId, data)
  ↓ window.electronAPI.invoke
  ↓ preload.js contextBridge
  ↓ IPCManager → ContentIPCHandler
  ↓ ContentService.createContent()
  ↓ ContentRepository.create()
  ↓ Prisma Client
  ↓ SQLite Database
```

---

## 结论

✅ **WritingView 数据流修复完成**

主要修复：
1. 正确处理章节无内容的空状态
2. 修正 `contentApi.create()` 的参数调用
3. 添加完整的验证和错误处理
4. 确保数据流的完整性

**下一步**: 进行端到端测试，验证完整的创建→编辑→保存流程。
