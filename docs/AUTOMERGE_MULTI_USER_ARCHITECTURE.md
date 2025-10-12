# Automerge 多用户同步架构方案

## ⚠️ 重要澄清

### 您的理解 vs 实际情况

```
❌ 误解：数百个用户的 SQLite 数据库全部互相同步
┌─────────┐   ┌─────────┐   ┌─────────┐
│ 用户 A  │ ↔ │ 用户 B  │ ↔ │ 用户 C  │ ← 所有人的数据混在一起
│ SQLite  │   │ SQLite  │   │ SQLite  │
└─────────┘   └─────────┘   └─────────┘

✅ 实际：每个用户只同步自己参与的作品
┌─────────────────────────────────────┐
│ 用户 A                              │
│ ├── 我的作品 1 (只有 A)             │
│ ├── 协作作品 1 (A, B, C 同步)      │
│ └── 协作作品 2 (A, D 同步)         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 用户 B                              │
│ ├── 我的作品 2 (只有 B)             │
│ ├── 协作作品 1 (A, B, C 同步)      │ ← 只同步参与的作品
│ └── 我的作品 3 (只有 B)             │
└─────────────────────────────────────┘
```

---

## 🏗️ 正确的架构设计

### 核心原则：按作品分片同步

```typescript
// ===== 错误的做法 =====
❌ 全局一个 Automerge 文档，所有用户共享
let globalDoc = Automerge.from({
  users: [...全部用户],      // ← 隐私泄露！
  works: [...所有作品],      // ← 性能灾难！
  chapters: [...全部章节]    // ← 不可能扩展！
});

// ===== 正确的做法 =====
✅ 每个作品一个独立的 Automerge 文档
class WorkSyncService {
  private workDocs: Map<string, Automerge.Doc<Work>>;
  
  // 每个作品是独立的同步单元
  getWorkDoc(workId: string): Automerge.Doc<Work> {
    if (!this.workDocs.has(workId)) {
      this.workDocs.set(workId, this.loadOrCreateWorkDoc(workId));
    }
    return this.workDocs.get(workId);
  }
  
  // 只同步用户有权限的作品
  async syncWork(workId: string, collaborators: string[]) {
    const doc = this.getWorkDoc(workId);
    
    // 只向协作者广播变更
    const changes = Automerge.getLastLocalChange(doc);
    await this.p2pNetwork.sendToUsers(collaborators, {
      type: 'work-sync',
      workId,
      changes
    });
  }
}
```

---

## 📊 数据隔离与权限模型

### 架构层级

```
层级 1: 用户账户（完全隔离）
├── 用户 A
│   ├── 个人设置 (只存在于 A 的设备)
│   ├── 我的作品列表 (只存在于 A 的设备)
│   └── 参与的协作作品 (与协作者同步)
│
├── 用户 B
│   ├── 个人设置 (只存在于 B 的设备)
│   ├── 我的作品列表 (只存在于 B 的设备)
│   └── 参与的协作作品 (与协作者同步)

层级 2: 作品（按权限同步）
├── 作品 1 (私有)
│   └── 只在作者的所有设备间同步
│
├── 作品 2 (协作: A, B, C)
│   └── 在 A, B, C 的设备间同步
│
└── 作品 3 (协作: A, D)
    └── 在 A, D 的设备间同步

层级 3: 设备（同一用户的多设备）
用户 A 的设备 1 ←→ 用户 A 的设备 2
  └── 同步 A 的所有数据
```

### 数据模型

