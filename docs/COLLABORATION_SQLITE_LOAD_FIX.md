# 协作模式读取 SQLite 数据问题修复

> **严重问题**: 协作模式下无法读取 SQLite 数据库中的内容  
> **日期**: 2025-10-18

---

## 🐛 问题现象

用户反馈：
- ❌ 协作模式下，编辑器显示空白
- ❌ SQLite 数据库中有数据，但无法显示
- ❌ 只有 Yjs 服务器中有数据时才能显示

**根本原因**：协作模式下，Editor 组件创建 Yjs 文档时，**没有加载 SQLite 中的初始内容**。

---

## 🔍 问题分析

### 代码追踪

#### 问题代码（修复前）

**`src/ui/components/Editor.vue`, initCollaboration 函数**:

```typescript
const initCollaboration = async () => {
  // ...
  
  ydoc = new Y.Doc()  // ❌ 创建空的 Yjs 文档
  
  // 连接到 WebSocket 服务器
  provider = new WebsocketProvider(
    websocketUrl,
    `content-${props.contentId}`,
    ydoc  // ❌ 空文档被同步到服务器
  )
  
  // ...
}
```

**问题流程**：

```
1. 用户打开协作模式内容
   ↓
2. Editor 组件接收 props.modelValue (来自 SQLite)
   ↓
3. initCollaboration() 创建空的 Y.Doc()  ← ❌ 忽略了 modelValue!
   ↓
4. 连接到 Yjs 服务器
   ↓
5. 如果服务器也是空的 → 编辑器显示空白
   ↓
6. 如果服务器有数据 → 从服务器加载数据（覆盖 SQLite）
```

### 为什么私有模式正常？

**私有模式代码** (`createStandardState` 函数):

```typescript
const createStandardState = () => {
  // ...
  
  let doc: ProseMirrorNode
  
  // ✅ 尝试从 props.modelValue 加载初始内容
  if (props.modelValue && props.modelValue.trim()) {
    try {
      const jsonContent = JSON.parse(props.modelValue)
      doc = ProseMirrorNode.fromJSON(schema, jsonContent)
      console.log('✅ 从 modelValue 加载初始内容成功')
    } catch (error) {
      // 创建空文档
    }
  }
  
  return EditorState.create({
    schema,
    doc,  // ✅ 使用加载的内容
    plugins
  })
}
```

**对比**：
- 私有模式：✅ 从 `props.modelValue` 加载内容
- 协作模式：❌ 忽略 `props.modelValue`，创建空 `Y.Doc()`

---

## 🔧 解决方案

### 修复思路

在创建 Yjs 文档后、连接服务器前，将 SQLite 中的内容加载到 Yjs 文档中。

### 核心代码

**1. 导入工具函数**:

```typescript
import { 
  ySyncPlugin, 
  yCursorPlugin, 
  yUndoPlugin, 
  undo as yUndo, 
  redo as yRedo,
  prosemirrorJSONToYXmlFragment  // ✅ 新增：转换工具
} from 'y-prosemirror'
```

**2. 修改 initCollaboration 函数**:

```typescript
const initCollaboration = async () => {
  // ...
  
  ydoc = new Y.Doc()
  
  // ✅ 关键修复：加载 SQLite 内容到 Yjs 文档
  if (props.modelValue && props.modelValue.trim()) {
    console.log('📥 从 SQLite 加载初始内容到 Yjs 文档', {
      contentLength: props.modelValue.length,
      preview: props.modelValue.substring(0, 100)
    })
    
    try {
      // 解析 JSON 内容
      const jsonContent = JSON.parse(props.modelValue)
      
      // 获取 Yjs XML Fragment
      const yXmlFragment = ydoc.getXmlFragment('prosemirror')
      
      // 使用 y-prosemirror 提供的工具函数转换并加载
      prosemirrorJSONToYXmlFragment(schema, jsonContent, yXmlFragment)
      
      console.log('✅ 初始内容已加载到 Yjs 文档')
    } catch (error) {
      console.error('❌ 加载初始内容失败:', error)
    }
  } else {
    console.log('ℹ️ 没有初始内容，创建空 Yjs 文档')
  }
  
  // 然后再连接到服务器
  provider = new WebsocketProvider(...)
  
  // ...
}
```

### prosemirrorJSONToYXmlFragment 函数说明

这是 `y-prosemirror` 库提供的官方工具函数：

**功能**：
- 将 ProseMirror JSON 格式的文档转换为 Yjs 的 XmlFragment
- 自动处理节点类型、属性、标记等
- 保持文档结构完整性

**签名**：
```typescript
function prosemirrorJSONToYXmlFragment(
  schema: Schema,
  json: any,
  xmlFragment: Y.XmlFragment
): void
```

