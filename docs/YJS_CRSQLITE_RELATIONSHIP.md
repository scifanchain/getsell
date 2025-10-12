# Y-ProseMirror 与 CR-SQLite 的关系分析

## 🎯 快速回答

**Y-ProseMirror 和 CR-SQLite 完全不冲突，它们是互补的协作关系！**

```
Y-ProseMirror (Yjs)        +        CR-SQLite
       ↓                                ↓
实时文本协作编辑                    数据库同步
(字符级 CRDT)                    (表/行级 CRDT)
       ↓                                ↓
处理正在编辑的文档                持久化和跨会话同步
(短期,内存)                        (长期,磁盘)
```

---

## 📊 详细对比

### 1. 核心定位

#### Y-ProseMirror (Yjs)
```typescript
类型: 实时协作编辑框架
作用: 让多人同时编辑同一个文档

特点:
✅ 字符级 CRDT (精细粒度)
✅ 毫秒级延迟 (实时感)
✅ 内存中操作 (快速)
✅ 专为文本编辑优化
✅ 支持富文本格式

使用场景:
📝 用户正在打字
📝 多个光标同时移动
📝 实时看到对方的更改
📝 像 Google Docs 的体验
```

#### CR-SQLite
```sql
类型: 数据库同步引擎
作用: 让多设备的数据库保持一致

特点:
✅ 表/行级 CRDT (粗粒度)
✅ 秒级延迟 (可接受)
✅ 磁盘持久化 (可靠)
✅ 专为结构化数据优化
✅ 支持 SQL 查询

使用场景:
💾 保存文档到数据库
💾 同步章节结构
💾 同步元数据 (标题、标签等)
💾 跨会话/跨设备同步
```

---

## 🔄 工作流程分析

### 典型的写作场景

```
场景: 用户 A 和 B 同时编辑第 3 章

┌─────────────────────────────────────────────────────────┐
│                    用户 A 的设备                         │
└─────────────────────────────────────────────────────────┘
                         │
    ┌────────────────────┼────────────────────┐
    ▼                    ▼                    ▼
【UI 层】            【Yjs 层】          【CR-SQLite 层】
ProseMirror         Y.Doc               SQLite 数据库
编辑器              内存中的文档         chapters 表
    │                    │                    │
    │ 用户输入 "Hello"   │                    │
    ├──────────────────>│                    │
    │                    │ 生成 Yjs 操作      │
    │                    │ (insert "Hello")   │
    │                    │                    │
    │                    │ ──WebRTC/WS──>    │
    │                    │  广播给用户 B      │
    │                    │                    │
    │                    │ 5秒后...           │
    │                    │ 自动保存           │
    │                    ├──────────────────>│
    │                    │ UPDATE chapters    │
    │                    │ SET content = ...  │
    │                    │                    │
    │                    │                    │ CR-SQLite 记录变更
    │                    │                    │ (db_version++)
    │                    │                    │
    │                    │                    │ ──P2P──>
    │                    │                    │ 同步到用户 B 的数据库
    │                    │                    │
    │                    │                    │ 10分钟后...
    │                    │                    │ 同步到用户 A 的手机
```

### 关键时间线

```
T = 0ms     用户 A 输入 "H"
            └─> Yjs 捕获操作

T = 50ms    Yjs 通过 WebRTC 发送给用户 B
            └─> 用户 B 看到 "H" (实时)

T = 100ms   用户 B 输入 "i"
            └─> Yjs 捕获,发送给 A

T = 150ms   用户 A 看到 "Hi" (双方同步)

T = 5000ms  自动保存触发
            └─> Yjs 文档序列化为 JSON
            └─> 保存到 SQLite content 表
            └─> CR-SQLite 记录变更

T = 6000ms  CR-SQLite 同步服务检测到变更
            └─> 打包变更集
            └─> 通过 P2P 发送给其他设备

T = 7000ms  用户 A 的手机收到变更
            └─> 应用到本地 SQLite
            └─> 下次打开应用时看到最新内容
```

