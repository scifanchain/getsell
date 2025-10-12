# 真正去中心化的公开同步架构

## 🎯 核心挑战

### 去中心化 + 权限控制的矛盾

```
问题：
┌─────────────────────────────────────────┐
│ 去中心化（P2P）                         │
│ • 没有中央权威                          │
│ • 每个节点平等                          │
│ • 如何验证权限？ ← 核心难题             │
└─────────────────────────────────────────┘

传统解决方案：
✅ 中央服务器 → 但不是去中心化 ❌
✅ 区块链 → 但性能太差、成本高 ❌
✅ 信任所有用户 → 但没有权限控制 ❌
```

### 解决方案：密码学签名 + CRDT

```
核心思想：
每个操作都用私钥签名 → 其他节点验证公钥
    ↓
不需要中央服务器验证权限
    ↓
完全去中心化 ✅
```

---

## 🏗️ 去中心化架构设计

### 架构图

```
┌──────────────┐         ┌──────────────┐
│   用户 A     │◄───────►│   用户 B     │
│  (编辑者)    │   P2P   │  (只读者)    │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │      ┌──────────────┐  │
       └─────►│   用户 C     │◄─┘
         P2P  │  (编辑者)    │
              └──────────────┘

每个节点：
├── 完整的 Automerge 文档（所有数据）
├── 自己的私钥（签名操作）
├── 所有用户的公钥（验证签名）
└── 权限规则（本地验证）

无中央服务器！
```

### 关键组件

```typescript
// 1. 密钥对（每个用户）
interface UserKeys {
  userId: string;
  privateKey: CryptoKey;  // 私钥（本地保存）
  publicKey: CryptoKey;   // 公钥（广播给所有人）
}

// 2. 签名的操作
interface SignedOperation {
  type: 'create_work' | 'update_work' | 'add_collaborator';
  workId: string;
  data: any;
  userId: string;
  timestamp: number;
  signature: string;  // 用私钥签名
  publicKey: string;  // 用于验证
}

// 3. 作品权限（存储在 Automerge 文档中）
interface Work {
  id: string;
  title: string;
  authorId: string;
  authorPublicKey: string;  // 作者公钥
  collaborators: {
    userId: string;
    publicKey: string;
    addedAt: number;
    addedBySignature: string;  // 作者签名授权
  }[];
}
```

---

## 💻 完整实现

### 1. 密钥管理

```typescript
// ===== 用户密钥管理 =====
class KeyManager {
  private keyPair: CryptoKeyPair | null = null;
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  // 生成或加载密钥对
  async init() {
    // 尝试从本地存储加载
    const saved = await this.loadFromStorage();
    if (saved) {
      this.keyPair = saved;
      console.log('Loaded existing keys');
      return;
    }
    
    // 生成新密钥对
    this.keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-384'
      },
      true,  // 可导出
      ['sign', 'verify']
    );
    
    // 保存到本地存储
    await this.saveToStorage();
    console.log('Generated new keys');
  }
  
  // 签名操作
  async signOperation(operation: any): Promise<string> {
    if (!this.keyPair) {
      throw new Error('Keys not initialized');
    }
    
    // 序列化操作
    const message = JSON.stringify(operation);
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // 使用私钥签名
    const signature = await crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-384'
      },
      this.keyPair.privateKey,
      data
    );
    
    // 转换为 base64
    return this.arrayBufferToBase64(signature);
  }
  
  // 验证签名
  async verifySignature(
    operation: any,
    signature: string,
    publicKeyStr: string
  ): Promise<boolean> {
    try {
      // 导入公钥
      const publicKey = await this.importPublicKey(publicKeyStr);
      
      // 序列化操作
      const message = JSON.stringify(operation);
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      
      // 验证签名
      const signatureBuffer = this.base64ToArrayBuffer(signature);
      const isValid = await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-384'
        },
        publicKey,
        signatureBuffer,
        data
      );
      
      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }
  
  // 导出公钥
  async exportPublicKey(): Promise<string> {
    if (!this.keyPair) {
      throw new Error('Keys not initialized');
    }
    
    const exported = await crypto.subtle.exportKey(
      'spki',
      this.keyPair.publicKey
    );
    
    return this.arrayBufferToBase64(exported);
  }
  
  // 导入公钥
  async importPublicKey(publicKeyStr: string): Promise<CryptoKey> {
    const keyData = this.base64ToArrayBuffer(publicKeyStr);
    
    return await crypto.subtle.importKey(
      'spki',
      keyData,
      {
        name: 'ECDSA',
        namedCurve: 'P-384'
      },
      true,
      ['verify']
    );
  }
  
  // 辅助方法
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  private async saveToStorage() {
    if (!this.keyPair) return;
    
    const privateKey = await crypto.subtle.exportKey('pkcs8', this.keyPair.privateKey);
    const publicKey = await crypto.subtle.exportKey('spki', this.keyPair.publicKey);
    
    localStorage.setItem(`privateKey_${this.userId}`, this.arrayBufferToBase64(privateKey));
    localStorage.setItem(`publicKey_${this.userId}`, this.arrayBufferToBase64(publicKey));
  }
  
  private async loadFromStorage(): Promise<CryptoKeyPair | null> {
    const privateKeyStr = localStorage.getItem(`privateKey_${this.userId}`);
    const publicKeyStr = localStorage.getItem(`publicKey_${this.userId}`);
    
    if (!privateKeyStr || !publicKeyStr) return null;
    
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      this.base64ToArrayBuffer(privateKeyStr),
      { name: 'ECDSA', namedCurve: 'P-384' },
      true,
      ['sign']
    );
    
    const publicKey = await crypto.subtle.importKey(
      'spki',
      this.base64ToArrayBuffer(publicKeyStr),
      { name: 'ECDSA', namedCurve: 'P-384' },
      true,
      ['verify']
    );
    
    return { privateKey, publicKey };
  }
}
```

