# Automerge 完全指南

## 📖 什么是 Automerge？

**Automerge** 是一个用于构建本地优先（Local-First）协作应用的 JavaScript/TypeScript 库，基于 **CRDT（Conflict-free Replicated Data Types，无冲突复制数据类型）** 理论。

### 核心理念

```
传统应用:
客户端 → 中央服务器 → 客户端
      (单一真相源)

Automerge 应用:
客户端 A ←→ 客户端 B ←→ 客户端 C
   ↓           ↓           ↓
本地存储    本地存储    本地存储
      (每个设备都是真相源)
```

---

## 🎯 为什么需要 Automerge？

### 问题：传统同步的困境

```typescript
// 传统方案：乐观锁
async function updateWork(workId: string, newTitle: string) {
  const work = await db.work.findUnique({ where: { id: workId } });
  
  if (work.version !== expectedVersion) {
    throw new Error("版本冲突！"); // 😱 用户需要手动解决
  }
  
  await db.work.update({
    where: { id: workId },
    data: { title: newTitle, version: work.version + 1 }
  });
}

// 问题：
// 1. 需要在线才能保存
// 2. 冲突需要用户介入
// 3. 复杂的冲突解决 UI
// 4. 可能丢失数据
```

### Automerge 的解决方案

```typescript
import * as Automerge from '@automerge/automerge';

// 创建文档
let doc = Automerge.from({
  works: [{
    id: '1',
    title: '我的小说',
    chapters: []
  }]
});

// 用户 A 修改标题
doc = Automerge.change(doc, doc => {
  doc.works[0].title = '修改后的标题';
});

// 用户 B 同时添加章节
doc = Automerge.change(doc, doc => {
  doc.works[0].chapters.push({ id: '2', title: '第一章' });
});

// 神奇的部分：自动合并，无需手动处理冲突！
const merged = Automerge.merge(docA, docB);
// ✅ 标题和章节都保留了
```

---

## 🏗️ Automerge 架构原理

### 1. CRDT 核心概念

```
CRDT = Conflict-free Replicated Data Type
无冲突复制数据类型

核心特性：
✅ 交换律: merge(A, B) = merge(B, A)
✅ 结合律: merge(merge(A, B), C) = merge(A, merge(B, C))
✅ 幂等性: merge(A, A) = A

结果：无论消息以什么顺序到达，最终状态总是一致的！
```

### 2. 操作历史（Operation History）

```typescript
// Automerge 不存储"当前状态"，而是存储"操作历史"
const operations = [
  { op: 'put', path: ['works', 0, 'title'], value: '我的小说', timestamp: 1000, actor: 'user1' },
  { op: 'put', path: ['works', 0, 'title'], value: '修改后的标题', timestamp: 1001, actor: 'user1' },
  { op: 'insert', path: ['works', 0, 'chapters', 0], value: {...}, timestamp: 1002, actor: 'user2' }
];

// 当前状态 = 重放所有操作
// 好处：
// ✅ 可以回溯到任何历史版本
// ✅ 可以撤销/重做
// ✅ 可以查看谁改了什么
```

### 3. 向量时钟（Vector Clocks）

```typescript
// 追踪因果关系
type VectorClock = {
  'user1': 5,  // user1 做了 5 次修改
  'user2': 3,  // user2 做了 3 次修改
  'user3': 1   // user3 做了 1 次修改
};

// 判断因果关系
function happenedBefore(clock1: VectorClock, clock2: VectorClock): boolean {
  // 如果 clock1 的所有计数都 <= clock2，则 clock1 发生在前
  return Object.keys(clock1).every(actor => 
    (clock1[actor] || 0) <= (clock2[actor] || 0)
  );
}

// 应用：
// - 检测并发修改
// - 确定操作顺序
// - 避免重复应用操作
```

### 4. 冲突解决策略

```typescript
// 策略 1：Last-Write-Wins (LWW)
// 适用于：简单字段（标题、描述等）
doc = Automerge.change(doc, doc => {
  doc.work.title = '新标题';  // 自动使用 LWW
});

// 策略 2：Multi-Value Register (MVR)
// 保留所有并发值，由应用层决定
const conflicts = Automerge.getConflicts(doc, ['work', 'title']);
if (conflicts) {
  // conflicts = { 'user1': '标题A', 'user2': '标题B' }
  // 应用可以显示冲突解决 UI
}

// 策略 3：Operational Transform (OT) for Text
// 适用于：文本编辑
doc = Automerge.change(doc, doc => {
  doc.work.content = new Automerge.Text('Hello');
  doc.work.content.insertAt(5, ' World');  // "Hello World"
});

// 策略 4：List CRDT
// 适用于：数组（章节列表等）
doc = Automerge.change(doc, doc => {
  doc.chapters.push({ id: '1', title: '第一章' });
  doc.chapters.insertAt(0, { id: '0', title: '序章' });
});
```