---

## 🏗️ 架构集成

### 完整的协作架构

```typescript
┌─────────────────────────────────────────────────────────┐
│                      前端 UI 层                          │
│  Vue 3 + ProseMirror Editor                             │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Yjs 实时层    │    │ Service 业务层  │
│  (内存 CRDT)    │    │  (业务逻辑)     │
└────────┬────────┘    └────────┬────────┘
         │                      │
         │ WebRTC/WebSocket     │ IPC 调用
         │ (实时同步)           │
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│ Y-WebRTC        │    │ Repository 层   │
│ Provider        │    │ (数据访问)      │
└─────────────────┘    └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ CR-SQLite 存储层│
                       │ (磁盘 CRDT)     │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ P2P Sync 层     │
                       │ (设备间同步)    │
                       └─────────────────┘
```

### 数据流动

```typescript
// 1. 用户编辑 (实时)
用户输入
  └─> ProseMirror Transaction
      └─> Y-ProseMirror Plugin 拦截
          └─> 转换为 Yjs 操作
              └─> Y-WebRTC 广播
                  └─> 其他用户实时看到

// 2. 自动保存 (定期)
定时器触发 (每 5 秒)
  └─> 序列化 Yjs 文档
      └─> 调用 ContentService.updateContent()
          └─> Repository 执行 SQL UPDATE
              └─> CR-SQLite 记录变更
                  └─> P2P 同步到其他设备

// 3. 加载文档 (打开时)
用户打开章节
  └─> ChapterService.getChapter()
      └─> Repository 查询 SQLite
          └─> 返回 content JSON
              └─> 反序列化为 Yjs 文档
                  └─> 渲染到 ProseMirror
                      └─> 连接到 Y-WebRTC Room
```

---

## 🎭 角色分工

### Yjs 负责的场景

```typescript
// 场景 1: 实时协作编辑
class RealtimeEditing {
  scenarios = {
    // ✅ Yjs 处理
    '多人同时打字': {
      technology: 'Y-ProseMirror',
      latency: '<100ms',
      granularity: '字符级',
      transport: 'WebRTC/WebSocket',
      persistence: '内存 (临时)',
    },
    
    // ✅ Yjs 处理
    '光标位置同步': {
      technology: 'Y-WebRTC Awareness',
      latency: '<50ms',
      data: '光标位置、选区、用户信息',
    },
    
    // ✅ Yjs 处理
    '冲突自动解决': {
      technology: 'Yjs CRDT',
      algorithm: 'YATA (Yet Another Transformation Approach)',
      guarantee: '数学证明的最终一致性',
    },
    
    // ✅ Yjs 处理
    '撤销/重做': {
      technology: 'Y.UndoManager',
      scope: '每个用户独立的撤销栈',
    },
  };
}

// 示例代码
const ydoc = new Y.Doc();
const ytext = ydoc.getText('prosemirror');

// Yjs 自动处理冲突
// 用户 A: 插入 "Hello" 在位置 0
ytext.insert(0, 'Hello');

// 用户 B: 同时插入 "World" 在位置 0
ytext.insert(0, 'World');

// 结果: "WorldHello" 或 "HelloWorld"
// 由 Yjs 的 CRDT 算法自动决定,保证所有用户一致
```

### CR-SQLite 负责的场景

