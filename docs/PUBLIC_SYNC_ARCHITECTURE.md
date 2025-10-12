# 公开同步 + 权限控制架构方案

## 🎯 需求澄清

### 您的实际需求

```
所有用户都能看到所有内容 ✅
├── 用户 A 创建作品
│   ├── 所有人都能看到这个作品 ← 公开可见
│   ├── 只有受邀协作者能编辑 ← 权限控制
│   └── 编辑后的内容广播给所有人 ← 全局同步
│
├── 用户 B 创建作品
│   ├── 所有人都能看到
│   ├── 只有 B 和受邀者能编辑
│   └── 编辑后广播给所有人
│
└── 所有用户都同步全量数据 ← 关键！
```

### 类似的产品模型

```
类似于：
✅ GitHub（所有仓库可见，但只有 contributor 能 push）
✅ 维基百科（所有人可见，部分人可编辑）
✅ 公开的协作文档（观看者 vs 编辑者）

不是：
❌ Google Docs（私有文档，邀请才能看）
❌ Notion（权限控制严格）
```

---

## 🏗️ 推荐架构：混合模式

### 架构图

```
┌─────────────────────────────────────────────────┐
│          所有用户的客户端（100+ 用户）           │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 全局只读 Automerge 文档                   │  │
│  │ • 所有作品（1000+）                       │  │
│  │ • 所有章节（20000+）                      │  │
│  │ • 所有用户信息                            │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│                 ↓                               │
│  ┌──────────────────────────────────────────┐  │
│  │ UI 权限控制（本地验证）                   │  │
│  │ if (canEdit(work)) {                      │  │
│  │   showEditButton()  ← 有权限              │  │
│  │ } else {                                  │  │
│  │   showReadOnlyView() ← 无权限             │  │
│  │ }                                         │  │
│  └──────────────┬───────────────────────────┘  │
└─────────────────┼───────────────────────────────┘
                  │
                  │ 编辑请求（带认证）
                  ↓
┌─────────────────────────────────────────────────┐
│         中央服务器（权限验证 + 数据源）          │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ 主 Automerge 文档（单一数据源）           │  │
│  │ globalDoc = Automerge.from({              │  │
│  │   works: [...所有作品],                   │  │
│  │   chapters: [...所有章节]                 │  │
│  │ })                                        │  │
│  └──────────────┬───────────────────────────┘  │
│                 │                               │
│  ┌──────────────▼───────────────────────────┐  │
│  │ 权限验证流程：                            │  │
│  │ 1. 验证 JWT token                         │  │
│  │ 2. 检查用户是否有编辑权限                 │  │
│  │ 3. 应用变更到主文档                       │  │
│  │ 4. 广播给所有客户端 ← 关键！              │  │
│  └──────────────┬───────────────────────────┘  │
└─────────────────┼───────────────────────────────┘
                  │
                  ↓ 变更广播（WebSocket）
         ┌────────┴────────┬──────────┐
         │                 │          │
    ┌────▼───┐        ┌───▼────┐ ┌──▼─────┐
    │ 用户 A │        │ 用户 B │ │ 用户 C │
    │ (编辑) │        │ (只读) │ │ (只读) │
    └────────┘        └────────┘ └────────┘
         ↓                 ↓          ↓
    自动更新 UI       自动更新 UI  自动更新 UI
    （所有人看到同样的内容）
```

---

## 💻 完整实现代码

### 服务器端

