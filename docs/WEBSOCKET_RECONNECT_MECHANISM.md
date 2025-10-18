# Editor.vue WebSocket 连接机制详解

## 📋 概览

`Editor.vue` 使用 **y-websocket** 库来实现协作编辑的 WebSocket 连接，该库内置了自动重连机制。

## 🔌 WebSocket 连接创建

### 代码位置：`Editor.vue` 第 224-262 行

```typescript
const initCollaboration = async () => {
  // ...
  
  // 创建 Yjs 文档
  ydoc = new Y.Doc()
  const yXmlFragment = ydoc.getXmlFragment('prosemirror')
  
  // 创建 WebSocket Provider
  if (props.collaborationConfig?.websocketUrl) {
    const roomName = `content-${props.contentId}`
    console.log('📡 创建 WebSocket 连接到房间:', roomName)
    
    provider = new WebsocketProvider(
      props.collaborationConfig.websocketUrl,  // 服务器 URL
      roomName,                                 // 房间名称
      ydoc                                      // Yjs 文档
    )
  }
  
  // ...
}
```

### 连接参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `websocketUrl` | `'ws://localhost:4001/signaling'` | WebSocket 服务器地址 |
| `roomName` | `'content-{contentId}'` | 协作房间名称，基于内容 ID |
| `ydoc` | `Y.Doc` 实例 | Yjs CRDT 文档 |

## 🔄 自动重连机制

### y-websocket 内置重连机制

`WebsocketProvider` 内置了**指数退避重连**机制，代码位于 `node_modules/y-websocket/dist/y-websocket.cjs`：

```javascript
// 关闭 WebSocket 连接时自动重连
const closeWebsocketConnection = (provider, ws, event) => {
  if (ws === provider.ws) {
    // ...清理连接状态...
    
    // 使用指数退避算法计算重连延迟
    setTimeout(
      setupWS,  // 重新建立连接
      math.min(
        math.pow(2, provider.wsUnsuccessfulReconnects) * 100,  // 2^n * 100ms
        provider.maxBackoffTime  // 最大延迟时间
      ),
      provider
    )
  }
}
```

### 重连延迟计算公式

```
延迟时间 = min(2^n * 100ms, maxBackoffTime)
```

其中：
- `n` = 连续失败的重连次数 (`wsUnsuccessfulReconnects`)
- `maxBackoffTime` = 最大退避时间（默认 **2500ms**）

### 重连时间表

| 重连次数 | 计算公式 | 实际延迟 |
|---------|----------|---------|
| 1 | 2^0 * 100 = 100ms | 100ms |
| 2 | 2^1 * 100 = 200ms | 200ms |
| 3 | 2^2 * 100 = 400ms | 400ms |
| 4 | 2^3 * 100 = 800ms | 800ms |
| 5 | 2^4 * 100 = 1600ms | 1600ms |
| 6+ | 2^5 * 100 = 3200ms | **2500ms** (达到上限) |

## ⚙️ 配置选项

### WebsocketProvider 构造函数选项

```typescript
new WebsocketProvider(serverUrl, roomname, doc, {
  connect: true,              // 是否立即连接
  awareness: awareness,       // Awareness 实例
  params: {},                 // URL 参数
  protocols: [],              // WebSocket 协议
  WebSocketPolyfill: WebSocket, // WebSocket 实现
  resyncInterval: -1,         // 重新同步间隔（-1 = 禁用）
  maxBackoffTime: 2500,       // 🔥 最大退避时间（重连间隔上限）
  disableBc: false            // 是否禁用跨标签页通信
})
```

### 关键配置项说明

#### `maxBackoffTime` (默认: 2500ms)

**作用**：设置重连尝试之间的最大延迟时间

**使用示例**：

```typescript
// 默认配置（2.5秒上限）
provider = new WebsocketProvider(
  'ws://localhost:4001/signaling',
  roomName,
  ydoc
)

// 自定义配置（5秒上限）
provider = new WebsocketProvider(
  'ws://localhost:4001/signaling',
  roomName,
  ydoc,
  {
    maxBackoffTime: 5000  // 5秒
  }
)

// 更快的重连（1秒上限，适合本地开发）
provider = new WebsocketProvider(
  'ws://localhost:4001/signaling',
  roomName,
  ydoc,
  {
    maxBackoffTime: 1000  // 1秒
  }
)
```