```typescript
// 场景 2: 数据库同步
class DatabaseSync {
  scenarios = {
    // ✅ CR-SQLite 处理
    '跨设备同步': {
      technology: 'CR-SQLite',
      latency: '1-10s',
      granularity: '行级',
      transport: 'P2P (WebRTC Data Channel)',
      persistence: '磁盘 (永久)',
    },
    
    // ✅ CR-SQLite 处理
    '元数据同步': {
      tables: ['works', 'chapters', 'authors'],
      data: '标题、标签、状态、创建时间等',
      conflicts: 'LWW (Last-Write-Wins) per column',
    },
    
    // ✅ CR-SQLite 处理
    '离线编辑': {
      scenario: '用户断网后继续编辑',
      storage: '本地 SQLite',
      sync: '恢复网络后自动同步',
    },
    
    // ✅ CR-SQLite 处理
    '历史版本': {
      table: 'content_versions',
      retention: '保存所有历史版本',
      query: 'SELECT * FROM versions WHERE chapter_id = ?',
    },
  };
}

// 示例代码
// CR-SQLite 处理结构化数据
await db.run(`
  UPDATE chapters 
  SET title = ?, updated_at = ?
  WHERE id = ?
`, ['新标题', Date.now(), chapterId]);

// CR-SQLite 自动记录变更
// 并同步到其他设备的数据库
```

---

## 🔀 交互点分析

### 1. 保存时的协作

```typescript
class SaveOperation {
  async saveChapterContent(chapterId: string, ydoc: Y.Doc) {
    // 1. Yjs → JSON (序列化)
    const contentJson = yDocToProseMirrorJSON(ydoc);
    
    // 2. JSON → SQLite (通过 CR-SQLite)
    await this.contentRepository.update(chapterId, {
      contentJson: JSON.stringify(contentJson),
      updatedAt: Date.now(),
    });
    
    // 3. CR-SQLite 自动同步变更到其他设备
    // (不需要手动代码)
  }
}

// 关键点:
// - Yjs 保持文档在内存中 (快速编辑)
// - 定期保存到 SQLite (持久化)
// - CR-SQLite 负责跨设备同步
```

### 2. 加载时的协作

```typescript
class LoadOperation {
  async loadChapterContent(chapterId: string): Promise<Y.Doc> {
    // 1. SQLite → JSON (通过 CR-SQLite 读取)
    const chapter = await this.contentRepository.findById(chapterId);
    const contentJson = JSON.parse(chapter.contentJson);
    
    // 2. JSON → Yjs (反序列化)
    const ydoc = new Y.Doc();
    const prosemirrorNode = schema.nodeFromJSON(contentJson);
    yDocFromProseMirrorNode(ydoc, prosemirrorNode);
    
    // 3. 连接到实时同步
    const provider = new WebrtcProvider('room-' + chapterId, ydoc);
    
    return ydoc;
  }
}

// 关键点:
// - 从 CR-SQLite 加载最新的持久化版本
// - 转换为 Yjs 文档用于实时编辑
// - 连接到 WebRTC Room 开始实时协作
```

### 3. 冲突处理的协作

```typescript
class ConflictResolution {
  scenario1_实时编辑冲突() {
    // ✅ Yjs 自动处理
    // 用户 A 和 B 同时编辑同一段文字
    // Yjs 的 CRDT 算法自动合并
    // 不需要 CR-SQLite 参与
  }
  
  scenario2_跨设备元数据冲突() {
    // ✅ CR-SQLite 自动处理
    // 设备 1: 修改章节标题为 "新标题 A"
    // 设备 2: 修改章节标题为 "新标题 B"
    // CR-SQLite 使用 LWW (Last-Write-Wins)
    // 不需要 Yjs 参与
  }
  
  scenario3_混合冲突() {
    // 🔄 两者协作
    // 设备 1 (在线): 通过 Yjs 实时编辑内容
    // 设备 2 (离线): 通过本地编辑,保存到 SQLite
    // 
    // 设备 2 恢复在线:
    // 1. CR-SQLite 同步元数据 (标题、状态等)
    // 2. 检测到 content 字段有冲突
    // 3. 保留两个版本到 content_versions 表
    // 4. 提示用户手动合并 (或使用最新的)
  }
}
```

---

## 📋 功能矩阵