```typescript
// ===== 用户本地数据（不同步给其他用户） =====
interface UserLocalData {
  userId: string;
  settings: {
    theme: 'light' | 'dark';
    fontSize: number;
    // ... 个人设置
  };
  myWorks: string[];  // 我创建的作品 ID 列表
  sharedWorks: string[];  // 我参与的协作作品 ID 列表
}

// ===== 作品数据（同步给协作者） =====
interface WorkData {
  id: string;
  title: string;
  authorId: string;  // 作者
  collaborators: string[];  // 协作者列表
  chapters: Chapter[];
  permissions: {
    [userId: string]: 'owner' | 'editor' | 'viewer'
  };
  createdAt: number;
  updatedAt: number;
}

// ===== 实现 =====
class UserDataService {
  // 每个用户一个 Automerge 文档（存储个人数据）
  private userDoc: Automerge.Doc<UserLocalData>;
  
  // 每个作品一个 Automerge 文档
  private workDocs: Map<string, Automerge.Doc<WorkData>>;
  
  constructor(userId: string) {
    this.userId = userId;
    this.loadUserData();
  }
  
  // 加载用户的本地数据
  async loadUserData() {
    const saved = await fs.readFile(`data/${this.userId}/user.automerge`);
    this.userDoc = Automerge.load(saved);
    
    // 加载用户有权限的所有作品
    const workIds = [
      ...this.userDoc.myWorks,
      ...this.userDoc.sharedWorks
    ];
    
    for (const workId of workIds) {
      await this.loadWork(workId);
    }
  }
  
  // 加载单个作品
  async loadWork(workId: string) {
    try {
      const saved = await fs.readFile(`data/${this.userId}/works/${workId}.automerge`);
      this.workDocs.set(workId, Automerge.load(saved));
    } catch (error) {
      // 首次访问协作作品，从协作者同步
      await this.syncWorkFromPeers(workId);
    }
  }
  
  // 创建新作品
  createWork(title: string): string {
    const workId = ulid();
    
    // 1. 创建作品文档
    const workDoc = Automerge.from<WorkData>({
      id: workId,
      title,
      authorId: this.userId,
      collaborators: [],
      chapters: [],
      permissions: {
        [this.userId]: 'owner'
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    this.workDocs.set(workId, workDoc);
    
    // 2. 添加到用户的作品列表
    this.userDoc = Automerge.change(this.userDoc, doc => {
      doc.myWorks.push(workId);
    });
    
    // 3. 保存到本地
    this.saveWork(workId);
    this.saveUserData();
    
    return workId;
  }
  
  // 添加协作者
  async addCollaborator(workId: string, collaboratorId: string) {
    let workDoc = this.workDocs.get(workId);
    
    // 1. 更新作品文档
    workDoc = Automerge.change(workDoc, doc => {
      doc.collaborators.push(collaboratorId);
      doc.permissions[collaboratorId] = 'editor';
      doc.updatedAt = Date.now();
    });
    
    this.workDocs.set(workId, workDoc);
    
    // 2. 保存到本地
    await this.saveWork(workId);
    
    // 3. 发送整个作品文档给新协作者
    const workState = Automerge.save(workDoc);
    await this.p2pNetwork.sendToUser(collaboratorId, {
      type: 'work-invitation',
      workId,
      workState
    });
    
    // 4. 通知其他现有协作者
    const changes = Automerge.getLastLocalChange(workDoc);
    await this.syncWorkChanges(workId, changes);
  }
  
  // 接收作品邀请
  async acceptWorkInvitation(workId: string, workState: Uint8Array) {
    // 1. 加载作品文档
    const workDoc = Automerge.load<WorkData>(workState);
    this.workDocs.set(workId, workDoc);
    
    // 2. 添加到用户的协作作品列表
    this.userDoc = Automerge.change(this.userDoc, doc => {
      doc.sharedWorks.push(workId);
    });
    
    // 3. 保存
    await this.saveWork(workId);
    await this.saveUserData();
  }
  
  // 同步作品变更
  async syncWorkChanges(workId: string, changes: Uint8Array) {
    const workDoc = this.workDocs.get(workId);
    if (!workDoc) return;
    
    const collaborators = [
      workDoc.authorId,
      ...workDoc.collaborators
    ].filter(id => id !== this.userId);  // 不发给自己
    
    // 只发送给这个作品的协作者
    await this.p2pNetwork.sendToUsers(collaborators, {
      type: 'work-sync',
      workId,
      changes
    });
  }
  
  // 接收作品变更
  async receiveWorkChanges(workId: string, changes: Uint8Array) {
    let workDoc = this.workDocs.get(workId);
    if (!workDoc) {
      // 没有这个作品，可能权限不足
      console.warn(`Received changes for unknown work: ${workId}`);
      return;
    }
    
    // 应用变更
    workDoc = Automerge.applyChanges(workDoc, [changes]);
    this.workDocs.set(workId, workDoc);
    
    // 保存
    await this.saveWork(workId);
    
    // 通知 UI 更新
    this.emitWorkUpdate(workId);
  }
}
```

---

## 🌐 P2P 网络架构

### 方案 A：纯 P2P（去中心化）

