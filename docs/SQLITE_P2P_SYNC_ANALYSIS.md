# SQLite P2P 去中心化同步：实施方案与复杂度评估

## 🎯 核心问题

```
问题：如何让多个设备上的 SQLite 数据库通过 P2P 自动同步？

挑战：
├── SQLite 是单文件数据库（不是为分布式设计）
├── SQL 操作不是 CRDT（可能冲突）
├── 需要处理并发写入
├── 需要保证数据一致性
└── 需要处理网络分区

现有方案对比：
❌ IceFireDB-SQLite - SQL 广播，无冲突解决
❌ 直接同步 .db 文件 - 最后写入覆盖，数据丢失
✅ CRDT 层 + SQLite - 本方案
✅ 专业方案（ElectricSQL、CR-SQLite）
```

---

## 📊 方案对比与复杂度评估

### 方案 1：直接 SQL 复制（最简单但不可靠）⚠️

#### 原理
```
设备 A: INSERT INTO works VALUES (...)
    ↓
广播 SQL 语句
    ↓
设备 B、C: 执行相同的 SQL
```

#### 实施步骤
```typescript
// 1. 拦截 SQL 执行
const originalRun = db.run;
db.run = function(sql, params, callback) {
  // 本地执行
  originalRun.call(this, sql, params, callback);
  
  // 广播给其他节点
  if (isDML(sql)) {
    p2pNetwork.broadcast({ sql, params });
  }
};

// 2. 接收并执行
p2pNetwork.on('sql', ({ sql, params }) => {
  db.run(sql, params);
});
```

#### 复杂度
- **实施难度**: ⭐ (1/5) - 非常简单
- **代码量**: ~200 行
- **实施时间**: 1-2 天

#### 问题
```
❌ 自增 ID 冲突
   设备 A: INSERT → ID = 1
   设备 B: INSERT → ID = 1  (冲突！)

❌ 无冲突解决
   设备 A: UPDATE works SET title='A' WHERE id=1
   设备 B: UPDATE works SET title='B' WHERE id=1
   结果：依赖到达顺序，不确定

❌ 事务完整性
   设备 A: BEGIN; INSERT INTO works; INSERT INTO chapters; COMMIT;
   消息可能乱序到达

❌ DELETE 不可恢复
   设备 A 离线编辑 ID=1
   设备 B 删除 ID=1
   设备 A 上线 → 编辑丢失

结论：不推荐用于生产环境
```

---

### 方案 2：操作日志 + 向量时钟（中等复杂度）⭐⭐⭐

#### 原理
```
不直接同步 SQL，而是同步"操作日志"
每个操作带版本号和因果关系
```

#### 数据模型
```sql
-- 操作日志表
CREATE TABLE sync_log (
  id TEXT PRIMARY KEY,      -- ULID
  device_id TEXT NOT NULL,  -- 设备标识
  operation TEXT NOT NULL,  -- 'insert', 'update', 'delete'
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,  -- 被操作的记录 ID
  data TEXT,                -- JSON 格式的数据
  version TEXT NOT NULL,    -- 向量时钟 {"device1": 5, "device2": 3}
  timestamp INTEGER NOT NULL,
  signature TEXT            -- 可选：签名验证
);

-- 为每个业务表添加元数据
ALTER TABLE works ADD COLUMN version TEXT;  -- 向量时钟
ALTER TABLE works ADD COLUMN updated_by TEXT;
ALTER TABLE works ADD COLUMN deleted_at INTEGER;  -- 软删除
```