| 功能 | Yjs | CR-SQLite | 说明 |
|------|-----|-----------|------|
| **实时文本编辑** | ✅ 主要 | ❌ | Yjs 专长 |
| **光标同步** | ✅ 主要 | ❌ | Y-WebRTC Awareness |
| **字符级冲突解决** | ✅ 主要 | ❌ | YATA 算法 |
| **章节结构同步** | ❌ | ✅ 主要 | 树形结构在 SQLite |
| **元数据同步** | ❌ | ✅ 主要 | 标题、标签、状态等 |
| **跨设备同步** | ⚠️ 辅助 | ✅ 主要 | Yjs 可以但不推荐 |
| **持久化存储** | ⚠️ 需要 | ✅ 主要 | Yjs 需要保存到 DB |
| **历史版本** | ⚠️ 有限 | ✅ 主要 | Yjs 只保留内存中的 |
| **SQL 查询** | ❌ | ✅ 主要 | 统计、搜索等 |
| **离线编辑** | ✅ | ✅ | 两者都支持 |
| **性能 (实时)** | ✅ 毫秒级 | ⚠️ 秒级 | Yjs 更快 |
| **性能 (批量)** | ⚠️ 内存限制 | ✅ 无限制 | SQLite 更适合 |

---

## 💡 最佳实践

### 推荐的数据流

```typescript
class BestPractice {
  // ✅ 正确的方式
  async collaborativeEdit() {
    // 1. 加载章节
    const chapter = await this.loadFromCRSQLite(chapterId);
    
    // 2. 转换为 Yjs 文档
    const ydoc = this.jsonToYDoc(chapter.contentJson);
    
    // 3. 连接实时协作
    const provider = new WebrtcProvider('room-' + chapterId, ydoc);
    
    // 4. 用户编辑 (Yjs 处理实时同步)
    // ... 用户打字,Yjs 自动广播 ...
    
    // 5. 定期保存到 SQLite
    setInterval(() => {
      const json = this.yDocToJson(ydoc);
      this.saveToCRSQLite(chapterId, json);
    }, 5000); // 每 5 秒保存一次
    
    // 6. 断开连接时最后保存
    window.addEventListener('beforeunload', () => {
      const json = this.yDocToJson(ydoc);
      this.saveToCRSQLite(chapterId, json);
      provider.destroy();
    });
  }
  
  // ❌ 错误的方式
  async wrongApproach() {
    // 不要: 每次按键都保存到 SQLite
    prosemirror.on('change', () => {
      this.saveToCRSQLite(chapterId, content); // ❌ 太频繁!
    });
    
    // 不要: 用 Yjs 同步元数据
    const ymeta = ydoc.getMap('metadata');
    ymeta.set('title', '新标题'); // ❌ 应该用 CR-SQLite!
    
    // 不要: 用 CR-SQLite 同步实时编辑
    prosemirror.on('change', () => {
      db.run('UPDATE content SET text = ?', [text]); // ❌ 太慢!
    });
  }
}
```

### 数据边界划分

```typescript
// ✅ Yjs 管理的数据
interface YjsData {
  // 文档内容 (富文本)
  content: Y.XmlFragment; // ProseMirror 文档
  
  // 实时状态 (短期)
  awareness: {
    cursor: { line: number; column: number };
    selection: { from: number; to: number };
    user: { id: string; name: string; color: string };
  };
  
  // 不持久化到数据库!
  // 只在实时会话中存在
}

// ✅ CR-SQLite 管理的数据
interface CRSQLiteData {
  // 作品元数据
  works: {
    id: string;
    title: string;
    author_id: string;
    genre: string;
    status: 'draft' | 'published';
    created_at: bigint;
    updated_at: bigint;
  };
  
  // 章节结构
  chapters: {
    id: string;
    work_id: string;
    title: string;
    order_index: number;
    parent_id?: string; // 树形结构
    created_at: bigint;
  };
  
  // 章节内容 (持久化)
  contents: {
    id: string;
    chapter_id: string;
    content_json: string; // 序列化的 Yjs 文档
    word_count: number;
    updated_at: bigint;
  };
  
  // 历史版本
  content_versions: {
    id: string;
    content_id: string;
    content_json: string;
    version: number;
    created_at: bigint;
  };
}
```