```typescript
// 使用 libp2p 或 WebRTC 直接连接
class P2PNetwork {
  private peers: Map<string, Peer>;
  
  async connectToPeer(userId: string) {
    // 1. 通过 DHT 发现对方的网络地址
    const peerInfo = await this.dht.findPeer(userId);
    
    // 2. 建立 WebRTC 连接
    const peer = await this.createPeerConnection(peerInfo);
    this.peers.set(userId, peer);
    
    // 3. 交换作品列表，找到共同的作品
    const commonWorks = await this.exchangeWorkList(peer);
    
    // 4. 同步共同作品的状态
    for (const workId of commonWorks) {
      await this.syncWorkWithPeer(peer, workId);
    }
  }
  
  async sendToUser(userId: string, message: any) {
    const peer = this.peers.get(userId);
    if (!peer || !peer.connected) {
      // 对方离线，消息存储本地，等待重连
      await this.queueMessage(userId, message);
      return;
    }
    
    peer.send(JSON.stringify(message));
  }
  
  async sendToUsers(userIds: string[], message: any) {
    // 并行发送给多个用户
    await Promise.all(
      userIds.map(userId => this.sendToUser(userId, message))
    );
  }
}

// 问题：纯 P2P 的挑战
// ❌ NAT 穿透困难
// ❌ 需要对方在线才能同步
// ❌ 首次获取作品需要等待协作者上线
```

### 方案 B：混合架构（推荐）⭐

```typescript
// 中央服务器 + P2P
class HybridNetwork {
  private centralServer: WebSocket;
  private p2pPeers: Map<string, Peer>;
  
  constructor() {
    // 1. 连接到中央服务器（消息转发、在线状态）
    this.centralServer = new WebSocket('wss://sync.myapp.com');
    
    // 2. 建立 P2P 连接（直接传输大文件）
    this.p2pPeers = new Map();
  }
  
  async sendToUser(userId: string, message: any) {
    // 优先使用 P2P
    const peer = this.p2pPeers.get(userId);
    if (peer && peer.connected) {
      peer.send(message);
      return;
    }
    
    // 回退到中央服务器
    this.centralServer.send(JSON.stringify({
      type: 'relay',
      to: userId,
      message
    }));
  }
  
  // 中央服务器的作用
  async syncThroughServer(workId: string, changes: Uint8Array) {
    // 1. 上传变更到服务器
    await fetch(`https://api.myapp.com/works/${workId}/sync`, {
      method: 'POST',
      body: changes,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/octet-stream'
      }
    });
    
    // 2. 服务器存储并转发给在线的协作者
    // 3. 离线协作者上线时自动拉取
  }
}

// 优势：
// ✅ 对方离线也能同步（通过服务器）
// ✅ 首次获取作品很快（从服务器下载）
// ✅ P2P 优化大文件传输
// ✅ 服务器只做转发，不解析数据（端到端加密）
```

### 方案 C：服务器辅助（最简单）

```typescript
// 中央服务器作为"消息邮箱"
class ServerAssistedSync {
  private ws: WebSocket;
  
  // 发送变更到服务器
  async publishChange(workId: string, changes: Uint8Array) {
    await fetch(`https://api.myapp.com/works/${workId}/changes`, {
      method: 'POST',
      body: changes
    });
  }
  
  // 轮询新变更
  async pollChanges(workId: string, since: string) {
    const response = await fetch(
      `https://api.myapp.com/works/${workId}/changes?since=${since}`
    );
    const newChanges = await response.json();
    return newChanges;
  }
  
  // WebSocket 实时通知
  setupRealtimeSync() {
    this.ws.on('work-update', async ({ workId }) => {
      const changes = await this.pollChanges(workId, this.lastSync);
      this.applyChanges(workId, changes);
    });
  }
}

// 优势：
// ✅ 实现简单
// ✅ 可靠性高
// ✅ 容易扩展
// ❌ 需要运营服务器
```

---

## 💾 存储架构

### 本地存储结构

```
用户本地目录:
D:\gestell\user-data\
├── user-{userId}\
│   ├── user.automerge           ← 用户个人数据
│   ├── user.db                  ← SQLite 数据库（快照）
│   └── works\
│       ├── {workId-1}.automerge ← 作品 1 的 Automerge 状态
│       ├── {workId-2}.automerge ← 作品 2 的 Automerge 状态
│       └── ...