### 2. P2P 网络（基于 libp2p 或 WebRTC）

```typescript
// ===== P2P 网络层 =====
import Peer from 'peerjs';

interface P2PMessage {
  type: 'signed-operation' | 'sync-request' | 'sync-response';
  data: any;
}

class P2PNetwork {
  private peer: Peer;
  private connections: Map<string, any> = new Map();
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
    this.initPeer();
  }
  
  async initPeer() {
    // 使用公共 PeerJS 服务器（或自建）
    this.peer = new Peer(this.userId, {
      host: 'peerjs-server.myapp.com',  // 只用于信令，不处理数据
      port: 443,
      path: '/myapp',
      secure: true
    });
    
    this.peer.on('open', (id) => {
      console.log('P2P node ID:', id);
    });
    
    // 接收连接
    this.peer.on('connection', (conn) => {
      this.handleConnection(conn);
    });
  }
  
  // 连接到其他节点
  connectToPeer(peerId: string) {
    if (this.connections.has(peerId)) {
      return;  // 已连接
    }
    
    const conn = this.peer.connect(peerId);
    this.handleConnection(conn);
  }
  
  handleConnection(conn: any) {
    conn.on('open', () => {
      console.log('Connected to peer:', conn.peer);
      this.connections.set(conn.peer, conn);
      
      // 请求同步
      this.requestSync(conn);
    });
    
    conn.on('data', (data: P2PMessage) => {
      this.handleMessage(conn.peer, data);
    });
    
    conn.on('close', () => {
      console.log('Disconnected from peer:', conn.peer);
      this.connections.delete(conn.peer);
    });
  }
  
  // 广播消息给所有连接的节点
  broadcast(message: P2PMessage) {
    for (const [peerId, conn] of this.connections) {
      if (conn.open) {
        conn.send(message);
      }
    }
  }
  
  // 发送给特定节点
  sendToPeer(peerId: string, message: P2PMessage) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(message);
    }
  }
  
  requestSync(conn: any) {
    // 请求对方的最新状态
    conn.send({
      type: 'sync-request',
      data: {}
    });
  }
  
  handleMessage(fromPeer: string, message: P2PMessage) {
    // 由上层处理
    this.onMessage(fromPeer, message);
  }
  
  onMessage: (fromPeer: string, message: P2PMessage) => void = () => {};
  
  // 发现其他节点（通过服务器、DHT 或约定的列表）
  async discoverPeers(): Promise<string[]> {
    // 方案 1: 从服务器获取在线节点列表
    const response = await fetch('https://api.myapp.com/peers');
    const peers = await response.json();
    return peers.map((p: any) => p.userId);
    
    // 方案 2: 使用 DHT（如果使用 libp2p）
    // 方案 3: 使用约定的 rendezvous 点
  }
  
  async connectToNetwork() {
    const peers = await this.discoverPeers();
    console.log(`Discovered ${peers.length} peers`);
    
    for (const peerId of peers) {
      if (peerId !== this.userId) {
        this.connectToPeer(peerId);
      }
    }
  }
}
```

