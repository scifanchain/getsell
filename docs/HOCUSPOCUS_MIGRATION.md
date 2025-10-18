# 客户端迁移到 Hocuspocus Provider

## ✅ 完成的修改

### 1. 安装 Hocuspocus Provider

```bash
cd /Users/oxb/scifan/gestell
npm install @hocuspocus/provider
```

**已安装**: `@hocuspocus/provider@^2.15.3`

---

### 2. 修改 `src/ui/components/Editor.vue`

#### 2.1 更新导入语句

**修改前**:
```typescript
import { WebsocketProvider } from 'y-websocket'
```

**修改后**:
```typescript
import { HocuspocusProvider } from '@hocuspocus/provider'
```

---

#### 2.2 更新 Provider 类型

**修改前**:
```typescript
let provider: WebrtcProvider | WebsocketProvider | null = null
```

**修改后**:
```typescript
let provider: WebrtcProvider | HocuspocusProvider | null = null
```

---

#### 2.3 更新 Provider 创建代码

**修改前**:
```typescript
provider = new WebsocketProvider(
  props.collaborationConfig.websocketUrl,
  roomName,
  ydoc
)
```

**修改后**:
```typescript
provider = new HocuspocusProvider({
  url: props.collaborationConfig.websocketUrl,
  name: roomName,
  document: ydoc,
  // 可选：传递用户信息用于认证
  // token: 'your-jwt-token',
})
```

---

#### 2.4 更新事件监听器

**修改前**:
```typescript
if (provider && 'ws' in provider) {
  const wsProvider = provider as WebsocketProvider
  
  wsProvider.on('connection-error', (error: any) => {
    console.error('❌ WebSocket 连接错误:', error)
  })
  
  wsProvider.on('connection-close', (event: any) => {
    console.log('🔌 WebSocket 连接关闭（将自动重连）:', event)
  })
}
```

**修改后**:
```typescript
if (provider && provider instanceof HocuspocusProvider) {
  provider.on('connect', () => {
    console.log('✅ Hocuspocus 连接成功')
  })
  
  provider.on('disconnect', ({ event }: any) => {
    console.log('🔌 Hocuspocus 连接断开（将自动重连）:', event)
  })
  
  provider.on('status', ({ status }: any) => {
    console.log('📊 Hocuspocus 状态:', status)
  })
  
  provider.on('synced', ({ state }: any) => {
    console.log('✅ Hocuspocus 同步完成:', state)
  })
}
```

---

## 🔗 与服务器的兼容性

### 默认配置

客户端默认连接到：
```typescript
websocketUrl: 'ws://localhost:4001/signaling'
```

### 服务器端点

Hocuspocus 服务器运行在：
```
ws://localhost:4001
```

⚠️ **注意**: 客户端配置中的 `/signaling` 路径会被忽略，Hocuspocus 使用根路径 `/`

---

## 📊 Hocuspocus Provider 事件

### 连接事件

| 事件 | 说明 | 参数 |
|------|------|------|
| `connect` | WebSocket 连接成功 | - |
| `disconnect` | WebSocket 连接断开 | `{ event }` |
| `close` | 连接关闭 | `{ event }` |

### 同步事件

| 事件 | 说明 | 参数 |
|------|------|------|
| `sync` | 文档同步状态变化 | `{ state: boolean }` |
| `synced` | 文档同步完成 | `{ state: boolean }` |

### 状态事件

| 事件 | 说明 | 参数 |
|------|------|------|
| `status` | 连接状态变化 | `{ status: string }` |
| `message` | 收到消息 | `{ message }` |

### 认证事件

| 事件 | 说明 | 参数 |
|------|------|------|
| `authenticated` | 认证成功 | - |
| `authenticationFailed` | 认证失败 | `{ reason }` |

---

## 🎯 与 y-websocket 的区别

### y-websocket (旧)

```typescript
const provider = new WebsocketProvider(
  'ws://localhost:4001/signaling',  // URL
  'document-name',                  // Room name
  doc                               // Yjs document
)
```

**特点**:
- 位置参数
- 简单配置
- 基础功能

### @hocuspocus/provider (新)

```typescript
const provider = new HocuspocusProvider({
  url: 'ws://localhost:4001',      // WebSocket URL
  name: 'document-name',           // Document name
  document: doc,                   // Yjs document
  token: 'jwt-token',              // 可选：JWT Token
  parameters: {                    // 可选：查询参数
    userId: '123'
  }
})
```

**特点**:
- 对象参数配置
- 支持 JWT 认证
- 支持自定义参数
- 更多事件监听
- 内置重连机制
- 完整的 TypeScript 类型

---

## ✅ 测试清单

### 启动服务器

