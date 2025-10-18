# Hocuspocus 详解

## 📋 什么是 Hocuspocus？

**Hocuspocus** 是一个基于 **Yjs** 的**企业级实时协作后端服务器**，由德国柏林的 **Tiptap** 团队开发和维护。

简单来说：
- 🔌 **即插即用的 WebSocket 服务器**
- 🚀 **专为 Yjs 协作优化**
- 💼 **企业级特性和稳定性**
- 🎯 **比自己写 yjs-server 更可靠**

---

## 💰 价格和许可证

### ✅ **完全免费且开源！**

| 项目 | 内容 |
|------|------|
| **许可证** | ✅ **MIT License** |
| **GitHub** | https://github.com/ueberdosis/hocuspocus |
| **Stars** | ⭐ 1.9k+ |
| **费用** | 🆓 **完全免费** |
| **商业使用** | ✅ **允许** |
| **自托管** | ✅ **完全支持** |

```bash
# 安装完全免费
npm install @hocuspocus/server @hocuspocus/extension-database
```

**关键点**：
- ✅ **源代码开放** - MIT 许可证
- ✅ **无使用限制** - 可以商业使用
- ✅ **无需付费** - 所有核心功能免费
- ✅ **自己部署** - 完全控制

---

## 💎 Tiptap Collab Cloud（可选付费服务）

Hocuspocus 团队提供**托管服务**（**非必须**）：

### Tiptap Collab Cloud

**官网**: https://tiptap.dev/collab

**这是什么**：
- 🌥️ 完全托管的协作服务
- 🚀 无需自己部署服务器
- 🔧 零运维
- 📊 包含监控和分析

**价格**（2025 年）：

| 方案 | 价格 | 包含内容 |
|------|------|---------|
| **Free** | $0/月 | 10 个文档，1GB 存储 |
| **Starter** | $29/月 | 100 个文档，10GB 存储 |
| **Pro** | $199/月 | 无限文档，100GB 存储 |
| **Enterprise** | 定制 | 专属服务器，SLA 保证 |

**注意**：
- ⚠️ **这是可选服务**，不是必须的！
- ✅ **自己部署 Hocuspocus 完全免费**
- 💡 **仅当不想自己运维时才需要**

---

## 🆚 Hocuspocus vs 自建 yjs-server

### 对比表

| 特性 | 自建 yjs-server | Hocuspocus (自托管) | Tiptap Cloud (付费) |
|------|----------------|-------------------|-------------------|
| **费用** | 免费 | 免费 | $29-199/月 |
| **数据持久化** | ❌ 需要自己实现 | ✅ 内置多种选项 | ✅ 全托管 |
| **身份验证** | ❌ 需要自己实现 | ✅ 内置 JWT/自定义 | ✅ 全托管 |
| **数据库支持** | ❌ 无 | ✅ SQLite/PostgreSQL/MySQL | ✅ 全托管 |
| **Redis 集群** | ❌ 需要自己实现 | ✅ 内置支持 | ✅ 全托管 |
| **Webhook** | ❌ 无 | ✅ 内置 | ✅ 全托管 |
| **监控指标** | ❌ 需要自己实现 | ✅ 内置 | ✅ 高级监控 |
| **文档和支持** | ⚠️ 基础 | ✅ 完整 | ✅ 专业支持 |
| **生产就绪** | ❌ 否 | ✅ 是 | ✅ 是 |
| **维护成本** | 🔴 高 | 🟡 中 | 🟢 零 |

---

## ⚙️ Hocuspocus 核心特性

### 1. **数据持久化**（内置）

```typescript
import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'

const server = Server.configure({
  extensions: [
    new Database({
      // PostgreSQL
      fetch: async ({ documentName }) => {
        return await db.getDocument(documentName)
      },
      store: async ({ documentName, state }) => {
        await db.saveDocument(documentName, state)
      }
    })
  ]
})
```

**支持的数据库**：
- ✅ SQLite（内置扩展）
- ✅ PostgreSQL
- ✅ MySQL
- ✅ MongoDB（社区）
- ✅ 自定义数据库

### 2. **身份验证**（内置）