---

## 🔄 完整的生命周期

### 从创建到协作到同步

```typescript
// 第 1 步: 创建新章节
async createChapter(workId: string, title: string) {
  // 1. CR-SQLite: 创建章节记录
  const chapter = await this.chapterRepository.create({
    workId,
    title,
    orderIndex: 0,
  });
  
  // 2. CR-SQLite: 创建空白内容
  const content = await this.contentRepository.create({
    chapterId: chapter.id,
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
  });
  
  // 3. CR-SQLite 自动同步到其他设备
  // (其他设备的章节列表会更新)
  
  return chapter;
}

// 第 2 步: 打开章节编辑
async openChapter(chapterId: string) {
  // 1. CR-SQLite: 加载章节内容
  const content = await this.contentRepository.findByChapterId(chapterId);
  
  // 2. 转换为 Yjs 文档
  const ydoc = new Y.Doc();
  const yXmlFragment = ydoc.getXmlFragment('prosemirror');
  const prosemirrorDoc = schema.nodeFromJSON(JSON.parse(content.contentJson));
  prosemirrorJsonToYXmlFragment(yXmlFragment, prosemirrorDoc);
  
  // 3. Yjs: 连接到实时协作房间
  const provider = new WebrtcProvider(
    `chapter-${chapterId}`,
    ydoc,
    { signaling: ['wss://your-signal-server.com'] }
  );
  
  // 4. Yjs: 监听其他用户
  provider.awareness.on('change', () => {
    const users = Array.from(provider.awareness.getStates().values());
    this.updateUserList(users);
  });
  
  return { ydoc, provider };
}

// 第 3 步: 实时编辑
async editChapter(ydoc: Y.Doc, provider: WebrtcProvider) {
  // Yjs 自动处理:
  // - 用户输入 → Yjs 操作
  // - 广播给其他用户 (WebRTC)
  // - 接收其他用户的操作
  // - 自动合并冲突
  // - 更新编辑器显示
  
  // 不需要手动代码!
}

// 第 4 步: 定期保存
setInterval(async () => {
  // 1. Yjs → JSON
  const yXmlFragment = ydoc.getXmlFragment('prosemirror');
  const prosemirrorDoc = yXmlFragmentToProsemirrorJson(yXmlFragment);
  const contentJson = JSON.stringify(prosemirrorDoc);
  
  // 2. JSON → CR-SQLite
  await this.contentRepository.update(chapterId, {
    contentJson,
    wordCount: countWords(prosemirrorDoc),
    updatedAt: Date.now(),
  });
  
  // 3. CR-SQLite 自动同步到其他设备
}, 5000);

// 第 5 步: 关闭编辑器
async closeChapter(ydoc: Y.Doc, provider: WebrtcProvider) {
  // 1. 最后保存一次
  await this.saveChapter(chapterId, ydoc);
  
  // 2. 断开 Yjs 连接
  provider.destroy();
  
  // 3. 清理资源
  ydoc.destroy();
}

// 第 6 步: 在其他设备打开
async openOnAnotherDevice(chapterId: string) {
  // 1. CR-SQLite 已经同步了最新内容
  // 2. 加载本地 SQLite 数据
  const content = await this.contentRepository.findByChapterId(chapterId);
  
  // 3. 显示最新内容
  // 4. 如果原设备还在线,可以加入实时协作
  const provider = new WebrtcProvider(`chapter-${chapterId}`, ydoc);
}
```

---

## ⚠️ 注意事项

### 1. 避免双重同步

