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

---

## 🌐 生产环境配置

### 生产服务器连接

如果使用生产环境的 Hocuspocus 服务器，请修改 `src/ui/components/Editor.vue` 中的默认配置：

```typescript
const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '开始写作...',
  readonly: false,
  collaborationMode: false,
  collaborationConfig: () => ({
    websocketUrl: 'ws://106.53.71.197:2025',  // 生产服务器地址
    webrtcSignaling: ['ws://106.53.71.197:2025'],  // WebRTC 信令服务器
    maxConnections: 10
  })
})
```

### 生产环境配置选项

```typescript
provider = new HocuspocusProvider({
  url: 'ws://106.53.71.197:2025',  // 生产服务器
  name: roomName,
  document: ydoc,
  connect: true,                    // 自动连接
  broadcast: true,                  // 广播同步
  forceSyncInterval: 10000,         // 强制同步间隔 (10秒)
  // token: 'your-jwt-token',       // JWT 认证 (如果需要)
})
```

### 环境变量配置 (推荐)

创建环境变量配置文件：

```bash
# .env.production
VITE_COLLABORATION_SERVER=ws://106.53.71.197:2025
```

然后在代码中使用：

```typescript
const serverUrl = import.meta.env.VITE_COLLABORATION_SERVER || 'ws://localhost:4001'

collaborationConfig: () => ({
  websocketUrl: serverUrl,
  webrtcSignaling: [serverUrl],
  maxConnections: 10
})
```

### 网络配置注意事项

1. **防火墙**: 确保服务器端口 2025 可以访问
2. **SSL/TLS**: 生产环境建议使用 wss:// 而不是 ws://
3. **域名**: 建议使用域名而不是 IP 地址
4. **负载均衡**: 如果有多个服务器，需要配置负载均衡

### 监控和调试

生产环境建议添加连接状态监控：

```typescript
provider.on('status', ({ status }: any) => {
  console.log('🔗 生产服务器连接状态:', status)
  // 可以发送到监控系统
})

provider.on('connect', () => {
  console.log('✅ 已连接到生产服务器')
})

provider.on('disconnect', ({ event }: any) => {
  console.error('❌ 与生产服务器断开连接:', event)
})
```

---

## 📊 性能优化建议

### 生产环境优化

1. **连接池**: 复用 WebSocket 连接
2. **压缩**: 启用数据压缩
3. **缓存**: 缓存频繁访问的文档
4. **监控**: 实时监控连接数和性能

### 故障转移

```typescript
// 多服务器故障转移
const servers = [
  'ws://106.53.71.197:2025',
  'ws://backup-server.com:2025'
]

let currentServerIndex = 0

function createProvider() {
  const serverUrl = servers[currentServerIndex]
  
  const provider = new HocuspocusProvider({
    url: serverUrl,
    name: roomName,
    document: ydoc,
  })
  
  provider.on('disconnect', () => {
    // 自动切换到下一个服务器
    currentServerIndex = (currentServerIndex + 1) % servers.length
    console.log('🔄 切换到备用服务器:', servers[currentServerIndex])
    createProvider()
  })
  
  return provider
}
```

---

**🚀 现在可以连接到生产服务器进行协作编辑了！**