```typescript
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  async onAuthenticate(data) {
    const { token, documentName, connection } = data
    
    // JWT 验证
    const user = await verifyToken(token)
    
    // 权限检查
    const hasAccess = await checkAccess(user.id, documentName)
    
    if (!hasAccess) {
      throw new Error('Access denied')
    }
    
    return {
      user: {
        id: user.id,
        name: user.name
      }
    }
  }
})
```

### 3. **Webhook**（内置）

```typescript
import { Webhook } from '@hocuspocus/extension-webhook'

const server = Server.configure({
  extensions: [
    new Webhook({
      url: 'https://your-api.com/webhook',
      events: ['change', 'connect', 'disconnect']
    })
  ]
})
```

### 4. **Redis 集群**（内置）

```typescript
import { Redis } from '@hocuspocus/extension-redis'

const server = Server.configure({
  extensions: [
    new Redis({
      host: 'localhost',
      port: 6379
    })
  ]
})
```

**支持**：
- ✅ 水平扩展（多个 Hocuspocus 实例）
- ✅ 负载均衡
- ✅ 高可用

### 5. **监控和日志**（内置）

```typescript
import { Logger } from '@hocuspocus/extension-logger'

const server = Server.configure({
  extensions: [
    new Logger({
      level: 'info',
      onLog: (message) => {
        // 发送到 Sentry / DataDog 等
        console.log(message)
      }
    })
  ],
  
  async onStatistics(data) {
    // 性能指标
    console.log('Connections:', data.connectionsCount)
    console.log('Documents:', data.documentsCount)
  }
})
```

---

## 🚀 快速开始

### 安装

```bash
npm install @hocuspocus/server @hocuspocus/extension-sqlite
```

### 最简示例

```typescript
// server.js
import { Server } from '@hocuspocus/server'
import { SQLite } from '@hocuspocus/extension-sqlite'

const server = Server.configure({
  port: 4001,
  
  extensions: [
    new SQLite({
      database: 'db.sqlite'
    })
  ]
})

server.listen()
```

### 完整示例（生产级）

```typescript
import { Server } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { Logger } from '@hocuspocus/extension-logger'
import { Redis } from '@hocuspocus/extension-redis'
import jwt from 'jsonwebtoken'

const server = Server.configure({
  port: 4001,
  
  // 身份验证
  async onAuthenticate(data) {
    const { token } = data
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      return { user: decoded }
    } catch (err) {
      throw new Error('Invalid token')
    }
  },
  
  // 权限检查
  async onLoadDocument(data) {
    const { documentName, context } = data
    
    const hasAccess = await checkUserAccess(
      context.user.id, 
      documentName
    )
    
    if (!hasAccess) {
      throw new Error('Access denied')
    }
    
    return data.document
  },
  
  extensions: [
    // 数据库持久化
    new Database({
      fetch: async ({ documentName }) => {
        return await db.getYDoc(documentName)
      },
      store: async ({ documentName, state }) => {
        await db.saveYDoc(documentName, state)
      }
    }),
    
    // Redis 集群
    new Redis({
      host: process.env.REDIS_HOST,
      port: 6379
    }),
    
    // 日志
    new Logger({
      level: 'info'
    })
  ]
})

server.listen()
```

---

## 📦 可用扩展

| 扩展 | 功能 | 包名 |
|------|------|------|
| **SQLite** | SQLite 持久化 | `@hocuspocus/extension-sqlite` |
| **Database** | 自定义数据库 | `@hocuspocus/extension-database` |
| **Redis** | Redis 集群 | `@hocuspocus/extension-redis` |
| **Webhook** | Webhook 通知 | `@hocuspocus/extension-webhook` |
| **Logger** | 日志记录 | `@hocuspocus/extension-logger` |
| **Throttle** | 速率限制 | `@hocuspocus/extension-throttle` |
| **Monitor** | 性能监控 | `@hocuspocus/extension-monitor` |

---

## 🎯 适合 Gestell 项目吗？

### ✅ 强烈推荐使用 Hocuspocus（自托管）

**理由**：

1. **免费开源**
   - MIT 许可证
   - 可以商业使用
   - 完全免费

2. **生产就绪**
   - 内置持久化
   - 内置认证
   - 内置错误处理

3. **节省时间**
   - 无需从头实现
   - 减少 7-10 天开发时间
   - 避免生产环境踩坑