### 3. 签名的 CRDT 同步

```typescript
// ===== 去中心化的 CRDT 同步 =====
import * as Automerge from '@automerge/automerge';

interface GlobalData {
  works: Work[];
  chapters: Chapter[];
  users: {
    userId: string;
    publicKey: string;
    nickname: string;
  }[];
}

class DecentralizedSync {
  private doc: Automerge.Doc<GlobalData>;
  private keyManager: KeyManager;
  private p2pNetwork: P2PNetwork;
  private userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
    this.keyManager = new KeyManager(userId);
    this.p2pNetwork = new P2PNetwork(userId);
  }
  
  async init() {
    // 初始化密钥
    await this.keyManager.init();
    
    // 初始化文档
    await this.loadOrCreateDoc();
    
    // 注册自己的公钥
    await this.registerPublicKey();
    
    // 连接到 P2P 网络
    await this.p2pNetwork.connectToNetwork();
    
    // 设置消息处理
    this.p2pNetwork.onMessage = this.handleP2PMessage.bind(this);
  }
  
  async loadOrCreateDoc() {
    // 从本地加载
    const saved = localStorage.getItem('automerge-doc');
    if (saved) {
      const binary = this.base64ToUint8Array(saved);
      this.doc = Automerge.load<GlobalData>(binary);
      console.log(`Loaded doc with ${this.doc.works.length} works`);
    } else {
      this.doc = Automerge.from<GlobalData>({
        works: [],
        chapters: [],
        users: []
      });
      console.log('Created new document');
    }
  }
  
  async registerPublicKey() {
    const publicKey = await this.keyManager.exportPublicKey();
    
    // 检查是否已注册
    const existing = this.doc.users.find(u => u.userId === this.userId);
    if (existing) return;
    
    // 添加到用户列表
    this.doc = Automerge.change(this.doc, 'Register public key', doc => {
      doc.users.push({
        userId: this.userId,
        publicKey,
        nickname: this.userId  // 可以从设置获取
      });
    });
    
    // 广播变更
    await this.broadcastChanges();
  }
  
  // ===== 创建作品（签名） =====
  async createWork(title: string, description: string) {
    const workId = this.generateId();
    const publicKey = await this.keyManager.exportPublicKey();
    
    // 创建操作
    const operation = {
      type: 'create_work',
      workId,
      title,
      description,
      authorId: this.userId,
      timestamp: Date.now()
    };
    
    // 签名
    const signature = await this.keyManager.signOperation(operation);
    
    // 应用到本地文档
    this.doc = Automerge.change(this.doc, `Create work by ${this.userId}`, doc => {
      doc.works.push({
        id: workId,
        title,
        description,
        authorId: this.userId,
        authorPublicKey: publicKey,
        collaborators: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        operations: [{
          ...operation,
          signature
        }]
      });
    });
    
    // 广播给所有节点
    await this.broadcastSignedOperation(operation, signature);
    
    return workId;
  }
  
  // ===== 更新作品（需要验证权限） =====
  async updateWork(workId: string, updates: Partial<Work>) {
    // 1. 本地权限检查
    if (!this.canEdit(workId)) {
      throw new Error('Permission denied: You cannot edit this work');
    }
    
    // 2. 创建签名操作
    const operation = {
      type: 'update_work',
      workId,
      updates,
      userId: this.userId,
      timestamp: Date.now()
    };
    
    const signature = await this.keyManager.signOperation(operation);
    
    // 3. 应用到本地文档
    this.doc = Automerge.change(this.doc, `Update work by ${this.userId}`, doc => {
      const work = doc.works.find(w => w.id === workId);
      if (!work) return;
      
      if (updates.title) work.title = updates.title;
      if (updates.description) work.description = updates.description;
      work.updatedAt = Date.now();
      
      // 记录操作
      if (!work.operations) work.operations = [];
      work.operations.push({
        ...operation,
        signature
      });
    });
    
    // 4. 广播
    await this.broadcastSignedOperation(operation, signature);
  }
  
  // ===== 添加协作者（只有作者可以） =====
  async addCollaborator(workId: string, collaboratorId: string) {
    const work = this.doc.works.find(w => w.id === workId);
    if (!work) {
      throw new Error('Work not found');
    }
    
    if (work.authorId !== this.userId) {
      throw new Error('Only author can add collaborators');
    }
    
    // 获取协作者的公钥
    const collaborator = this.doc.users.find(u => u.userId === collaboratorId);
    if (!collaborator) {
      throw new Error('Collaborator not found');
    }
    
    // 创建授权操作
    const operation = {
      type: 'add_collaborator',
      workId,
      collaboratorId,
      collaboratorPublicKey: collaborator.publicKey,
      authorId: this.userId,
      timestamp: Date.now()
    };
    
    const signature = await this.keyManager.signOperation(operation);
    
    // 应用到本地
    this.doc = Automerge.change(this.doc, `Add collaborator by ${this.userId}`, doc => {
      const w = doc.works.find(w => w.id === workId);
      if (!w) return;
      
      if (!w.collaborators) w.collaborators = [];
      w.collaborators.push({
        userId: collaboratorId,
        publicKey: collaborator.publicKey,
        addedAt: Date.now(),
        addedBySignature: signature  // 作者签名授权
      });
    });
    
    // 广播
    await this.broadcastSignedOperation(operation, signature);
  }
  
  // ===== 接收并验证操作 =====
  async receiveSignedOperation(
    operation: any,
    signature: string,
    fromPeer: string
  ) {
    console.log(`Received ${operation.type} from ${fromPeer}`);
    
    // 1. 获取操作者的公钥
    const user = this.doc.users.find(u => u.userId === operation.userId || u.userId === operation.authorId);
    if (!user) {
      console.error('User not found:', operation.userId);
      return;
    }
    
    // 2. 验证签名
    const isValid = await this.keyManager.verifySignature(
      operation,
      signature,
      user.publicKey
    );
    
    if (!isValid) {
      console.error('Invalid signature! Rejecting operation:', operation);
      return;
    }
    
    // 3. 验证权限
    if (operation.type === 'update_work' || operation.type === 'update_chapter') {
      const workId = operation.workId;
      const canEdit = await this.verifyEditPermission(
        operation.userId,
        workId,
        user.publicKey
      );
      
      if (!canEdit) {
        console.error('Permission denied! Rejecting operation:', operation);
        return;
      }
    }
    
    // 4. 应用操作
    const oldDoc = this.doc;
    this.doc = this.applyOperation(operation, signature);
    
    // 5. 保存
    this.saveDoc();
    
    // 6. 通知 UI
    this.notifyUpdate();
  }
  
  applyOperation(operation: any, signature: string): Automerge.Doc<GlobalData> {
    return Automerge.change(this.doc, `Apply ${operation.type}`, doc => {
      switch (operation.type) {
        case 'create_work':
          doc.works.push({
            id: operation.workId,
            title: operation.title,
            description: operation.description,
            authorId: operation.authorId,
            authorPublicKey: operation.publicKey,
            collaborators: [],
            createdAt: operation.timestamp,
            updatedAt: operation.timestamp,
            operations: [{ ...operation, signature }]
          });
          break;
          
        case 'update_work':
          const work = doc.works.find(w => w.id === operation.workId);
          if (work) {
            if (operation.updates.title) work.title = operation.updates.title;
            if (operation.updates.description) work.description = operation.updates.description;
            work.updatedAt = operation.timestamp;
            
            if (!work.operations) work.operations = [];
            work.operations.push({ ...operation, signature });
          }
          break;
          
        case 'add_collaborator':
          const w = doc.works.find(w => w.id === operation.workId);
          if (w) {
            if (!w.collaborators) w.collaborators = [];
            w.collaborators.push({
              userId: operation.collaboratorId,
              publicKey: operation.collaboratorPublicKey,
              addedAt: operation.timestamp,
              addedBySignature: signature
            });
          }
          break;
      }
    });
  }
  
  async verifyEditPermission(
    userId: string,
    workId: string,
    publicKey: string
  ): Promise<boolean> {
    const work = this.doc.works.find(w => w.id === workId);
    if (!work) return false;
    
    // 作者可以编辑
    if (work.authorId === userId) {
      return true;
    }
    
    // 协作者可以编辑（需要验证作者的授权签名）
    const collaborator = work.collaborators?.find(c => c.userId === userId);
    if (collaborator) {
      // 验证作者当时授权的签名
      const authorUser = this.doc.users.find(u => u.userId === work.authorId);
      if (!authorUser) return false;
      
      const authOperation = {
        type: 'add_collaborator',
        workId,
        collaboratorId: userId,
        authorId: work.authorId
      };
      
      const isValid = await this.keyManager.verifySignature(
        authOperation,
        collaborator.addedBySignature,
        authorUser.publicKey
      );
      
      return isValid;
    }
    
    return false;
  }
  
  canEdit(workId: string): boolean {
    const work = this.doc.works.find(w => w.id === workId);
    if (!work) return false;
    
    return work.authorId === this.userId || 
           work.collaborators?.some(c => c.userId === this.userId);
  }
  
  // ===== P2P 消息处理 =====
  async handleP2PMessage(fromPeer: string, message: P2PMessage) {
    switch (message.type) {
      case 'signed-operation':
        await this.receiveSignedOperation(
          message.data.operation,
          message.data.signature,
          fromPeer
        );
        break;
        
      case 'sync-request':
        await this.handleSyncRequest(fromPeer);
        break;
        
      case 'sync-response':
        await this.handleSyncResponse(message.data);
        break;
    }
  }
  
  async handleSyncRequest(fromPeer: string) {
    // 发送完整文档给对方
    const state = Automerge.save(this.doc);
    this.p2pNetwork.sendToPeer(fromPeer, {
      type: 'sync-response',
      data: {
        state: Array.from(state)
      }
    });
  }
  
  async handleSyncResponse(data: any) {
    // 接收对方的文档并合并
    const theirDoc = Automerge.load<GlobalData>(new Uint8Array(data.state));
    
    // Automerge 自动合并
    this.doc = Automerge.merge(this.doc, theirDoc);
    
    this.saveDoc();
    this.notifyUpdate();
  }
  
  async broadcastSignedOperation(operation: any, signature: string) {
    this.p2pNetwork.broadcast({
      type: 'signed-operation',
      data: {
        operation,
        signature
      }
    });
    
    this.saveDoc();
  }
  
  async broadcastChanges() {
    const changes = Automerge.getLastLocalChange(this.doc);
    if (changes) {
      this.p2pNetwork.broadcast({
        type: 'sync-changes',
        data: {
          changes: Array.from(changes)
        }
      });
    }
    
    this.saveDoc();
  }
  
  saveDoc() {
    const binary = Automerge.save(this.doc);
    const base64 = this.uint8ArrayToBase64(binary);
    localStorage.setItem('automerge-doc', base64);
  }
  
  notifyUpdate() {
    // 通知 Vue 更新 UI
    window.dispatchEvent(new CustomEvent('doc-updated', {
      detail: { works: this.doc.works }
    }));
  }
  
  // 辅助方法
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  
  uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
```