**参数**：
- `schema`: ProseMirror schema 定义
- `json`: ProseMirror 文档的 JSON 表示
- `xmlFragment`: 目标 Yjs XML Fragment（会被填充）

---

## ✅ 修复后的工作流程

### 首次加载（SQLite 有数据，Yjs 服务器无数据）

```
1. 用户打开协作模式内容
   ↓
2. WritingView 从 SQLite 加载内容
   ↓
3. Editor 组件接收 props.modelValue
   ↓
4. initCollaboration() 执行：
   a. 创建 Y.Doc()
   b. ✅ 从 modelValue 加载内容到 Y.Doc
   c. 连接到 Yjs 服务器
   d. ✅ 将本地内容同步到服务器
   ↓
5. 编辑器显示 SQLite 中的内容 ✅
   ↓
6. 其他用户连接时也能看到这些内容 ✅
```

### 协作编辑（多用户同时在线）

```
用户A 编辑
   ↓
Yjs 实时同步 → 用户B 立即看到
   ↓
30秒自动保存 → SQLite 数据库（持久化）
```

### 服务器重启恢复

```
1. Yjs 服务器重启（内存清空）
   ↓
2. 用户刷新页面
   ↓
3. 从 SQLite 加载内容 ✅
   ↓
4. 加载到 Yjs 文档 ✅
   ↓
5. 同步到服务器 ✅
   ↓
6. 服务器恢复内容 ✅
```

---

## 🧪 测试验证

### 测试场景 1：SQLite 有数据，服务器无数据

**步骤**：
1. 停止 Yjs 服务器
2. 在私有模式下创建内容并保存
3. 切换到协作模式
4. 启动 Yjs 服务器
5. 刷新页面

**预期结果**：
- ✅ 编辑器显示 SQLite 中的内容
- ✅ 控制台显示：`📥 从 SQLite 加载初始内容到 Yjs 文档`
- ✅ 控制台显示：`✅ 初始内容已加载到 Yjs 文档`

### 测试场景 2：服务器重启恢复

**步骤**：
1. 启动 Yjs 服务器
2. 在协作模式下编辑内容
3. 等待30秒自动保存
4. 停止 Yjs 服务器
5. 重启 Yjs 服务器
6. 刷新页面

**预期结果**：
- ✅ 编辑器显示之前编辑的内容
- ✅ 内容从 SQLite 加载
- ✅ 同步到服务器

### 测试场景 3：多用户协作

**步骤**：
1. 用户A 打开协作内容（从 SQLite 加载）
2. 用户B 打开同一内容

**预期结果**：
- ✅ 用户B 看到用户A 加载的内容
- ✅ 双方编辑实时同步
- ✅ 30秒后保存到各自的 SQLite

---

## 📊 完整的数据流

```
┌─────────────────────────────────────────────────────┐
│                  协作模式数据流                      │
└─────────────────────────────────────────────────────┘

初始化阶段：
SQLite 数据库
    ↓ (加载)
props.modelValue
    ↓ (转换)
ProseMirror JSON
    ↓ (prosemirrorJSONToYXmlFragment)
Y.XmlFragment
    ↓ (同步)
Yjs 服务器

编辑阶段：
用户编辑 → Yjs 本地 → Yjs 服务器 → 其他用户

保存阶段（每30秒）：
Yjs 本地
    ↓ (getContent)
ProseMirror JSON
    ↓ (stringify)
JSON 字符串
    ↓ (contentService.updateContent)
SQLite 数据库
```

---

## 🔑 关键点总结

1. **加载顺序很重要**：
   - ✅ 先加载 SQLite 内容到 Yjs
   - ✅ 再连接到服务器
   - ❌ 如果先连接，服务器的空状态会覆盖本地

2. **使用官方工具函数**：
   - ✅ `prosemirrorJSONToYXmlFragment` 是官方推荐
   - ✅ 自动处理复杂的转换逻辑
   - ✅ 保证数据完整性

3. **双向同步机制**：
   - 加载：SQLite → Yjs
   - 保存：Yjs → SQLite
   - 协作：Yjs ↔ Yjs 服务器 ↔ 其他用户

4. **错误处理**：
   - 如果 modelValue 解析失败 → 创建空文档
   - 不会阻止协作功能正常工作

---

## ✅ 修复清单

- [x] 导入 `prosemirrorJSONToYXmlFragment` 工具函数
- [x] 在 `initCollaboration` 中加载 SQLite 内容
- [x] 添加详细日志
- [x] 创建修复文档
- [ ] 测试场景 1：SQLite → Yjs
- [ ] 测试场景 2：服务器重启恢复
- [ ] 测试场景 3：多用户协作
- [ ] 验证自动保存功能
- [ ] 性能测试（大文档）

---

**修复时间**: 2025-10-18  
**修复状态**: ✅ 代码已修复，等待测试验证  
**严重级别**: 🔴 高危（数据无法读取）
