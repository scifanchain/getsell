# IceFireDB-SQLite 集成方案

## 目标
将 better-sqlite3 替换为 IceFireDB-SQLite，实现数据库级别的 P2P 去中心化同步。

## 架构设计

### 两层同步架构
```
┌──────────────────────────────────────────────────────┐
│ Layer 1: 实时编辑同步（Yjs）                          │
│ - ProseMirror + Yjs.Doc                              │
│ - WebRTC/WebSocket 传输                              │
│ - CRDT 自动冲突解决                                   │
│ - 毫秒级实时同步                                      │
└──────────────────────────────────────────────────────┘
                      ↓ 用户点击保存
┌──────────────────────────────────────────────────────┐
│ Layer 2: 数据库持久化同步（IceFireDB-SQLite）         │
│ - Prisma ORM                                         │
│ - IceFireDB-SQLite (MySQL 协议)                      │
│ - P2P 网络自动同步                                    │
│ - SQL 命令广播到所有节点                              │
└──────────────────────────────────────────────────────┘
```

## 实施步骤

### Step 1: 部署 IceFireDB-SQLite 服务

#### 1.1 下载和编译
```bash
# 克隆仓库
cd d:/gestell
git clone https://github.com/IceFireDB/IceFireDB.git
cd IceFireDB/IceFireDB-SQLite

# 编译
make build

# 生成可执行文件: bin/IceFireDB-SQLite
```

#### 1.2 配置文件
创建 `config/config.yaml`:
```yaml
server:
  addr: ":23306" # MySQL 协议监听端口

sqlite:
  filename: "D:/gestell/data/gestell.db" # 复用现有数据库文件

debug:
  enable: false
  port: 17878

# P2P 配置
p2p:
  enable: true
  service_discovery_id: "gestell_p2p_network"
  service_command_topic: "gestell_db_sync"
  service_discover_mode: "advertise" # 或 "announce"
  node_host_ip: "0.0.0.0" # 监听所有网络接口
  node_host_port: 4001
```

#### 1.3 启动服务
```bash
# 在 IceFireDB-SQLite 目录
./bin/IceFireDB-SQLite -c config/config.yaml
```

### Step 2: 修改 Prisma 配置

#### 2.1 更新 .env 文件
```env
# 原配置（better-sqlite3）
# DATABASE_URL="file:./data/gestell.db"

# 新配置（IceFireDB-SQLite，MySQL 协议）
DATABASE_URL="mysql://root:123456@127.0.0.1:23306/gestell"
```

#### 2.2 更新 Prisma Schema
**文件**: `prisma/schema.prisma`

```prisma
datasource db {
  provider = "mysql"  // 从 sqlite 改为 mysql
  url      = env("DATABASE_URL")
}

// 模型定义保持不变，但需要调整某些字段类型
generator client {
  provider = "prisma-client-js"
}

model Author {
  id                   String    @id @default(uuid())  // SQLite 用 cuid(), MySQL 用 uuid()
  username             String    @unique
  passwordHash         String?   @map("password_hash")
  displayName          String    @map("display_name")
  email                String?   @unique
  bio                  String?   @db.Text
  // ... 其他字段
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")
  
  @@map("authors")
}

// 其他模型类似调整
```

#### 2.3 数据迁移
```bash
# 1. 生成新的迁移文件
npx prisma migrate dev --name switch_to_icefiredb

# 2. 或者直接推送 schema（开发环境）
npx prisma db push

# 3. 重新生成 Prisma Client
npx prisma generate
```

### Step 3: 调整应用代码

#### 3.1 时间戳类型调整
IceFireDB-SQLite 使用 MySQL 协议，时间戳处理可能不同：

```typescript
// src/utils/timestamp.ts
export function getCurrentTimestamp(): bigint | Date {
  // MySQL 使用 DateTime
  return new Date();
  
  // SQLite 使用 BigInt
  // return BigInt(Date.now());
}
```

#### 3.2 数据库初始化
**文件**: `src/core/DatabaseManager.ts`

```typescript
export class DatabaseManager {
  async connect(): Promise<void> {
    try {
      // 连接到 IceFireDB-SQLite（MySQL 协议）
      await this.prisma.$connect();
      
      console.log('✅ 已连接到 IceFireDB-SQLite (MySQL 协议)');
      console.log('📍 数据库地址:', process.env.DATABASE_URL);
      
      // 测试连接
      await this.prisma.$queryRaw`SELECT 1`;
      console.log('✅ IceFireDB-SQLite 连接测试成功');
      
      // 自动触发 P2P 同步
      console.log('🔄 数据库修改将自动通过 P2P 网络同步');
    } catch (error) {
      console.error('❌ 连接 IceFireDB-SQLite 失败:', error);
      throw error;
    }
  }
}
```

### Step 4: 多设备测试

#### 4.1 设备 A（主设备）
```bash
# 启动 IceFireDB-SQLite
cd IceFireDB-SQLite
./bin/IceFireDB-SQLite -c config/config-device-a.yaml

# config-device-a.yaml
p2p:
  enable: true
  node_host_ip: "192.168.1.100" # 设备 A 的 IP
  node_host_port: 4001

# 启动 Gestell 应用
cd gestell
npm run dev
```