4. **活跃维护**
   - 1.9k+ GitHub Stars
   - 77+ 贡献者
   - 定期更新

5. **易于集成**
   - 完善的文档
   - TypeScript 支持
   - 丰富的示例

### 对比方案

| 方案 | 成本 | 时间 | 风险 | 推荐度 |
|------|------|------|------|--------|
| **当前 yjs-server** | 免费 | 7-10天改进 | 高 | ⭐☆☆☆☆ |
| **Hocuspocus（自托管）** | 免费 | 1-2天集成 | 低 | ⭐⭐⭐⭐⭐ |
| **Tiptap Cloud** | $29+/月 | 0.5天 | 无 | ⭐⭐⭐⭐☆ |

---

## 💡 迁移建议

### 从当前 yjs-server 迁移到 Hocuspocus

**工作量**: 1-2 天

**步骤**：

1. **安装 Hocuspocus**
   ```bash
   cd yjs-server
   npm install @hocuspocus/server @hocuspocus/extension-sqlite
   ```

2. **替换 server.js**
   ```typescript
   // 新的 server.js
   import { Server } from '@hocuspocus/server'
   import { SQLite } from '@hocuspocus/extension-sqlite'
   
   const server = Server.configure({
     port: 4001,
     extensions: [
       new SQLite({ database: 'gestell.db' })
     ]
   })
   
   server.listen()
   ```

3. **更新客户端（可选）**
   - 客户端代码基本不需要改
   - WebSocket URL 保持不变
   - Yjs 协议完全兼容

4. **测试**
   ```bash
   npm run dev
   # 测试协作功能
   ```

---

## 🌟 社区和支持

### 官方资源

- **官网**: https://hocuspocus.dev/
- **GitHub**: https://github.com/ueberdosis/hocuspocus
- **Discord**: https://discord.gg/WtJ49jGshW
- **文档**: https://tiptap.dev/docs/hocuspocus

### 商业支持

如果需要专业支持：
- Tiptap 提供付费支持计划
- 企业级 SLA
- 优先功能开发

---

## 📊 总结对比

### Hocuspocus（自托管）vs 自建

| 维度 | 自建 yjs-server | Hocuspocus |
|------|----------------|-----------|
| **费用** | 免费 | 免费 ✅ |
| **开发时间** | 7-10 天 | 1-2 天 ✅ |
| **生产就绪** | ❌ 否 | ✅ 是 |
| **维护成本** | 🔴 高 | 🟢 低 |
| **功能完整性** | ⭐⭐☆☆☆ | ⭐⭐⭐⭐⭐ |
| **社区支持** | ⚠️ 有限 | ✅ 活跃 |
| **文档质量** | ⚠️ 基础 | ✅ 完善 |

---

## 🎯 最终建议

### 对于 Gestell 项目

**推荐**: ⭐⭐⭐⭐⭐ **使用 Hocuspocus（自托管）**

**理由**：
1. ✅ **完全免费** - MIT 许可证
2. ✅ **节省时间** - 减少 7-10 天开发
3. ✅ **生产就绪** - 无需担心数据丢失
4. ✅ **易于维护** - 活跃的社区支持
5. ✅ **功能完整** - 包含所有需要的特性

**不推荐付费**：
- ❌ Tiptap Cloud 托管服务（$29+/月）
- 理由：自托管完全可以满足需求
- 除非：完全不想管理服务器

### 实施计划

**第 1 步**（今天）：
```bash
cd yjs-server
npm install @hocuspocus/server @hocuspocus/extension-sqlite
```

**第 2 步**（明天）：
- 替换 server.js
- 测试基本功能

**第 3 步**（后天）：
- 添加认证
- 配置数据库
- 部署测试

**总时间**: **1-2 天**，远少于自己改进当前代码的 **7-10 天**！

---

## 🚨 关键点

1. **Hocuspocus 是完全免费的开源项目**
2. **不需要付费就能使用所有功能**
3. **Tiptap Cloud 是可选的托管服务，非必须**
4. **自托管 Hocuspocus 是最佳选择**
5. **比自己写 yjs-server 更可靠且节省时间**

**不要被"企业级"这个词吓到，它是免费的！** 🎉