---

## 💻 Automerge API 详解

### 基础操作

```typescript
import * as Automerge from '@automerge/automerge';

// 1. 创建文档
let doc = Automerge.init<WorkState>();

// 2. 从对象创建
let doc = Automerge.from({
  works: [],
  users: []
});

// 3. 修改文档（不可变方式）
doc = Automerge.change(doc, 'Add work', doc => {
  doc.works.push({
    id: ulid(),
    title: '新作品',
    authorId: 'user1'
  });
});

// 4. 获取修改历史
const history = Automerge.getHistory(doc);
// [
//   { change: {...}, snapshot: {...} },
//   { change: {...}, snapshot: {...} }
// ]

// 5. 合并文档
const merged = Automerge.merge(doc1, doc2);
```

### 高级功能

```typescript
// 1. 增量同步（只传输差异）
const changes = Automerge.getChanges(oldDoc, newDoc);
// changes 是二进制数据，可以通过网络发送

// 接收端应用变更
doc = Automerge.applyChanges(doc, changes);

// 2. 同步协议（自动双向同步）
import { initSyncState, generateSyncMessage, receiveSyncMessage } from '@automerge/automerge';

let syncState = initSyncState();
const [newSyncState, message] = generateSyncMessage(doc, syncState);

// 发送 message 给对端
// 接收对端消息
const [newDoc, newSyncState2, patch] = receiveSyncMessage(doc, syncState, incomingMessage);

// 3. 补丁（Patch）机制 - 高效更新 UI
doc = Automerge.change(doc, { patchCallback }, doc => {
  doc.works[0].title = '新标题';
});

function patchCallback(patches) {
  // patches = [
  //   { action: 'put', path: ['works', 0, 'title'], value: '新标题' }
  // ]
  // 只更新变化的部分 UI
  patches.forEach(patch => updateUI(patch));
}

// 4. 分支和合并（类似 Git）
const branch = Automerge.clone(doc);
// 在分支上工作...
const merged = Automerge.merge(doc, branch);

// 5. 压缩历史（节省空间）
const saved = Automerge.save(doc);  // 序列化为 Uint8Array
const loaded = Automerge.load(saved);  // 反序列化
```

### 文本编辑（Automerge.Text）

```typescript
// 创建富文本
doc = Automerge.change(doc, doc => {
  doc.content = new Automerge.Text();
  doc.content.insertAt(0, 'H', 'e', 'l', 'l', 'o');
});

// 插入
doc = Automerge.change(doc, doc => {
  doc.content.insertAt(5, ' ', 'W', 'o', 'r', 'l', 'd');
  // "Hello World"
});

// 删除
doc = Automerge.change(doc, doc => {
  doc.content.deleteAt(5, 6);  // 删除 " World"
  // "Hello"
});

// 获取字符串
const text = doc.content.toString();  // "Hello"

// 并发编辑示例
// 用户 A: 在位置 5 插入 " World"
docA = Automerge.change(docA, doc => {
  doc.content.insertAt(5, ' ', 'W', 'o', 'r', 'l', 'd');
});

// 用户 B: 在位置 0 插入 "Say "
docB = Automerge.change(docB, doc => {
  doc.content.insertAt(0, 'S', 'a', 'y', ' ');
});

// 合并
const merged = Automerge.merge(docA, docB);
merged.content.toString();  // "Say Hello World" ✅
```

---

## 🔌 与您项目的集成方案

### 架构设计