SQLite 数据库结构:
┌─────────────────────────────────────┐
│ works 表                            │
├─────────────────────────────────────┤
│ id          | title    | author_id  │
│ work-1      | 小说1    | user-a     │
│ work-2      | 小说2    | user-a     │
└─────────────────────────────────────┘
                ↕
    Automerge 是主数据源
    SQLite 是查询快照

流程:
1. Automerge 文档变更
2. 更新 SQLite（用于快速查询）
3. 同步 Automerge 变更到协作者
```

### 同步状态追踪

```typescript
interface SyncState {
  workId: string;
  lastSyncedHeads: Automerge.Heads;  // 上次同步的版本
  pendingChanges: Uint8Array[];      // 待发送的变更
  lastSyncTime: number;
}

class SyncManager {
  private syncStates: Map<string, SyncState>;
  
  // 检测需要同步的作品
  async detectChanges() {
    for (const [workId, workDoc] of this.workDocs) {
      const syncState = this.syncStates.get(workId);
      const currentHeads = Automerge.getHeads(workDoc);
      
      if (!this.headsEqual(currentHeads, syncState.lastSyncedHeads)) {
        // 有新变更，需要同步
        const changes = Automerge.getChanges(
          syncState.lastSyncedHeads,
          workDoc
        );
        await this.syncChanges(workId, changes);
      }
    }
  }
  
  // 增量同步（只发送差异）
  async syncChanges(workId: string, changes: Uint8Array[]) {
    const collaborators = this.getCollaborators(workId);
    
    for (const collaboratorId of collaborators) {
      // 发送增量变更，而不是整个文档
      await this.network.sendToUser(collaboratorId, {
        type: 'work-sync',
        workId,
        changes
      });
    }
    
    // 更新同步状态
    const syncState = this.syncStates.get(workId);
    syncState.lastSyncedHeads = Automerge.getHeads(
      this.workDocs.get(workId)
    );
    syncState.lastSyncTime = Date.now();
  }
}
```

---

## 📈 性能与扩展性

### 性能测算

```typescript
// 场景 1: 个人作品（1 个用户）
作品数量: 100 个
每个作品大小: ~1MB (Automerge 文档)
总存储: ~100MB
同步带宽: 0 (没有协作者)
结论: ✅ 完全没问题

// 场景 2: 小团队协作（3-5 人）
共享作品: 10 个
每个作品变更频率: 每分钟 1 次
每次变更大小: ~1KB (增量)
同步带宽: 10 * 1KB/分钟 * 5 人 = 50KB/分钟
结论: ✅ 轻松应对

// 场景 3: 中等规模协作（10-20 人）
共享作品: 5 个
每个作品变更频率: 每 10 秒 1 次
每次变更大小: ~2KB
同步带宽: 5 * 2KB * 6次/分钟 * 20 人 = 1.2MB/分钟
结论: ✅ 可以接受

// 场景 4: 大规模（数百人同时编辑同一作品）
❌ 不适合 Automerge 的场景
→ 需要使用 Yjs + 中央服务器
→ 或限制同时编辑人数
```

### 优化策略

```typescript
// 1. 延迟同步（批量发送）
class OptimizedSync {
  private pendingChanges: Map<string, Uint8Array[]> = new Map();
  
  queueChange(workId: string, change: Uint8Array) {
    if (!this.pendingChanges.has(workId)) {
      this.pendingChanges.set(workId, []);
    }
    this.pendingChanges.get(workId).push(change);
    
    // 1 秒后批量发送
    this.scheduleSyncDebounced(workId);
  }
  
  private scheduleSyncDebounced = debounce((workId: string) => {
    const changes = this.pendingChanges.get(workId);
    this.syncChanges(workId, changes);
    this.pendingChanges.delete(workId);
  }, 1000);
}

// 2. 压缩大文档
async saveWork(workId: string) {
  let workDoc = this.workDocs.get(workId);
  const size = Automerge.save(workDoc).length;
  
  if (size > 10 * 1024 * 1024) {  // 超过 10MB
    // 创建快照，丢弃旧历史
    workDoc = Automerge.clone(workDoc);
    this.workDocs.set(workId, workDoc);
  }
  
  const binary = Automerge.save(workDoc);
  await fs.writeFile(`works/${workId}.automerge`, binary);
}