#### 实施代码
```typescript
// ===== 向量时钟 =====
class VectorClock {
  private clock: Map<string, number> = new Map();
  
  increment(deviceId: string) {
    const current = this.clock.get(deviceId) || 0;
    this.clock.set(deviceId, current + 1);
  }
  
  merge(other: VectorClock) {
    for (const [deviceId, version] of other.clock) {
      const current = this.clock.get(deviceId) || 0;
      this.clock.set(deviceId, Math.max(current, version));
    }
  }
  
  happenedBefore(other: VectorClock): boolean {
    let atLeastOneLess = false;
    
    for (const [deviceId, version] of this.clock) {
      const otherVersion = other.clock.get(deviceId) || 0;
      if (version > otherVersion) return false;
      if (version < otherVersion) atLeastOneLess = true;
    }
    
    return atLeastOneLess;
  }
  
  isConcurrent(other: VectorClock): boolean {
    return !this.happenedBefore(other) && !other.happenedBefore(this);
  }
  
  toString(): string {
    return JSON.stringify(Object.fromEntries(this.clock));
  }
  
  static fromString(str: string): VectorClock {
    const vc = new VectorClock();
    const obj = JSON.parse(str);
    vc.clock = new Map(Object.entries(obj));
    return vc;
  }
}

// ===== SQLite 同步层 =====
class SQLiteSyncLayer {
  private db: Database;
  private deviceId: string;
  private vectorClock: VectorClock;
  private p2pNetwork: P2PNetwork;
  
  constructor(dbPath: string, deviceId: string) {
    this.db = new Database(dbPath);
    this.deviceId = deviceId;
    this.vectorClock = new VectorClock();
    this.initSyncTables();
  }
  
  initSyncTables() {
    // 创建同步日志表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT,
        version TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        applied INTEGER DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS idx_sync_log_applied 
        ON sync_log(applied, timestamp);
    `);
  }
  
  // ===== 插入操作 =====
  async insert(table: string, data: any): Promise<string> {
    const recordId = this.generateId();
    
    // 1. 更新向量时钟
    this.vectorClock.increment(this.deviceId);
    
    // 2. 准备数据
    const dataWithMeta = {
      ...data,
      id: recordId,
      version: this.vectorClock.toString(),
      updated_by: this.deviceId,
      created_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null
    };
    
    // 3. 插入到业务表
    const columns = Object.keys(dataWithMeta).join(', ');
    const placeholders = Object.keys(dataWithMeta).map(() => '?').join(', ');
    const values = Object.values(dataWithMeta);
    
    this.db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
      .run(...values);
    
    // 4. 记录操作日志
    const logId = this.generateId();
    this.db.prepare(`
      INSERT INTO sync_log (id, device_id, operation, table_name, record_id, 
                           data, version, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      this.deviceId,
      'insert',
      table,
      recordId,
      JSON.stringify(dataWithMeta),
      this.vectorClock.toString(),
      Date.now()
    );
    
    // 5. 广播操作
    await this.broadcastOperation({
      id: logId,
      deviceId: this.deviceId,
      operation: 'insert',
      tableName: table,
      recordId,
      data: dataWithMeta,
      version: this.vectorClock.toString(),
      timestamp: Date.now()
    });
    
    return recordId;
  }
  
  // ===== 更新操作 =====
  async update(table: string, recordId: string, updates: any): Promise<void> {
    // 1. 读取当前版本
    const current = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`)
      .get(recordId) as any;
    
    if (!current) {
      throw new Error('Record not found');
    }
    
    const currentVersion = VectorClock.fromString(current.version);
    
    // 2. 更新向量时钟
    this.vectorClock.merge(currentVersion);
    this.vectorClock.increment(this.deviceId);
    
    // 3. 更新数据
    const updatedData = {
      ...updates,
      version: this.vectorClock.toString(),
      updated_by: this.deviceId,
      updated_at: Date.now()
    };
    
    const setClause = Object.keys(updatedData)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(updatedData), recordId];
    
    this.db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`)
      .run(...values);
    
    // 4. 记录操作日志
    const logId = this.generateId();
    this.db.prepare(`
      INSERT INTO sync_log (id, device_id, operation, table_name, record_id,
                           data, version, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      this.deviceId,
      'update',
      table,
      recordId,
      JSON.stringify({ id: recordId, ...updatedData }),
      this.vectorClock.toString(),
      Date.now()
    );
    
    // 5. 广播
    await this.broadcastOperation({
      id: logId,
      deviceId: this.deviceId,
      operation: 'update',
      tableName: table,
      recordId,
      data: { id: recordId, ...updatedData },
      version: this.vectorClock.toString(),
      timestamp: Date.now()
    });
  }
  
  // ===== 删除操作（软删除） =====
  async delete(table: string, recordId: string): Promise<void> {
    // 软删除，不真正删除数据
    await this.update(table, recordId, {
      deleted_at: Date.now()
    });
  }
  
  // ===== 接收远程操作 =====
  async receiveOperation(op: any): Promise<void> {
    console.log(`Received ${op.operation} from ${op.deviceId}`);
    
    // 1. 检查是否已应用
    const existing = this.db.prepare(
      'SELECT id FROM sync_log WHERE id = ?'
    ).get(op.id);
    
    if (existing) {
      console.log('Operation already applied');
      return;
    }
    
    // 2. 记录到日志
    this.db.prepare(`
      INSERT INTO sync_log (id, device_id, operation, table_name, record_id,
                           data, version, timestamp, applied)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      op.id,
      op.deviceId,
      op.operation,
      op.tableName,
      op.recordId,
      JSON.stringify(op.data),
      op.version,
      op.timestamp
    );
    
    // 3. 应用操作
    await this.applyOperation(op);
    
    // 4. 更新向量时钟
    const remoteVersion = VectorClock.fromString(op.version);
    this.vectorClock.merge(remoteVersion);
  }
  
  async applyOperation(op: any): Promise<void> {
    const { operation, tableName, recordId, data, version } = op;
    
    switch (operation) {
      case 'insert':
        await this.applyInsert(tableName, data);
        break;
        
      case 'update':
        await this.applyUpdate(tableName, recordId, data, version);
        break;
        
      case 'delete':
        await this.applyDelete(tableName, recordId, version);
        break;
    }
    
    // 标记为已应用
    this.db.prepare('UPDATE sync_log SET applied = 1 WHERE id = ?')
      .run(op.id);
  }
  
  async applyInsert(table: string, data: any): Promise<void> {
    // 检查是否已存在
    const existing = this.db.prepare(`SELECT id FROM ${table} WHERE id = ?`)
      .get(data.id);
    
    if (existing) {
      // 已存在，可能是并发插入，使用 update 逻辑
      await this.applyUpdate(table, data.id, data, data.version);
      return;
    }
    
    // 插入
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    this.db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`)
      .run(...values);
  }
  
  async applyUpdate(table: string, recordId: string, data: any, version: string): Promise<void> {
    // 读取当前版本
    const current = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`)
      .get(recordId) as any;
    
    if (!current) {
      // 记录不存在，转为插入
      await this.applyInsert(table, data);
      return;
    }
    
    // 检查版本关系
    const currentVersion = VectorClock.fromString(current.version);
    const remoteVersion = VectorClock.fromString(version);
    
    if (remoteVersion.happenedBefore(currentVersion)) {
      // 远程版本更旧，忽略
      console.log('Remote version is older, ignoring');
      return;
    }
    
    if (currentVersion.happenedBefore(remoteVersion)) {
      // 远程版本更新，直接应用
      const setClause = Object.keys(data)
        .filter(key => key !== 'id')
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [
        ...Object.keys(data).filter(key => key !== 'id').map(key => data[key]),
        recordId
      ];
      
      this.db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`)
        .run(...values);
      return;
    }
    
    // 并发修改，需要合并
    await this.mergeConflict(table, recordId, current, data, currentVersion, remoteVersion);
  }
  
  async applyDelete(table: string, recordId: string, version: string): Promise<void> {
    const current = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`)
      .get(recordId) as any;
    
    if (!current) return;
    
    const currentVersion = VectorClock.fromString(current.version);
    const remoteVersion = VectorClock.fromString(version);
    
    if (!remoteVersion.happenedBefore(currentVersion)) {
      // 应用删除
      this.db.prepare(`UPDATE ${table} SET deleted_at = ? WHERE id = ?`)
        .run(Date.now(), recordId);
    }
  }
  
  // ===== 冲突合并（LWW 策略） =====
  async mergeConflict(
    table: string,
    recordId: string,
    local: any,
    remote: any,
    localVersion: VectorClock,
    remoteVersion: VectorClock
  ): Promise<void> {
    console.log('Concurrent modification detected, merging...');
    
    // Last-Write-Wins 策略：比较时间戳
    const useRemote = remote.updated_at > local.updated_at;
    
    if (useRemote) {
      // 使用远程版本
      const merged = {
        ...remote,
        version: this.mergeVectorClocks(localVersion, remoteVersion).toString()
      };
      
      const setClause = Object.keys(merged)
        .filter(key => key !== 'id')
        .map(key => `${key} = ?`)
        .join(', ');
      const values = [
        ...Object.keys(merged).filter(key => key !== 'id').map(key => merged[key]),
        recordId
      ];
      
      this.db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`)
        .run(...values);
    } else {
      // 保留本地版本，但更新向量时钟
      const merged = {
        version: this.mergeVectorClocks(localVersion, remoteVersion).toString()
      };
      
      this.db.prepare(`UPDATE ${table} SET version = ? WHERE id = ?`)
        .run(merged.version, recordId);
    }
  }
  
  mergeVectorClocks(v1: VectorClock, v2: VectorClock): VectorClock {
    const merged = new VectorClock();
    merged.clock = new Map(v1.clock);
    
    for (const [deviceId, version] of v2.clock) {
      const current = merged.clock.get(deviceId) || 0;
      merged.clock.set(deviceId, Math.max(current, version));
    }
    
    return merged;
  }
  
  // ===== P2P 广播 =====
  async broadcastOperation(op: any): Promise<void> {
    await this.p2pNetwork.broadcast({
      type: 'sqlite-operation',
      operation: op
    });
  }
  
  // ===== 查询接口（隐藏已删除） =====
  query(sql: string, params: any[] = []): any[] {
    // 自动过滤已删除的记录
    const modifiedSql = this.addDeletedFilter(sql);
    return this.db.prepare(modifiedSql).all(...params);
  }
  
  addDeletedFilter(sql: string): string {
    // 简单实现：在 WHERE 子句中添加 deleted_at IS NULL
    // 实际应该用 SQL 解析器
    if (sql.toLowerCase().includes('where')) {
      return sql.replace(/where/i, 'WHERE deleted_at IS NULL AND');
    } else if (sql.toLowerCase().includes('from')) {
      return sql.replace(/from\s+(\w+)/i, 'FROM $1 WHERE deleted_at IS NULL');
    }
    return sql;
  }
  
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
```

#### 使用示例
```typescript
// 初始化
const sync = new SQLiteSyncLayer('myapp.db', 'device-abc123');