```typescript
// 1. 数据模型定义
interface WorkState {
  works: Work[];
  chapters: Chapter[];
  contents: Content[];
  users: User[];
}

interface Work {
  id: string;
  title: string;
  authorId: string;
  collaborators: string[];
  createdAt: number;
  updatedAt: number;
}

// 2. Automerge 文档管理器
class AutomergeStore {
  private doc: Automerge.Doc<WorkState>;
  private syncStates: Map<string, Automerge.SyncState>;
  
  constructor() {
    this.doc = Automerge.init();
    this.syncStates = new Map();
    this.loadFromDisk();
  }
  
  // 创建作品
  createWork(work: Omit<Work, 'id'>) {
    this.doc = Automerge.change(this.doc, 'Create work', doc => {
      doc.works.push({
        id: ulid(),
        ...work,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });
    
    this.saveToDisk();
    this.broadcastChanges();
  }
  
  // 更新作品
  updateWork(workId: string, updates: Partial<Work>) {
    this.doc = Automerge.change(this.doc, 'Update work', doc => {
      const work = doc.works.find(w => w.id === workId);
      if (work) {
        Object.assign(work, updates);
        work.updatedAt = Date.now();
      }
    });
    
    this.saveToDisk();
    this.broadcastChanges();
  }
  
  // 删除作品（软删除）
  deleteWork(workId: string) {
    this.doc = Automerge.change(this.doc, 'Delete work', doc => {
      const index = doc.works.findIndex(w => w.id === workId);
      if (index !== -1) {
        doc.works[index].deletedAt = Date.now();
      }
    });
  }
  
  // 同步到其他设备
  private broadcastChanges() {
    const changes = Automerge.getLastLocalChange(this.doc);
    if (changes) {
      // 通过 WebSocket/WebRTC 发送
      this.p2pNetwork.broadcast({
        type: 'automerge-change',
        changes: changes
      });
    }
  }
  
  // 接收其他设备的变更
  receiveChanges(changes: Uint8Array) {
    const oldDoc = this.doc;
    this.doc = Automerge.applyChanges(this.doc, [changes]);
    
    // 生成 patch 用于 UI 更新
    const patches = Automerge.diff(oldDoc, this.doc);
    this.notifySubscribers(patches);
    
    this.saveToDisk();
  }
  
  // 持久化到 SQLite
  private async saveToDisk() {
    const binary = Automerge.save(this.doc);
    await fs.writeFile('data/automerge-state.dat', binary);
    
    // 同时保存到 SQLite（用于查询）
    await this.syncToSQLite();
  }
  
  private async syncToSQLite() {
    const { works, chapters, contents } = this.doc;
    
    // 批量更新 SQLite
    await prisma.$transaction([
      ...works.map(work => 
        prisma.work.upsert({
          where: { id: work.id },
          create: work,
          update: work
        })
      )
    ]);
  }
  
  // 从磁盘加载
  private async loadFromDisk() {
    try {
      const binary = await fs.readFile('data/automerge-state.dat');
      this.doc = Automerge.load(binary);
    } catch (error) {
      // 首次启动，从 SQLite 导入
      await this.importFromSQLite();
    }
  }
}
```

### 与 Yjs 的配合

```typescript
// Yjs 负责实时编辑，Automerge 负责元数据
class HybridSyncService {
  private automergeStore: AutomergeStore;
  private yjsProvider: YjsProvider;
  
  // 保存文档内容
  async saveContent(contentId: string, yjsDoc: Y.Doc) {
    // 1. 从 Yjs 提取 ProseMirror JSON
    const prosemirrorJSON = yjsDoc.getXmlFragment('prosemirror').toJSON();
    
    // 2. 保存到 Automerge（用于跨设备同步）
    this.automergeStore.updateContent(contentId, {
      prosemirrorJson: prosemirrorJSON,
      updatedAt: Date.now()
    });
    
    // 3. 保存到 SQLite（用于本地查询）
    await prisma.content.update({
      where: { id: contentId },
      data: { prosemirrorJson: prosemirrorJSON }
    });
  }
  
  // 加载文档内容
  async loadContent(contentId: string): Promise<Y.Doc> {
    // 从 Automerge 加载最新版本
    const content = this.automergeStore.getContent(contentId);
    
    // 创建 Yjs 文档
    const yjsDoc = new Y.Doc();
    const fragment = yjsDoc.getXmlFragment('prosemirror');
    
    // 导入 ProseMirror JSON
    if (content.prosemirrorJson) {
      fragment.insert(0, [Y.XmlElement.fromJSON(content.prosemirrorJson)]);
    }
    
    return yjsDoc;
  }
}
```

---

## 📊 性能与优化

### 1. 文档大小管理

```typescript
// 问题：Automerge 会记录所有历史，文档会变大
const docSize = Automerge.save(doc).length;
console.log(`文档大小: ${docSize / 1024}KB`);

// 解决方案 1：定期压缩
if (docSize > 10 * 1024 * 1024) {  // 超过 10MB
  const compacted = Automerge.clone(doc);  // 创建快照
  doc = compacted;
}

// 解决方案 2：分片存储
// 每个作品一个 Automerge 文档，而不是全局一个
class ShardedStore {
  private docs: Map<string, Automerge.Doc<Work>>;
  
  getWorkDoc(workId: string) {
    if (!this.docs.has(workId)) {
      this.docs.set(workId, this.loadWorkDoc(workId));
    }
    return this.docs.get(workId);
  }
}
```

### 2. 增量同步优化

```typescript
// 只同步变更，不同步整个文档
class EfficientSync {
  private lastSyncHeads: Map<string, Automerge.Heads>;
  
  getChangesToSync(peerId: string, doc: Automerge.Doc): Uint8Array[] {
    const lastHeads = this.lastSyncHeads.get(peerId) || [];
    const changes = Automerge.getChanges(lastHeads, doc);
    
    this.lastSyncHeads.set(peerId, Automerge.getHeads(doc));
    
    return changes;
  }
}
```