// 3. 按需加载（不加载所有作品）
class LazyLoadService {
  private loadedWorks: Set<string> = new Set();
  
  async openWork(workId: string) {
    if (this.loadedWorks.has(workId)) {
      return this.workDocs.get(workId);
    }
    
    // 从磁盘加载
    const binary = await fs.readFile(`works/${workId}.automerge`);
    const workDoc = Automerge.load(binary);
    this.workDocs.set(workId, workDoc);
    this.loadedWorks.add(workId);
    
    return workDoc;
  }
  
  async closeWork(workId: string) {
    // 保存并从内存卸载
    await this.saveWork(workId);
    this.workDocs.delete(workId);
    this.loadedWorks.delete(workId);
  }
}
```

---

## 🔒 安全与隐私

### 端到端加密

```typescript
// 作品数据加密（协作者共享密钥）
class EncryptedWorkSync {
  private workKeys: Map<string, CryptoKey> = new Map();
  
  // 创建作品时生成密钥
  async createWork(title: string): Promise<string> {
    const workId = ulid();
    
    // 1. 生成对称密钥
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    this.workKeys.set(workId, key);
    
    // 2. 创建作品文档
    const workDoc = Automerge.from({ id: workId, title, ... });
    
    // 3. 保存加密的密钥（用户的主密钥加密）
    await this.saveWorkKey(workId, key);
    
    return workId;
  }
  
  // 同步时加密
  async syncWorkChanges(workId: string, changes: Uint8Array) {
    const key = this.workKeys.get(workId);
    
    // 加密变更数据
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      changes
    );
    
    // 发送加密数据
    await this.network.sendToCollaborators(workId, {
      type: 'encrypted-sync',
      workId,
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    });
  }
  
  // 邀请协作者时共享密钥
  async addCollaborator(workId: string, collaboratorId: string) {
    const workKey = this.workKeys.get(workId);
    
    // 1. 获取协作者的公钥
    const collaboratorPublicKey = await this.getUserPublicKey(collaboratorId);
    
    // 2. 用协作者的公钥加密工作密钥
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      collaboratorPublicKey,
      await crypto.subtle.exportKey('raw', workKey)
    );
    
    // 3. 发送加密的密钥
    await this.network.sendToUser(collaboratorId, {
      type: 'work-key',
      workId,
      encryptedKey: Array.from(new Uint8Array(encryptedKey))
    });
  }
}

// 结果：
// ✅ 中央服务器看不到明文数据
// ✅ 只有协作者能解密
// ✅ 用户可以撤销协作者权限（更换密钥）
```

---

## 🎯 总结：正确的架构

### ✅ 推荐方案

```typescript
// 分层架构
┌─────────────────────────────────────────────┐
│ 层级 1: 用户隔离                            │
│ • 每个用户独立的数据目录                    │
│ • 个人设置不同步给其他用户                  │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 层级 2: 作品隔离                            │
│ • 每个作品独立的 Automerge 文档             │
│ • 只同步给有权限的协作者                    │
│ • 私有作品只在作者的设备间同步              │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 层级 3: 同步策略                            │
│ • 优先 P2P（低延迟）                        │
│ • 回退到服务器（离线支持）                  │
│ • 增量同步（节省带宽）                      │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ 层级 4: 存储层                              │
│ • Automerge 文档（主数据源）                │
│ • SQLite（查询快照）                        │
│ • 端到端加密（隐私保护）                    │
└─────────────────────────────────────────────┘
```

### 关键点

1. **不是所有用户的数据库互相同步** ❌
2. **而是按作品、按权限分片同步** ✅
3. **私有作品只在自己的设备间同步** ✅
4. **协作作品只在协作者之间同步** ✅
5. **服务器辅助离线用户同步** ✅
6. **端到端加密保护隐私** ✅

---

## 🚀 实施路线

### Phase 1: 单用户多设备同步（最简单）
```
用户 A 的笔记本 ←→ 服务器 ←→ 用户 A 的台式机
        ↓
    同一用户的所有数据
```

### Phase 2: 小团队协作（3-5 人）
```
用户 A ←→ 用户 B ←→ 用户 C
    ↓
共享的作品数据
```

### Phase 3: 大规模部署（数百用户）
```
中央服务器集群
    ↓
分布式消息队列
    ↓
按作品路由到协作者
```

这样的架构是**可扩展、安全、高效**的！