#### `resyncInterval` (默认: -1)

**作用**：定期向服务器请求完整同步，防止状态不一致

**使用示例**：

```typescript
// 每 30 秒强制重新同步
provider = new WebsocketProvider(
  'ws://localhost:4001/signaling',
  roomName,
  ydoc,
  {
    resyncInterval: 30000  // 30秒
  }
)
```

## 🔍 连接状态监听

### 代码位置：`Editor.vue` 第 280-320 行

```typescript
// 监听连接状态
provider.on('status', (event: any) => {
  connectionStatus.value = event.status
  
  if (event.status === 'connected') {
    syncStatus.value = '已同步'
    // 连接成功后的处理...
  } else if (event.status === 'connecting') {
    syncStatus.value = '同步中...'
  } else {
    syncStatus.value = '同步失败'
  }
})

// WebSocket 错误监听
wsProvider.on('connection-error', (error: any) => {
  console.error('❌ WebSocket 连接错误:', error)
})

// WebSocket 断开监听
wsProvider.on('connection-close', (event: any) => {
  console.log('🔌 WebSocket 连接关闭（将自动重连）:', event)
})
```

### 连接状态

| 状态 | 说明 | UI 显示 |
|------|------|---------|
| `'connecting'` | 正在连接 | "同步中..." |
| `'connected'` | 已连接 | "已同步" |
| `'disconnected'` | 已断开 | "同步失败" |

## 🔨 如何修改重连配置

### 方案 1：在 Editor.vue 中配置

```typescript
// src/ui/components/Editor.vue

const initCollaboration = async () => {
  // ...
  
  provider = new WebsocketProvider(
    props.collaborationConfig.websocketUrl,
    roomName,
    ydoc,
    {
      maxBackoffTime: 5000,      // 🔥 设置最大重连间隔为 5 秒
      resyncInterval: 30000,     // 🔥 每 30 秒强制重新同步
    }
  )
  
  // ...
}
```

### 方案 2：通过 Props 传递配置

**修改 Props 定义**：

```typescript
interface Props {
  // ...
  collaborationConfig?: {
    websocketUrl?: string
    webrtcSignaling?: string[]
    maxConnections?: number
    maxBackoffTime?: number    // 🆕 新增
    resyncInterval?: number    // 🆕 新增
  }
}
```

**使用配置**：

```typescript
provider = new WebsocketProvider(
  props.collaborationConfig.websocketUrl,
  roomName,
  ydoc,
  {
    maxBackoffTime: props.collaborationConfig.maxBackoffTime || 2500,
    resyncInterval: props.collaborationConfig.resyncInterval || -1,
  }
)
```

**调用时传入**：

```vue
<Editor
  :collaboration-mode="true"
  :collaboration-config="{
    websocketUrl: 'ws://localhost:4001/signaling',
    maxBackoffTime: 5000,
    resyncInterval: 30000
  }"
/>
```

### 方案 3：环境变量配置

**创建配置文件**：

```typescript
// src/ui/config/collaboration.ts

export const collaborationConfig = {
  websocketUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:4001/signaling',
  maxBackoffTime: parseInt(import.meta.env.VITE_WS_MAX_BACKOFF) || 2500,
  resyncInterval: parseInt(import.meta.env.VITE_WS_RESYNC_INTERVAL) || -1,
}
```

**.env 文件**：

```bash
# .env.development
VITE_WS_URL=ws://localhost:4001/signaling
VITE_WS_MAX_BACKOFF=1000
VITE_WS_RESYNC_INTERVAL=30000

# .env.production
VITE_WS_URL=wss://your-production-server.com
VITE_WS_MAX_BACKOFF=5000
VITE_WS_RESYNC_INTERVAL=60000
```

## 🔧 心跳检测机制

y-websocket 内置了心跳检测，防止"僵尸连接"：

```javascript
// 每 3 秒检查一次（messageReconnectTimeout / 10）
this._checkInterval = setInterval(() => {
  if (
    this.wsconnected &&
    messageReconnectTimeout < time.getUnixTime() - this.wsLastMessageReceived
  ) {
    // 超过 30 秒没收到任何消息（包括自己的 awareness 更新）
    // 认为连接已死，强制重连
    closeWebsocketConnection(this, this.ws, null)
  }
}, messageReconnectTimeout / 10)
```

**心跳参数**：