```typescript
// ===== 服务器端：权威数据源 =====
import * as Automerge from '@automerge/automerge';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';

interface GlobalData {
  works: Work[];
  chapters: Chapter[];
  users: User[];
}

class GlobalSyncServer {
  private globalDoc: Automerge.Doc<GlobalData>;
  private connections: Map<string, WebSocket> = new Map();
  private userTokens: Map<string, string> = new Map();
  
  constructor() {
    this.initGlobalDoc();
    this.setupWebSocketServer();
  }
  
  async initGlobalDoc() {
    console.log('Initializing global document...');
    
    // 从数据库加载或创建新文档
    const saved = await this.loadFromDatabase();
    if (saved) {
      this.globalDoc = Automerge.load(saved);
      console.log(`Loaded ${this.globalDoc.works.length} works`);
    } else {
      this.globalDoc = Automerge.from<GlobalData>({
        works: [],
        chapters: [],
        users: []
      });
      console.log('Created new global document');
    }
  }
  
  setupWebSocketServer() {
    const wss = new WebSocketServer({ port: 8080 });
    console.log('WebSocket server listening on port 8080');
    
    wss.on('connection', (ws, req) => {
      // 1. 认证用户
      const userId = this.authenticateUser(req);
      if (!userId) {
        ws.close(1008, 'Authentication failed');
        return;
      }
      
      console.log(`User ${userId} connected`);
      this.connections.set(userId, ws);
      
      // 2. 发送完整文档给新用户
      this.sendFullSync(ws);
      
      // 3. 监听编辑请求
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(userId, message);
        } catch (error) {
          console.error('Message handling error:', error);
          this.sendError(ws, error.message);
        }
      });
      
      ws.on('close', () => {
        console.log(`User ${userId} disconnected`);
        this.connections.delete(userId);
      });
    });
  }
  
  authenticateUser(req: any): string | null {
    // 从 URL 参数获取 token
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    
    if (!token) return null;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      return decoded.userId;
    } catch (error) {
      return null;
    }
  }
  
  sendFullSync(ws: WebSocket) {
    // 发送完整的 Automerge 文档
    const fullState = Automerge.save(this.globalDoc);
    ws.send(JSON.stringify({
      type: 'full-sync',
      state: Array.from(fullState)
    }));
    console.log(`Sent full sync: ${fullState.length} bytes`);
  }
  
  async handleMessage(userId: string, message: any) {
    const { type, workId, data } = message;
    
    console.log(`Received ${type} from ${userId}`);
    
    switch (type) {
      case 'create_work':
        await this.handleCreateWork(userId, data);
        break;
        
      case 'update_work':
        await this.handleUpdateWork(userId, workId, data);
        break;
        
      case 'delete_work':
        await this.handleDeleteWork(userId, workId);
        break;
        
      case 'create_chapter':
        await this.handleCreateChapter(userId, workId, data);
        break;
        
      case 'update_chapter':
        await this.handleUpdateChapter(userId, data.chapterId, data);
        break;
        
      case 'invite_collaborator':
        await this.handleInviteCollaborator(userId, workId, data.collaboratorId);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }
  
  async handleCreateWork(userId: string, data: any) {
    // 创建作品（任何用户都可以）
    const oldDoc = this.globalDoc;
    
    this.globalDoc = Automerge.change(this.globalDoc, `Create work by ${userId}`, doc => {
      doc.works.push({
        id: this.generateId(),
        title: data.title,
        description: data.description || '',
        authorId: userId,
        editors: [],  // 初始没有协作者
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: userId,
        updatedBy: userId
      });
    });
    
    console.log(`Work created: ${data.title}`);
    
    // 广播给所有用户
    await this.broadcastChanges(oldDoc);
  }
  
  async handleUpdateWork(userId: string, workId: string, data: any) {
    // 1. 权限验证
    if (!await this.canEdit(userId, workId)) {
      throw new Error('Permission denied: You cannot edit this work');
    }
    
    // 2. 应用变更
    const oldDoc = this.globalDoc;
    
    this.globalDoc = Automerge.change(this.globalDoc, `Update work by ${userId}`, doc => {
      const work = doc.works.find(w => w.id === workId);
      if (!work) {
        throw new Error('Work not found');
      }
      
      // 更新字段
      if (data.title !== undefined) work.title = data.title;
      if (data.description !== undefined) work.description = data.description;
      
      work.updatedAt = Date.now();
      work.updatedBy = userId;
    });
    
    console.log(`Work updated: ${workId} by ${userId}`);
    
    // 3. 审计日志
    await this.logAction(userId, workId, 'update_work', data);
    
    // 4. 广播给所有用户
    await this.broadcastChanges(oldDoc);
  }
  
  async handleDeleteWork(userId: string, workId: string) {
    // 只有作者可以删除
    const work = this.globalDoc.works.find(w => w.id === workId);
    if (!work) {
      throw new Error('Work not found');
    }
    
    if (work.authorId !== userId) {
      throw new Error('Permission denied: Only author can delete work');
    }
    
    const oldDoc = this.globalDoc;
    
    this.globalDoc = Automerge.change(this.globalDoc, `Delete work by ${userId}`, doc => {
      // 软删除或硬删除
      const index = doc.works.findIndex(w => w.id === workId);
      doc.works.splice(index, 1);
      
      // 同时删除相关章节
      doc.chapters = doc.chapters.filter(c => c.workId !== workId);
    });
    
    console.log(`Work deleted: ${workId}`);
    
    await this.broadcastChanges(oldDoc);
  }
  
  async handleCreateChapter(userId: string, workId: string, data: any) {
    // 权限验证
    if (!await this.canEdit(userId, workId)) {
      throw new Error('Permission denied');
    }
    
    const oldDoc = this.globalDoc;
    
    this.globalDoc = Automerge.change(this.globalDoc, `Create chapter by ${userId}`, doc => {
      doc.chapters.push({
        id: this.generateId(),
        workId,
        title: data.title,
        content: data.content || '',
        order: data.order || 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: userId,
        updatedBy: userId
      });
    });
    
    console.log(`Chapter created in work ${workId}`);
    
    await this.broadcastChanges(oldDoc);
  }
  
  async handleUpdateChapter(userId: string, chapterId: string, data: any) {
    // 查找章节所属的作品
    const chapter = this.globalDoc.chapters.find(c => c.id === chapterId);
    if (!chapter) {
      throw new Error('Chapter not found');
    }
    
    // 权限验证
    if (!await this.canEdit(userId, chapter.workId)) {
      throw new Error('Permission denied');
    }
    
    const oldDoc = this.globalDoc;
    
    this.globalDoc = Automerge.change(this.globalDoc, `Update chapter by ${userId}`, doc => {
      const ch = doc.chapters.find(c => c.id === chapterId);
      if (!ch) return;
      
      if (data.title !== undefined) ch.title = data.title;
      if (data.content !== undefined) ch.content = data.content;
      if (data.order !== undefined) ch.order = data.order;
      
      ch.updatedAt = Date.now();
      ch.updatedBy = userId;
    });
    
    await this.broadcastChanges(oldDoc);
  }
  
  async handleInviteCollaborator(userId: string, workId: string, collaboratorId: string) {
    // 只有作者可以邀请
    const work = this.globalDoc.works.find(w => w.id === workId);
    if (!work) {
      throw new Error('Work not found');
    }
    
    if (work.authorId !== userId) {
      throw new Error('Permission denied: Only author can invite collaborators');
    }
    
    const oldDoc = this.globalDoc;
    
    this.globalDoc = Automerge.change(this.globalDoc, `Invite collaborator by ${userId}`, doc => {
      const w = doc.works.find(w => w.id === workId);
      if (!w) return;
      
      if (!w.editors) w.editors = [];
      if (!w.editors.includes(collaboratorId)) {
        w.editors.push(collaboratorId);
      }
      
      w.updatedAt = Date.now();
    });
    
    console.log(`Collaborator ${collaboratorId} added to work ${workId}`);
    
    await this.broadcastChanges(oldDoc);
  }
  
  async canEdit(userId: string, workId: string): Promise<boolean> {
    const work = this.globalDoc.works.find(w => w.id === workId);
    if (!work) return false;
    
    // 作者或协作者可以编辑
    return work.authorId === userId || 
           work.editors?.includes(userId);
  }
  
  async broadcastChanges(oldDoc: Automerge.Doc<GlobalData>) {
    // 计算增量变更
    const changes = Automerge.getChanges(oldDoc, this.globalDoc);
    
    if (changes.length === 0) return;
    
    // 广播给所有连接的用户
    const message = JSON.stringify({
      type: 'sync-changes',
      changes: changes.map(c => Array.from(c))
    });
    
    let broadcastCount = 0;
    for (const [userId, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        broadcastCount++;
      }
    }
    
    console.log(`Broadcasted ${changes.length} changes to ${broadcastCount} users`);
    
    // 持久化到数据库
    await this.saveToDatabase();
  }
  
  sendError(ws: WebSocket, message: string) {
    ws.send(JSON.stringify({
      type: 'error',
      message
    }));
  }
  
  async loadFromDatabase(): Promise<Uint8Array | null> {
    // 从数据库加载 Automerge 文档
    // 这里简化实现，实际应该从 Prisma 加载
    try {
      const fs = require('fs');
      const data = fs.readFileSync('data/global-doc.automerge');
      return new Uint8Array(data);
    } catch (error) {
      return null;
    }
  }
  
  async saveToDatabase() {
    // 保存到数据库
    const state = Automerge.save(this.globalDoc);
    const fs = require('fs');
    fs.writeFileSync('data/global-doc.automerge', state);
    
    // 同时保存到 SQLite（用于查询）
    // await this.syncToSQLite();
  }
  
  async logAction(userId: string, workId: string, action: string, details: any) {
    // 审计日志
    console.log(`[AUDIT] ${userId} ${action} on ${workId}`, details);
  }
  
  generateId(): string {
    // 生成唯一 ID
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// 启动服务器
const server = new GlobalSyncServer();
```