```bash
cd /Users/oxb/scifan/gestell-collab-server
npm start
```

**预期输出**:
```
🚀 Gestell Collaboration Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Environment: development
🔌 Port: 4001
💾 Database: ./data/gestell-collab.db
🔒 Authentication: Disabled (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Hocuspocus v2.15.3 running at:

  > HTTP: http://0.0.0.0:4001
  > WebSocket: ws://0.0.0.0:4001

  Extensions:
  - SQLite
  - Logger

  Ready.

✅ Server is running on ws://localhost:4001
📊 Health check: http://localhost:4001/health
📈 Statistics: http://localhost:4001/stats

⏳ Waiting for connections...
```

---

### 启动客户端

```bash
cd /Users/oxb/scifan/gestell
npm start
```

---

### 测试协作功能

1. ✅ **启动 Electron 应用**
2. ✅ **登录用户账号**
3. ✅ **创建或打开一个章节**
4. ✅ **进入编辑器**
5. ✅ **查看浏览器控制台**

**预期日志**:
```
📡 创建 Hocuspocus WebSocket 连接到房间: content-xxx
✅ Hocuspocus 连接成功
📊 Hocuspocus 状态: connected
✅ Hocuspocus 同步完成: true
```

---

### 服务器端日志

**预期输出**:
```
[Hocuspocus] [2025-10-18T10:30:00.000Z] New connection to "content-xxx".
✅ Client connected to document: content-xxx
📄 Loading document: content-xxx
[Hocuspocus] [2025-10-18T10:30:00.100Z] Loaded document "content-xxx".
```

---

## 🔍 故障排查

### 问题 1: 连接失败

**症状**:
```
🔌 Hocuspocus 连接断开（将自动重连）
```

**检查**:
1. 确认服务器正在运行
2. 检查端口 4001 是否被占用
3. 查看服务器日志

**解决**:
```bash
# 检查端口
lsof -i :4001

# 重启服务器
cd /Users/oxb/scifan/gestell-collab-server
npm start
```

---

### 问题 2: 协议错误

**症状**:
```
TypeError: The encoded data was not valid for encoding utf-8
```

**原因**: 使用了旧的 `y-websocket` 而不是 `@hocuspocus/provider`

**解决**: 确认已经按照本文档修改了 `Editor.vue`

---

### 问题 3: 数据不持久化

**症状**: 刷新后数据丢失

**检查**:
```bash
# 确认数据库文件存在
ls -lh /Users/oxb/scifan/gestell-collab-server/data/gestell-collab.db
```

**解决**: 确认服务器启用了 SQLite 扩展（已默认启用）

---

## 📚 后续优化建议

### 1. 添加用户认证

修改 `Editor.vue`：
```typescript
provider = new HocuspocusProvider({
  url: 'ws://localhost:4001',
  name: roomName,
  document: ydoc,
  token: await authorStore.getJWTToken(), // 获取 JWT Token
})
```

修改服务器 `server.js`：
```typescript
async onAuthenticate(data) {
  const { token } = data
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return { user: decoded }
  } catch (err) {
    throw new Error('Invalid token')
  }
}
```

---

### 2. 添加错误提示

修改 `Editor.vue`：
```typescript
provider.on('authenticationFailed', ({ reason }: any) => {
  console.error('❌ 认证失败:', reason)
  ElMessage.error('协作服务器认证失败，请重新登录')
})

provider.on('disconnect', ({ event }: any) => {
  syncStatus.value = '连接断开，正在重连...'
})

provider.on('connect', () => {
  syncStatus.value = '已连接'
})
```

---

### 3. 监控连接质量

添加统计信息：
```typescript
setInterval(async () => {
  const stats = await fetch('http://localhost:4001/stats').then(r => r.json())
  console.log('📊 服务器状态:', stats)
}, 30000) // 每 30 秒检查一次
```

---

## 🎉 总结

### 已完成

- ✅ 安装 `@hocuspocus/provider`
- ✅ 修改 `Editor.vue` 导入语句
- ✅ 更新 Provider 创建代码
- ✅ 更新事件监听器
- ✅ 构建成功

### 兼容性

| 组件 | 版本 | 状态 |
|------|------|------|
| **客户端** | @hocuspocus/provider@^2.15.3 | ✅ |
| **服务器** | @hocuspocus/server@^2.13.5 | ✅ |
| **协议** | Hocuspocus 协议 | ✅ 兼容 |

### 下一步

1. 🚀 **启动服务器**: `cd gestell-collab-server && npm start`
2. 🚀 **启动客户端**: `cd gestell && npm start`
3. ✅ **测试协作功能**
4. 📝 **查看日志确认连接成功**

---

**🎊 恭喜！客户端已成功迁移到 Hocuspocus！**