```typescript
// ❌ 错误: 元数据通过两个系统同步
class WrongApproach {
  async updateChapterTitle(chapterId: string, title: string) {
    // 错误 1: 存储在 Yjs
    const ymeta = ydoc.getMap('metadata');
    ymeta.set('title', title);
    
    // 错误 2: 也存储在 SQLite
    await db.run('UPDATE chapters SET title = ?', [title]);
    
    // 问题: 两个系统可能不一致!
  }
}

// ✅ 正确: 元数据只通过 CR-SQLite
class CorrectApproach {
  async updateChapterTitle(chapterId: string, title: string) {
    // 只更新 SQLite
    await this.chapterRepository.update(chapterId, { title });
    
    // CR-SQLite 自动同步到其他设备
    // UI 通过监听数据库变化更新
  }
}
```

### 2. 保存频率权衡

```typescript
class SaveStrategy {
  // ✅ 推荐: 适度的保存频率
  goodFrequency() {
    // 每 5 秒保存一次
    setInterval(() => this.save(), 5000);
    
    // 或者每 N 次修改保存一次
    let changeCount = 0;
    ydoc.on('update', () => {
      changeCount++;
      if (changeCount >= 50) {
        this.save();
        changeCount = 0;
      }
    });
  }
  
  // ❌ 太频繁: 浪费性能
  tooFrequent() {
    ydoc.on('update', () => {
      this.save(); // 每次按键都保存 ❌
    });
  }
  
  // ❌ 太稀疏: 丢失数据风险
  tooRare() {
    // 只在关闭时保存 ❌
    window.addEventListener('beforeunload', () => {
      this.save();
    });
    // 问题: 如果崩溃,丢失所有未保存的内容
  }
}
```

### 3. 离线处理

```typescript
class OfflineHandling {
  scenario1_Yjs离线() {
    // Yjs 的 WebRTC Provider 断开
    provider.on('status', ({ connected }) => {
      if (!connected) {
        // ✅ Yjs 文档仍在内存中
        // ✅ 用户可以继续编辑
        // ✅ 重新连接后自动同步
        console.log('实时协作已断开,但可以继续编辑');
      }
    });
  }
  
  scenario2_CRSQLite离线() {
    // CR-SQLite 的 P2P 连接断开
    // ✅ 本地 SQLite 仍然可用
    // ✅ 可以读写数据库
    // ✅ 重新连接后自动同步
    
    // 示例: 离线创建新章节
    await this.chapterRepository.create({
      title: '离线创建的章节',
      // ...
    });
    // CR-SQLite 会在恢复连接后同步
  }
  
  scenario3_完全离线() {
    // 两个系统都离线
    // ✅ Yjs: 内存中的文档可编辑
    // ✅ CR-SQLite: 本地数据库可读写
    // ✅ 恢复连接后两者都会自动同步
    
    // 用户体验不受影响!
  }
}
```

---

## 🎯 针对您的项目

### 当前架构 (Yjs 已实现)

```typescript
// src/services/YjsCollaborationService.ts
// ✅ 已经有了基于 Yjs 的实时协作

class YjsCollaborationService {
  // 实时文本编辑 ✅
  // 光标同步 ✅
  // 用户 awareness ✅
}
```

### 添加 CR-SQLite 后

```typescript
// src/core/crsqlite-manager.ts (新增)
class CRSQLiteManager {
  // 数据库同步 ✨
  // 跨设备同步 ✨
  // 元数据同步 ✨
}

// src/services/CRSQLiteSyncService.ts (新增)
class CRSQLiteSyncService {
  // 变更检测 ✨
  // P2P 同步 ✨
}
```

### 集成点