### 客户端

```typescript
// ===== 客户端：只读副本 + 权限控制 =====
import * as Automerge from '@automerge/automerge';

interface GlobalData {
  works: Work[];
  chapters: Chapter[];
  users: User[];
}

class GlobalSyncClient {
  private globalDoc: Automerge.Doc<GlobalData>;
  private ws: WebSocket | null = null;
  private currentUserId: string;
  private reconnectAttempts = 0;
  
  constructor(userId: string, token: string) {
    this.currentUserId = userId;
    this.connect(token);
  }
  
  connect(token: string) {
    console.log('Connecting to sync server...');
    
    this.ws = new WebSocket(`wss://sync.myapp.com?token=${token}`);
    
    this.ws.onopen = () => {
      console.log('Connected to sync server');
      this.reconnectAttempts = 0;
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected from sync server');
      this.reconnect(token);
    };
  }
  
  reconnect(token: string) {
    // 指数退避重连
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting in ${delay}ms...`);
    setTimeout(() => this.connect(token), delay);
  }
  
  handleMessage(message: any) {
    switch (message.type) {
      case 'full-sync':
        this.handleFullSync(message);
        break;
        
      case 'sync-changes':
        this.handleIncrementalSync(message);
        break;
        
      case 'error':
        this.handleError(message);
        break;
    }
  }
  
  handleFullSync(message: any) {
    console.log('Received full sync');
    
    // 加载完整文档
    this.globalDoc = Automerge.load<GlobalData>(
      new Uint8Array(message.state)
    );
    
    console.log(`Loaded ${this.globalDoc.works.length} works, ${this.globalDoc.chapters.length} chapters`);
    
    // 渲染 UI
    this.renderUI();
  }
  
  handleIncrementalSync(message: any) {
    console.log('Received incremental sync');
    
    // 应用增量变更
    const changes = message.changes.map((c: number[]) => new Uint8Array(c));
    this.globalDoc = Automerge.applyChanges(this.globalDoc, changes);
    
    // 更新 UI
    this.renderUI();
  }
  
  handleError(message: any) {
    console.error('Server error:', message.message);
    alert(`错误: ${message.message}`);
  }
  
  // ===== 用户操作 =====
  
  async createWork(title: string, description: string) {
    this.sendMessage({
      type: 'create_work',
      data: { title, description }
    });
  }
  
  async updateWork(workId: string, updates: Partial<Work>) {
    // 本地权限检查（快速反馈）
    if (!this.canEdit(workId)) {
      alert('您没有编辑此作品的权限');
      return;
    }
    
    this.sendMessage({
      type: 'update_work',
      workId,
      data: updates
    });
  }
  
  async deleteWork(workId: string) {
    const work = this.globalDoc.works.find(w => w.id === workId);
    if (!work) return;
    
    if (work.authorId !== this.currentUserId) {
      alert('只有作者可以删除作品');
      return;
    }
    
    if (!confirm('确定要删除这个作品吗？')) {
      return;
    }
    
    this.sendMessage({
      type: 'delete_work',
      workId
    });
  }
  
  async createChapter(workId: string, title: string) {
    if (!this.canEdit(workId)) {
      alert('您没有编辑权限');
      return;
    }
    
    this.sendMessage({
      type: 'create_chapter',
      workId,
      data: { title, content: '', order: this.getNextChapterOrder(workId) }
    });
  }
  
  async updateChapter(chapterId: string, updates: Partial<Chapter>) {
    const chapter = this.globalDoc.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    if (!this.canEdit(chapter.workId)) {
      alert('您没有编辑权限');
      return;
    }
    
    this.sendMessage({
      type: 'update_chapter',
      data: { chapterId, ...updates }
    });
  }
  
  async inviteCollaborator(workId: string, collaboratorId: string) {
    const work = this.globalDoc.works.find(w => w.id === workId);
    if (!work) return;
    
    if (work.authorId !== this.currentUserId) {
      alert('只有作者可以邀请协作者');
      return;
    }
    
    this.sendMessage({
      type: 'invite_collaborator',
      workId,
      data: { collaboratorId }
    });
  }
  
  sendMessage(message: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }
    
    this.ws.send(JSON.stringify(message));
  }
  
  // ===== 权限检查 =====
  
  canEdit(workId: string): boolean {
    const work = this.globalDoc.works.find(w => w.id === workId);
    if (!work) return false;
    
    return work.authorId === this.currentUserId || 
           work.editors?.includes(this.currentUserId);
  }
  
  isAuthor(workId: string): boolean {
    const work = this.globalDoc.works.find(w => w.id === workId);
    return work?.authorId === this.currentUserId;
  }
  
  // ===== UI 渲染 =====
  
  renderUI() {
    this.renderWorkList();
  }
  
  renderWorkList() {
    const container = document.getElementById('work-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 渲染所有作品（公开可见）
    for (const work of this.globalDoc.works) {
      const workElement = this.createWorkElement(work);
      container.appendChild(workElement);
    }
  }
  
  createWorkElement(work: Work): HTMLElement {
    const div = document.createElement('div');
    div.className = 'work-item';
    
    const canEdit = this.canEdit(work.id);
    const isAuthor = this.isAuthor(work.id);
    
    div.innerHTML = `
      <h3>${work.title}</h3>
      <p>${work.description}</p>
      <div class="meta">
        <span>作者: ${work.authorId}</span>
        <span>更新: ${new Date(work.updatedAt).toLocaleString()}</span>
      </div>
      <div class="actions">
        ${canEdit ? `
          <button class="edit-btn" data-id="${work.id}">编辑</button>
        ` : `
          <span class="read-only-badge">只读</span>
        `}
        ${isAuthor ? `
          <button class="delete-btn" data-id="${work.id}">删除</button>
          <button class="invite-btn" data-id="${work.id}">邀请协作者</button>
        ` : ''}
      </div>
    `;
    
    // 绑定事件
    if (canEdit) {
      div.querySelector('.edit-btn')?.addEventListener('click', () => {
        this.openWorkEditor(work.id);
      });
    }
    
    if (isAuthor) {
      div.querySelector('.delete-btn')?.addEventListener('click', () => {
        this.deleteWork(work.id);
      });
      
      div.querySelector('.invite-btn')?.addEventListener('click', () => {
        this.showInviteDialog(work.id);
      });
    }
    
    return div;
  }
  
  openWorkEditor(workId: string) {
    // 打开编辑器
    console.log('Opening editor for', workId);
    // 实际实现...
  }
  
  showInviteDialog(workId: string) {
    const collaboratorId = prompt('请输入要邀请的用户 ID:');
    if (collaboratorId) {
      this.inviteCollaborator(workId, collaboratorId);
    }
  }
  
  getNextChapterOrder(workId: string): number {
    const chapters = this.globalDoc.chapters.filter(c => c.workId === workId);
    return chapters.length > 0 
      ? Math.max(...chapters.map(c => c.order)) + 1 
      : 0;
  }
}

// 初始化客户端
const token = localStorage.getItem('auth_token');
const userId = localStorage.getItem('user_id');

if (token && userId) {
  const syncClient = new GlobalSyncClient(userId, token);
  
  // 暴露到全局，方便调试
  (window as any).syncClient = syncClient;
}
```

---

## 📈 性能优化策略

### 1. 延迟加载章节内容

```typescript
// 元数据同步，内容按需加载
interface ChapterMetadata {
  id: string;
  title: string;
  workId: string;
  order: number;
  // 不包含 content
}

class OptimizedSync {
  private globalDoc: Automerge.Doc<{
    works: Work[];
    chapters: ChapterMetadata[];  // 只有元数据
  }>;
  
  private chapterContentCache: Map<string, string> = new Map();
  
  async loadChapterContent(chapterId: string): Promise<string> {
    if (this.chapterContentCache.has(chapterId)) {
      return this.chapterContentCache.get(chapterId)!;
    }
    
    // 从服务器按需加载
    const response = await fetch(`/api/chapters/${chapterId}/content`);
    const content = await response.text();
    
    this.chapterContentCache.set(chapterId, content);
    return content;
  }
}
```

### 2. 虚拟滚动

```typescript
class VirtualScrollList {
  private visibleRange = { start: 0, end: 20 };
  
  renderWorkList() {
    // 只渲染可见区域的作品
    const visibleWorks = this.globalDoc.works.slice(
      this.visibleRange.start,
      this.visibleRange.end
    );
    
    for (const work of visibleWorks) {
      this.renderWork(work);
    }
  }
  
  onScroll(scrollTop: number) {
    // 更新可见范围
    this.visibleRange.start = Math.floor(scrollTop / 100);
    this.visibleRange.end = this.visibleRange.start + 20;
    
    this.renderWorkList();
  }
}
```

### 3. 增量更新 UI

```typescript
class IncrementalUI {
  handleIncrementalSync(changes: Uint8Array[]) {
    const oldDoc = this.globalDoc;
    this.globalDoc = Automerge.applyChanges(this.globalDoc, changes);
    
    // 计算差异
    const patches = Automerge.diff(oldDoc, this.globalDoc);
    
    // 只更新变化的部分
    for (const patch of patches) {
      if (patch.path[0] === 'works') {
        const workId = patch.path[1];
        this.updateWorkElement(workId);
      }
    }
  }
  
  updateWorkElement(workId: string) {
    const work = this.globalDoc.works.find(w => w.id === workId);
    const element = document.querySelector(`[data-work-id="${workId}"]`);
    
    if (element && work) {
      // 只更新这一个元素
      element.querySelector('.title').textContent = work.title;
      element.querySelector('.description').textContent = work.description;
    }
  }
}
```

---

## 🔒 安全与隐私

### 1. 端到端加密（可选）

```typescript
// 如果需要隐私保护
class EncryptedSync {
  async createWork(title: string) {
    // 加密敏感数据
    const encrypted = await this.encrypt(title);
    
    this.sendMessage({
      type: 'create_work',
      data: {
        title: encrypted,  // 服务器看不到明文
        encryptedFor: this.getCollaborators()
      }
    });
  }
  
  async decrypt(encrypted: string): Promise<string> {
    // 使用用户的私钥解密
    // ...
  }
}
```

### 2. 审计日志

```typescript
// 服务器端记录所有操作
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  workId: string;
  timestamp: number;
  details: any;
}

class AuditService {
  async logAction(log: AuditLog) {
    await prisma.auditLog.create({ data: log });
  }
  
  async getWorkHistory(workId: string) {
    return await prisma.auditLog.findMany({
      where: { workId },
      orderBy: { timestamp: 'desc' }
    });
  }
}
```

---

## 🎓 总结

### ✅ 完全符合您的需求

```typescript
特性检查表:
✅ 所有用户都能看到所有作品（公开可见）
✅ 只有授权用户能编辑（权限控制）
✅ 编辑内容实时广播给所有人（全局同步）
✅ 服务器验证权限（安全）
✅ Automerge CRDT（自动合并冲突）
✅ 离线查看（客户端有完整副本）
✅ 在线编辑（通过服务器验证）

数据流：
用户 A（有权限）→ 编辑作品
    ↓
发送到服务器 → 验证权限
    ↓
应用到全局 Automerge 文档
    ↓
广播给所有在线用户（B、C、D...）
    ↓
所有人的 UI 自动更新 ✅
```

### 实施步骤

1. **第1周**：实现服务器端（权限验证 + Automerge）
2. **第2周**：实现客户端（WebSocket + UI）
3. **第3周**：性能优化（虚拟滚动 + 增量更新）
4. **第4周**：测试和部署

需要我开始实现第1周的服务器端代码吗？