- `messageReconnectTimeout` = **30000ms** (30秒)
- 检查间隔 = **3000ms** (3秒)
- 超时判断：如果 30 秒内没有收到任何消息，触发重连

## 📊 重连流程图

```
                    ┌─────────────┐
                    │ 初始化连接    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  连接中...   │
                    │ (connecting) │
                    └──────┬──────┘
                           │
                ┌──────────┴──────────┐
                │                     │
         ┌──────▼──────┐      ┌──────▼──────┐
         │  连接成功     │      │  连接失败     │
         │ (connected)  │      │              │
         └──────┬──────┘      └──────┬──────┘
                │                     │
                │              ┌──────▼──────────┐
                │              │ 等待重连          │
                │              │ delay = min(     │
                │              │   2^n * 100ms,   │
                │              │   maxBackoffTime │
                │              │ )                │
                │              └──────┬──────────┘
                │                     │
                │              ┌──────▼──────────┐
                │              │ 自动重连          │
                │              │ (尝试次数 + 1)   │
                │              └──────┬──────────┘
                │                     │
                │                     │
                └─────────────────────┘
                          │
                  ┌───────▼────────┐
                  │  30秒无消息?    │
                  └───────┬────────┘
                          │ Yes
                  ┌───────▼────────┐
                  │  强制断开并重连  │
                  └────────────────┘
```

## 🎯 常见问题

### Q1: 为什么连接总是断开？

**可能原因**：
1. 服务器未运行 (`yjs-server`)
2. 防火墙阻止 WebSocket 连接
3. 网络不稳定
4. 服务器配置问题

**解决方案**：
```bash
# 1. 确保 yjs-server 运行中
cd yjs-server
npm start

# 2. 检查端口是否开放
lsof -i :4001

# 3. 查看 Electron 控制台日志
```

### Q2: 如何加快重连速度？

**方法 1：减少 maxBackoffTime**

```typescript
provider = new WebsocketProvider(url, room, doc, {
  maxBackoffTime: 1000  // 1秒上限
})
```

**方法 2：监听网络状态，手动重连**

```typescript
window.addEventListener('online', () => {
  console.log('🌐 网络恢复，手动重连...')
  if (provider && !provider.wsconnected) {
    provider.connect()
  }
})
```

### Q3: 如何禁用自动重连？

```typescript
// 断开连接并禁用自动重连
provider.disconnect()

// 或者在创建时设置
provider = new WebsocketProvider(url, room, doc, {
  connect: false  // 不自动连接
})

// 需要时手动连接
provider.connect()
```

### Q4: 如何知道当前重连了几次？

y-websocket 内部维护了 `wsUnsuccessfulReconnects` 计数器，但没有直接暴露。

**解决方案：添加自定义监听**

```typescript
let reconnectCount = 0

provider.on('status', (event) => {
  if (event.status === 'connecting') {
    reconnectCount++
    console.log(`🔄 重连尝试 #${reconnectCount}`)
  } else if (event.status === 'connected') {
    console.log(`✅ 连接成功（尝试了 ${reconnectCount} 次）`)
    reconnectCount = 0  // 重置计数
  }
})
```

## 📚 相关文件

| 文件 | 说明 |
|------|------|
| `src/ui/components/Editor.vue` | 编辑器组件，WebSocket 连接初始化 |
| `yjs-server/server.js` | Yjs WebSocket 信令服务器 |
| `node_modules/y-websocket/` | y-websocket 库源码 |

## 🔗 参考资源

- [y-websocket GitHub](https://github.com/yjs/y-websocket)
- [Yjs Documentation](https://docs.yjs.dev/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## 总结

### 关键点

1. ✅ **自动重连**：y-websocket 内置指数退避重连机制
2. ⏱️ **默认间隔**：最大 **2.5 秒**（可配置）
3. 🔧 **配置位置**：`maxBackoffTime` 参数
4. 💓 **心跳检测**：30 秒无消息自动重连
5. 🎛️ **可定制**：支持多种配置选项

### 推荐配置

**开发环境**：
```typescript
{
  maxBackoffTime: 1000,   // 快速重连
  resyncInterval: -1      // 禁用定期同步
}
```

**生产环境**：
```typescript
{
  maxBackoffTime: 5000,   // 更稳定的重连
  resyncInterval: 60000   // 每分钟同步一次
}
```