### 3. 内存优化

```typescript
// 使用 Automerge-WASM（性能提升 10 倍）
import * as Automerge from '@automerge/automerge/next';  // WASM 版本

// 按需加载文档
class LazyLoadStore {
  private activeDoc: Automerge.Doc | null = null;
  
  async getDoc(): Promise<Automerge.Doc> {
    if (!this.activeDoc) {
      const binary = await fs.readFile('data/doc.dat');
      this.activeDoc = Automerge.load(binary);
    }
    return this.activeDoc;
  }
  
  async unload() {
    if (this.activeDoc) {
      const binary = Automerge.save(this.activeDoc);
      await fs.writeFile('data/doc.dat', binary);
      this.activeDoc = null;
    }
  }
}
```

---

## 🆚 Automerge vs 其他方案

### Automerge vs Yjs

| 特性 | Automerge | Yjs |
|------|-----------|-----|
| **主要用途** | 通用数据结构 | 富文本编辑 |
| **性能** | 中等 | 非常高 |
| **文档大小** | 较大（保留历史） | 较小（增量） |
| **冲突解决** | 多种策略 | OT/CRDT混合 |
| **API 复杂度** | 简单 | 中等 |
| **历史记录** | ✅ 完整 | ⚠️ 有限 |
| **时间旅行** | ✅ 支持 | ❌ 不支持 |
| **适合场景** | 元数据、结构化数据 | 文档内容编辑 |

**建议**：两者结合使用
- **Yjs**: 处理文档内容的实时编辑
- **Automerge**: 处理作品结构、章节、用户权限等元数据

### Automerge vs ElectricSQL

| 特性 | Automerge | ElectricSQL |
|------|-----------|-------------|
| **架构** | 纯客户端 | 客户端+服务器 |
| **数据库** | 任意 | PostgreSQL/SQLite |
| **查询能力** | 编程式 | SQL |
| **部署复杂度** | 低 | 中 |
| **扩展性** | 中 | 高 |
| **离线能力** | ✅ 完全 | ✅ 完全 |

---

## 🚀 实施路线图

### Phase 1: 原型验证（1周）

```typescript
// 1. 安装依赖
npm install @automerge/automerge

// 2. 简单测试
import * as Automerge from '@automerge/automerge';

let doc = Automerge.from({ works: [] });
doc = Automerge.change(doc, doc => {
  doc.works.push({ id: '1', title: 'Test' });
});

console.log(doc.works);  // [{ id: '1', title: 'Test' }]

// 3. 模拟多设备同步
const doc1 = Automerge.change(doc, d => d.works[0].title = 'Title A');
const doc2 = Automerge.change(doc, d => d.works.push({ id: '2', title: 'Title B' }));
const merged = Automerge.merge(doc1, doc2);
console.log(merged.works);  // 两个修改都在！
```

### Phase 2: 集成到项目（2周）

1. 创建 `AutomergeService.ts`
2. 实现基础 CRUD 操作
3. 集成 WebSocket 同步
4. 持久化到 SQLite

### Phase 3: 生产化（2周）

1. 性能优化
2. 错误处理
3. 冲突解决 UI
4. 文档压缩策略

---

## 📚 学习资源

### 官方资源
- [Automerge 官网](https://automerge.org/)
- [GitHub 仓库](https://github.com/automerge/automerge)
- [API 文档](https://automerge.org/docs/api/)

### 推荐阅读
1. **论文**: "Automerge: A JSON-like data structure for concurrent multi-user editing"
2. **文章**: "Local-First Software" (Ink & Switch)
3. **视频**: Martin Kleppmann 的 CRDT 系列演讲

### 示例项目
- [Automerge ToDo](https://github.com/automerge/automerge-repo-demo-todo)
- [Pixelpusher](https://github.com/automerge/pixelpusher) - 协作画板
- [Trellis](https://github.com/automerge/trellis) - 类 Trello 应用

---

## 🎓 核心要点总结

1. **Automerge = 数据结构 + 时间旅行 + 自动同步**
2. **基于 CRDT，数学保证最终一致性**
3. **适合结构化数据（元数据、配置、权限）**
4. **与 Yjs 配合：Automerge 管元数据，Yjs 管内容**
5. **离线优先，网络分区安全**
6. **API 简单，TypeScript 友好**

对于您的写作软件：
- ✅ 作品列表 → Automerge
- ✅ 章节结构 → Automerge
- ✅ 用户权限 → Automerge
- ✅ 文档内容 → Yjs（已有）
- ✅ 实时协作 → Yjs（已有）

这是一个**优雅且可靠**的架构！