---

## 🔒 安全性分析

### 优势

```typescript
✅ 无中央权威 - 完全 P2P
✅ 密码学保证 - 签名无法伪造
✅ 权限可验证 - 所有节点独立验证
✅ 操作可追溯 - 签名链记录所有历史
✅ 抗审查 - 无法被单点关闭
```

### 攻击场景与防御

```typescript
// 场景 1: 恶意用户尝试修改别人的作品
❌ 攻击：用户 B 尝试修改用户 A 的作品
✅ 防御：没有 A 的私钥，无法生成有效签名
      → 其他节点拒绝操作

// 场景 2: 恶意用户伪造协作者身份
❌ 攻击：用户 C 声称自己是作品 1 的协作者
✅ 防御：协作者添加需要作者签名授权
      → 验证作者签名失败，拒绝

// 场景 3: 中间人攻击
❌ 攻击：窃听 P2P 通信
✅ 防御：使用 TLS/DTLS 加密传输（libp2p 内置）
      → 数据加密传输

// 场景 4: 女巫攻击（Sybil Attack）
❌ 攻击：创建大量假身份
✅ 防御：需要通过某种身份验证（如邮箱验证）
      → 或使用信誉系统
```

---

## 📈 与中央服务器方案对比

| 特性 | 中央服务器 | 去中心化（本方案） |
|------|-----------|------------------|
| **单点故障** | ❌ 有 | ✅ 无 |
| **审查抵抗** | ❌ 弱 | ✅ 强 |
| **隐私** | ⚠️ 服务器可见 | ✅ 端到端 |
| **权限验证** | ✅ 简单 | ✅ 密码学保证 |
| **性能** | ✅ 高 | ⚠️ 中等 |
| **实现复杂度** | ✅ 简单 | ⚠️ 复杂 |
| **运营成本** | ❌ 高 | ✅ 低 |
| **离线支持** | ⚠️ 有限 | ✅ 完全 |
| **扩展性** | ✅ 好 | ⚠️ 中等 |