// 插入（自动同步）
const workId = await sync.insert('works', {
  title: '我的小说',
  description: '描述',
  author_id: 'user1'
});

// 更新（自动同步）
await sync.update('works', workId, {
  title: '修改后的标题'
});

// 查询（自动过滤已删除）
const works = sync.query('SELECT * FROM works');

// 接收远程操作
p2pNetwork.on('sqlite-operation', async (data) => {
  await sync.receiveOperation(data.operation);
});
```

#### 复杂度
- **实施难度**: ⭐⭐⭐ (3/5) - 中等
- **代码量**: ~1000-1500 行
- **实施时间**: 2-3 周
- **维护成本**: 中等

#### 优势
```
✅ 向量时钟追踪因果关系
✅ 软删除避免数据丢失
✅ LWW 冲突解决
✅ 操作日志可追溯
✅ 支持离线编辑
```

#### 劣势
```
⚠️ 需要修改 schema（添加元数据字段）
⚠️ 需要包装所有数据库操作
⚠️ LWW 可能丢失并发修改
⚠️ 不支持复杂事务
⚠️ 需要定期清理日志
```

---

### 方案 3：Automerge + SQLite（推荐）⭐⭐⭐⭐

#### 原理
```
不直接同步 SQLite，而是：
Automerge (CRDT) → 主数据源
SQLite → 只读快照（用于查询）
```

#### 架构
```typescript
┌─────────────────────────────────┐
│   Automerge 文档（主数据）       │
│   • works: [...]                │
│   • chapters: [...]             │
│   • 自动冲突解决                │
│   • 完整历史                    │
└──────────┬──────────────────────┘
           │
           ↓ 单向同步