#### 4.2 设备 B（协作设备）
```bash
# 启动 IceFireDB-SQLite
cd IceFireDB-SQLite
./bin/IceFireDB-SQLite -c config/config-device-b.yaml

# config-device-b.yaml
p2p:
  enable: true
  node_host_ip: "192.168.1.101" # 设备 B 的 IP
  node_host_port: 4001

# 启动 Gestell 应用
cd gestell
npm run dev
```

#### 4.3 验证同步
1. 在设备 A 创建新作品
2. 在设备 B 查看作品列表（应该自动出现）
3. 在设备 A 修改章节内容并保存
4. 在设备 B 刷新查看（应该同步更新）

## 数据流示例

### 创建新作品流程
```
用户操作（设备 A）
  ↓
点击"创建作品"
  ↓
调用 WorkService.createWork()
  ↓
Prisma 执行 INSERT 语句
  ↓
IceFireDB-SQLite 接收 SQL
  ↓
本地 SQLite 写入数据
  ↓
P2P 广播 SQL 命令
  ↓
设备 B 的 IceFireDB-SQLite 接收
  ↓
设备 B 执行相同 SQL
  ↓
设备 B 本地数据库更新
```

### 协同编辑流程
```
用户 A 编辑文档（设备 A）
  ↓
Yjs 实时同步 → 用户 B 看到（毫秒级）
  ↓
用户 A 点击"保存"
  ↓
调用 ContentService.updateContent()
  ↓
Prisma 执行 UPDATE 语句
  ↓
IceFireDB-SQLite P2P 同步
  ↓
所有设备数据库更新
```

## 技术细节

### P2P 网络发现
IceFireDB-SQLite 支持两种发现模式：

1. **Advertise Mode（推荐）**
   - 使用 DHT (Distributed Hash Table)
   - 适合公网环境
   - 节点自动发现

2. **Announce Mode**
   - 使用 Rendezvous
   - 适合局域网
   - 需要指定种子节点

### 冲突处理策略
IceFireDB-SQLite 使用 **Last Write Wins (LWW)** 策略：
- 最后执行的 SQL 命令胜出
- 适合写入频率不高的场景
- 配合乐观锁可以提高安全性

### 安全考虑
1. **数据加密**
   - P2P 通信自动加密（libp2p TLS）
   - 数据库文件本地加密（可选）

2. **访问控制**
   - 目前 IceFireDB-SQLite 需要密码（root:123456）
   - 可以配置更强的认证机制

## 性能优化

### 1. 批量操作
```typescript
// 避免频繁小事务
await prisma.$transaction([
  prisma.chapter.create({...}),
  prisma.content.create({...}),
]);
```

### 2. 延迟同步
```typescript
// 编辑时缓存到 Yjs
// 每 5 秒批量保存到数据库
setInterval(async () => {
  if (hasUnsavedChanges) {
    await saveToDatabase();
  }
}, 5000);
```

### 3. 选择性同步
```yaml
# 配置只同步特定表
p2p:
  sync_tables:
    - works
    - chapters
    - contents
  ignore_tables:
    - logs
    - temp_data
```

## 回滚方案

如果遇到问题，可以快速回滚到 better-sqlite3：

```env
# .env
DATABASE_URL="file:./data/gestell.db"
```

```prisma
// schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

```bash
npx prisma db push
npx prisma generate
npm run dev
```

## 下一步计划

### Phase 1: 基础集成（本周）
- [ ] 部署 IceFireDB-SQLite 服务
- [ ] 修改 Prisma 配置
- [ ] 单机测试
- [ ] 局域网双机测试

### Phase 2: 优化（下周）
- [ ] 冲突解决策略优化
- [ ] 性能调优
- [ ] 错误处理和日志
- [ ] 用户界面反馈（同步状态）

### Phase 3: 生产化（2周后）
- [ ] 公网 P2P 测试
- [ ] 安全加固
- [ ] 监控和诊断
- [ ] 用户文档

## 监控指标

### P2P 网络状态
- 连接的节点数量
- 网络延迟
- 同步队列长度

### 数据库性能
- SQL 执行时间
- 同步延迟
- 冲突次数

### 应用层监控
- 保存成功率
- 数据完整性检查
- 用户体验指标

## 常见问题

### Q1: 如何处理离线编辑？
**A**: Yjs 已经处理了编辑器的离线同步。数据库同步会在重新连接后自动执行积压的 SQL 命令。

### Q2: 如果两个设备同时修改同一条记录？
**A**: IceFireDB-SQLite 使用 LWW 策略。可以在应用层添加乐观锁：
```sql
UPDATE contents 
SET content_json = ?, version = version + 1 
WHERE id = ? AND version = ?
```

### Q3: P2P 网络安全吗？
**A**: libp2p 提供传输层加密。建议：
1. 使用私有网络（VPN）
2. 配置节点白名单
3. 启用应用层加密

### Q4: 性能影响？
**A**: 
- 编辑体验：无影响（Yjs 本地处理）
- 保存操作：+100-500ms（P2P 广播）
- 查询操作：无影响（本地 SQLite）

## 参考资源
- [IceFireDB 官方文档](https://github.com/IceFireDB/IceFireDB)
- [IceFireDB-SQLite README](https://github.com/IceFireDB/IceFireDB/tree/main/IceFireDB-SQLite)
- [Prisma MySQL 配置](https://www.prisma.io/docs/reference/database-reference/connection-urls#mysql)
- [libp2p 文档](https://docs.libp2p.io/)