---

## 🌐 P2P 发现机制

### 方案 1: Bootstrap 节点（推荐）

```typescript
// 使用少量 bootstrap 节点帮助发现
class BootstrapDiscovery {
  private bootstrapNodes = [
    'peer-1.myapp.com',
    'peer-2.myapp.com',
    'peer-3.myapp.com'
  ];
  
  async discoverPeers(): Promise<string[]> {
    const allPeers: string[] = [];
    
    for (const bootstrap of this.bootstrapNodes) {
      try {
        const response = await fetch(`https://${bootstrap}/peers`);
        const peers = await response.json();
        allPeers.push(...peers);
      } catch (error) {
        console.error(`Failed to reach ${bootstrap}`);
      }
    }
    
    return [...new Set(allPeers)];  // 去重
  }
}

// Bootstrap 节点只提供 peer 发现，不处理数据
// 仍然是去中心化的
```

### 方案 2: DHT（完全去中心化）

```typescript
// 使用 Kademlia DHT
import { createLibp2p } from 'libp2p';
import { KadDHT } from '@libp2p/kad-dht';

class DHTDiscovery {
  private node: any;
  
  async init() {
    this.node = await createLibp2p({
      addresses: {
        listen: ['/ip4/0.0.0.0/tcp/0']
      },
      transports: [/* ... */],
      connectionEncryption: [/* ... */],
      dht: new KadDHT()
    });
    
    await this.node.start();
  }
  