┌──────────────────────────────────┐
│   SQLite 数据库（只读快照）       │
│   • 用于复杂查询                 │
│   • 用于全文搜索                 │
│   • 不直接修改                   │
└──────────────────────────────────┘

数据流：
用户操作 → Automerge → P2P 同步 → 更新 SQLite 快照
```

#### 实施代码
```typescript
// ===== Automerge + SQLite 集成 =====
import * as Automerge from '@automerge/automerge';
import Database from 'better-sqlite3';

interface AppData {
  works: Work[];
  chapters: Chapter[];
  users: User[];
}

class AutomergeSQLiteSync {
  private doc: Automerge.Doc<AppData>;
  private db: Database.Database;
  private p2pNetwork: P2PNetwork;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initTables();
    this.loadDoc();
  }
  
  initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS works (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        author_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS chapters (
        id TEXT PRIMARY KEY,
        work_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        "order" INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (work_id) REFERENCES works(id)
      );
      
      -- 全文搜索
      CREATE VIRTUAL TABLE IF NOT EXISTS works_fts 
        USING fts5(title, description, content=works);
    `);
  }
  
  loadDoc() {
    // 从磁盘加载 Automerge 文档
    try {
      const fs = require('fs');
      const binary = fs.readFileSync('data/automerge-doc.bin');
      this.doc = Automerge.load<AppData>(binary);
    } catch (error) {
      this.doc = Automerge.from<AppData>({
        works: [],
        chapters: [],
        users: []
      });
      
      // 从 SQLite 导入初始数据
      this.importFromSQLite();
    }
  }
  
  // ===== 创建作品 =====
  async createWork(data: Omit<Work, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const workId = this.generateId();
    
    // 1. 修改 Automerge 文档
    this.doc = Automerge.change(this.doc, 'Create work', doc => {
      doc.works.push({
        id: workId,
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deletedAt: null
      });
    });
    
    // 2. 同步到 SQLite
    this.syncWorkToSQLite(workId);
    
    // 3. P2P 广播
    await this.broadcastChanges();
    
    return workId;
  }
  
  // ===== 更新作品 =====
  async updateWork(workId: string, updates: Partial<Work>): Promise<void> {
    this.doc = Automerge.change(this.doc, 'Update work', doc => {
      const work = doc.works.find(w => w.id === workId);
      if (!work) return;
      
      Object.assign(work, updates);
      work.updatedAt = Date.now();
    });
    
    this.syncWorkToSQLite(workId);
    await this.broadcastChanges();
  }
  
  // ===== 同步到 SQLite =====
  syncWorkToSQLite(workId: string) {
    const work = this.doc.works.find(w => w.id === workId);
    if (!work) return;
    
    // Upsert 到 SQLite
    this.db.prepare(`
      INSERT INTO works (id, title, description, author_id, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at
    `).run(
      work.id,
      work.title,
      work.description,
      work.authorId,
      work.createdAt,
      work.updatedAt,
      work.deletedAt
    );
    
    // 更新全文搜索索引
    this.db.prepare(`
      INSERT INTO works_fts (rowid, title, description)
      VALUES ((SELECT rowid FROM works WHERE id = ?), ?, ?)
      ON CONFLICT(rowid) DO UPDATE SET
        title = excluded.title,
        description = excluded.description
    `).run(work.id, work.title, work.description);
  }
  
  // ===== 全量同步 =====
  syncAllToSQLite() {
    this.db.prepare('BEGIN').run();
    
    try {
      // 清空现有数据
      this.db.prepare('DELETE FROM works').run();
      this.db.prepare('DELETE FROM chapters').run();
      
      // 同步所有作品
      for (const work of this.doc.works) {
        this.syncWorkToSQLite(work.id);
      }
      
      // 同步所有章节
      for (const chapter of this.doc.chapters) {
        this.syncChapterToSQLite(chapter.id);
      }
      
      this.db.prepare('COMMIT').run();
    } catch (error) {
      this.db.prepare('ROLLBACK').run();
      throw error;
    }
  }
  
  syncChapterToSQLite(chapterId: string) {
    const chapter = this.doc.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    this.db.prepare(`
      INSERT INTO chapters (id, work_id, title, content, "order", created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        "order" = excluded."order",
        updated_at = excluded.updated_at
    `).run(
      chapter.id,
      chapter.workId,
      chapter.title,
      chapter.content,
      chapter.order,
      chapter.createdAt,
      chapter.updatedAt
    );
  }
  
  // ===== 查询（从 SQLite） =====
  queryWorks(sql: string = 'SELECT * FROM works WHERE deleted_at IS NULL'): Work[] {
    return this.db.prepare(sql).all() as Work[];
  }
  
  fullTextSearch(query: string): Work[] {
    return this.db.prepare(`
      SELECT works.* FROM works
      JOIN works_fts ON works.rowid = works_fts.rowid
      WHERE works_fts MATCH ?
      ORDER BY rank
    `).all(query) as Work[];
  }
  
  // ===== P2P 同步 =====
  async broadcastChanges() {
    const changes = Automerge.getLastLocalChange(this.doc);
    if (changes) {
      await this.p2pNetwork.broadcast({
        type: 'automerge-changes',
        changes: Array.from(changes)
      });
    }
    
    this.saveDoc();
  }
  
  async receiveChanges(changes: Uint8Array) {
    const oldDoc = this.doc;
    this.doc = Automerge.applyChanges(this.doc, [changes]);
    
    // 计算差异并更新 SQLite
    const patches = Automerge.diff(oldDoc, this.doc);
    this.applyPatchesToSQLite(patches);
    
    this.saveDoc();
  }
  
  applyPatchesToSQLite(patches: any[]) {
    for (const patch of patches) {
      if (patch.path[0] === 'works') {
        const workIndex = patch.path[1];
        const work = this.doc.works[workIndex];
        if (work) {
          this.syncWorkToSQLite(work.id);
        }
      } else if (patch.path[0] === 'chapters') {
        const chapterIndex = patch.path[1];
        const chapter = this.doc.chapters[chapterIndex];
        if (chapter) {
          this.syncChapterToSQLite(chapter.id);
        }
      }
    }
  }
  
  saveDoc() {
    const binary = Automerge.save(this.doc);
    const fs = require('fs');
    fs.writeFileSync('data/automerge-doc.bin', binary);
  }
  
  importFromSQLite() {
    // 首次启动时从 SQLite 导入数据
    const works = this.db.prepare('SELECT * FROM works').all();
    const chapters = this.db.prepare('SELECT * FROM chapters').all();
    
    this.doc = Automerge.change(this.doc, 'Import from SQLite', doc => {
      doc.works = works as any;
      doc.chapters = chapters as any;
    });
  }
  
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
```

#### 使用示例
```typescript
const sync = new AutomergeSQLiteSync('myapp.db');

// 创建（修改 Automerge，自动同步到 SQLite）
const workId = await sync.createWork({
  title: '我的小说',
  authorId: 'user1'
});

// 查询（从 SQLite，快速）
const works = sync.queryWorks();

// 全文搜索（SQLite FTS5）
const results = sync.fullTextSearch('小说');

// P2P 同步（自动）
p2pNetwork.on('automerge-changes', async (data) => {
  await sync.receiveChanges(new Uint8Array(data.changes));
});
```

#### 复杂度
- **实施难度**: ⭐⭐⭐⭐ (4/5) - 中高
- **代码量**: ~800-1000 行
- **实施时间**: 2-3 周
- **维护成本**: 低（利用 Automerge 的成熟方案）

#### 优势
```
✅ 自动冲突解决（Automerge CRDT）
✅ 完整操作历史
✅ SQLite 用于快速查询
✅ 全文搜索支持
✅ 不需要修改现有 schema
✅ 数据一致性保证
```

#### 劣势
```
⚠️ 需要维护两份数据（Automerge + SQLite）
⚠️ 内存占用较大（Automerge 文档在内存中）
⚠️ 大数据量需要分片
```

---

### 方案 4：专业方案（CR-SQLite / ElectricSQL）⭐⭐⭐⭐⭐

#### CR-SQLite（Conflict-free Replicated SQLite）

```bash
# SQLite 扩展，原生支持 CRDT
# 由 Vlcn.io 开发

npm install @vlcn.io/crsqlite-wasm
```

```typescript
import { DB } from '@vlcn.io/crsqlite-wasm';

const db = await DB.open('myapp.db');

// 标记表为 CRDT
await db.exec("SELECT crsql_as_crr('works')");

// 正常使用 SQL，自动 CRDT 化
await db.exec(`
  INSERT INTO works (id, title, author_id)
  VALUES ('w1', 'My Novel', 'user1')
`);

// 获取变更集
const changes = await db.execA('SELECT * FROM crsql_changes');

// 应用远程变更
await db.exec('INSERT INTO crsql_changes VALUES (...)');

// 自动合并冲突！
```

#### 复杂度
- **实施难度**: ⭐⭐ (2/5) - 简单（使用现成方案）
- **代码量**: ~300-500 行（只需集成）
- **实施时间**: 3-5 天
- **维护成本**: 很低

#### 优势
```
✅ 原生 SQLite，无需额外数据结构
✅ 自动 CRDT，无需手动处理冲突
✅ 性能优秀
✅ 成熟稳定
✅ 支持复杂查询
```

#### 劣势
```
⚠️ 需要 SQLite 扩展（WASM 或原生）
⚠️ 文档相对较少
⚠️ 社区较小
```

---

## 📊 复杂度总结表

| 方案 | 实施难度 | 代码量 | 实施时间 | 可靠性 | 性能 | 推荐度 |
|------|---------|--------|---------|--------|------|--------|
| **方案1: 直接SQL复制** | ⭐ | 200行 | 1-2天 | ❌ 低 | ⭐⭐⭐⭐⭐ | ❌ 不推荐 |
| **方案2: 操作日志+向量时钟** | ⭐⭐⭐ | 1500行 | 2-3周 | ⭐⭐⭐ 中 | ⭐⭐⭐⭐ | ⚠️ 可用 |
| **方案3: Automerge+SQLite** | ⭐⭐⭐⭐ | 1000行 | 2-3周 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐ | ✅ 推荐 |
| **方案4: CR-SQLite** | ⭐⭐ | 500行 | 3-5天 | ⭐⭐⭐⭐⭐ 很高 | ⭐⭐⭐⭐⭐ | ⭐ 最佳 |

---

## 🎯 最终建议

### 短期方案（1-2周内）：Automerge + SQLite

```typescript
原因：
✅ 平衡了复杂度和可靠性
✅ 利用 Automerge 的成熟 CRDT 实现
✅ SQLite 只做快照，简化问题
✅ 可以渐进式实现

实施步骤：
Week 1:
  - 集成 Automerge
  - 实现基本 CRUD（作品、章节）
  - Automerge → SQLite 单向同步

Week 2:
  - 集成 P2P 网络
  - 实现增量同步
  - 测试多设备同步
```

### 长期方案（1-2个月后）：CR-SQLite

```typescript
原因：
✅ 原生 SQLite，无需维护两份数据
✅ 性能最优
✅ 最符合去中心化理念

迁移路径：
Phase 1: 使用 Automerge 验证可行性
Phase 2: 评估 CR-SQLite
Phase 3: 逐步迁移到 CR-SQLite
```

### 核心代码量估算

```
核心同步层: ~800 行
P2P 网络: ~300 行
UI 集成: ~200 行
测试: ~500 行
-----------------
总计: ~1800 行

实施时间: 2-3 周（全职）
```

---

## 💡 关键要点

1. **不要直接同步 SQL** - 会有各种冲突和不一致
2. **使用 CRDT** - 自动解决冲突的数学保证
3. **SQLite 作为快照** - 不要作为同步的主体
4. **渐进式实施** - 先用 Automerge 验证，再考虑 CR-SQLite

需要我开始实现 Automerge + SQLite 方案吗？