```typescript
// src/services/ChapterService.ts (修改)
class ChapterService {
  // 原有方法保持不变
  async getChapter(id: string) {
    // 从 CR-SQLite 加载
    const chapter = await this.chapterRepository.findById(id);
    return chapter;
  }
  
  // 新增: 为实时编辑准备 Yjs 文档
  async getYjsDocument(chapterId: string): Promise<Y.Doc> {
    // 1. 从 CR-SQLite 加载内容
    const content = await this.contentRepository.findByChapterId(chapterId);
    
    // 2. 转换为 Yjs 文档
    const ydoc = new Y.Doc();
    // ... 反序列化逻辑 ...
    
    return ydoc;
  }
  
  // 新增: 保存 Yjs 文档到 CR-SQLite
  async saveYjsDocument(chapterId: string, ydoc: Y.Doc): Promise<void> {
    // 1. 序列化 Yjs 文档
    const contentJson = this.yDocToJson(ydoc);
    
    // 2. 保存到 CR-SQLite
    await this.contentRepository.update(chapterId, {
      contentJson,
      updatedAt: Date.now(),
    });
    
    // 3. CR-SQLite 自动同步到其他设备
  }
}
```

---

## 📊 性能影响分析

### Yjs 性能

```
实时编辑延迟: <100ms
内存占用: ~5MB / 10万字文档
CPU 占用: 低 (只处理编辑操作)
网络带宽: ~1KB/s (正常打字)

✅ 对性能影响极小
```

### CR-SQLite 性能

```
同步延迟: 1-5s
磁盘占用: 数据库大小 + 元数据 (~20% 额外)
CPU 占用: 低 (异步后台同步)
网络带宽: ~10KB/s (定期同步)

✅ 对性能影响可控
```

### 组合后的性能

```
总体:
✅ 实时编辑不受影响 (Yjs 独立工作)
✅ 保存操作异步进行 (不阻塞 UI)
✅ 同步在后台进行 (用户无感知)

预期:
- 内存: +10MB (两个系统)
- CPU: +5% (后台同步)
- 网络: +15KB/s (总带宽)

👍 完全可接受的开销
```

---

## ✅ 最终结论

### 完美互补,零冲突

```
Y-ProseMirror:
✅ 实时协作编辑 (毫秒级)
✅ 字符级 CRDT (精细)
✅ 内存中操作 (快速)
📝 专注于"正在编辑"的体验

CR-SQLite:
✅ 跨设备同步 (秒级)
✅ 行级 CRDT (粗粒度)
✅ 磁盘持久化 (可靠)
💾 专注于"数据管理"的体验

两者配合:
🎯 实时 + 持久
🎯 编辑 + 存储
🎯 短期 + 长期
🎯 体验 + 可靠
```

### 工作流程

```
用户视角:
1. 打开章节 (CR-SQLite 加载)
2. 开始编辑 (Yjs 接管)
3. 实时协作 (Yjs 同步)
4. 自动保存 (CR-SQLite 持久化)
5. 关闭编辑 (Yjs 断开)
6. 其他设备 (CR-SQLite 已同步)

技术视角:
- Yjs: 实时层 (内存)
- CR-SQLite: 持久层 (磁盘)
- 清晰分离,职责明确
```

### 推荐架构

```typescript
┌──────────────────────────────────────┐
│           用户编辑体验                │
│                                      │
│  ┌────────────────────────────┐    │
│  │     Y-ProseMirror          │    │
│  │   (实时协作编辑)            │    │
│  └─────────┬──────────────────┘    │
│            │ 定期保存 (5秒)         │
│            ▼                        │
│  ┌────────────────────────────┐    │
│  │      CR-SQLite             │    │
│  │   (持久化 + 跨设备同步)     │    │
│  └────────────────────────────┘    │
└──────────────────────────────────────┘

✅ 两者协作,用户体验完美
✅ 实时 + 可靠 = 最佳写作体验
```

---

**结论: Y-ProseMirror 和 CR-SQLite 不仅不冲突,而且是完美的搭档!** 🎉

**日期**: 2025-10-12
**状态**: 架构验证通过 ✅