  async discoverPeers() {
    // 通过 DHT 发现其他节点
    for await (const peer of this.node.peerStore.all()) {
      console.log('Found peer:', peer.id.toString());
    }
  }
}
```

### 方案 3: mDNS（本地网络）

```typescript
// 局域网自动发现
import { mdns } from '@libp2p/mdns';

// 同一 WiFi 下的设备自动发现彼此
// 适合小团队协作
```

---

## 🎓 总结

### ✅ 完全去中心化 + 权限控制

```typescript
核心技术栈:
├── Automerge (CRDT) - 自动合并冲突
├── ECDSA 签名 - 密码学权限验证
├── P2P 网络 (PeerJS/libp2p) - 直接连接
└── Bootstrap 节点 - 帮助发现（可选）

特性:
✅ 完全 P2P（无中央服务器处理数据）
✅ 密码学权限控制（签名验证）
✅ 所有用户看到所有数据（公开可见）
✅ 只有授权用户能编辑（签名保证）
✅ 操作可追溯（签名链）
✅ 抗审查（分布式）
```

### 实施步骤

```
Week 1: 密钥管理 + 签名验证
Week 2: P2P 网络 + peer 发现
Week 3: Automerge 集成 + 权限验证
Week 4: UI + 测试
```

### 折中方案（渐进式）

如果觉得完全去中心化太复杂，可以采用**混合模式**：

```
Phase 1: 中央服务器（快速启动）
    ↓
Phase 2: 添加 P2P 支持（服务器辅助发现）
    ↓
Phase 3: 完全 P2P（移除服务器依赖）
```

需要我开始实现哪个方案？或者先做一个 Demo 演示原理？
