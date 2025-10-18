# Yjs 协作连接问题修复报告

> **修复日期**: 2025-10-18  
> **问题**: 团队协作显示"已断开"，控制台无 WebSocket 信息

---

## 🐛 问题分析

### 根本原因

**初始化逻辑错误**：Editor 组件的 `initEditor()` 方法中存在条件判断错误

```typescript
// ❌ 错误的逻辑
if (props.collaborationMode && collaborationEnabled.value) {
  // collaborationEnabled 初始值是 false
  // 所以即使 props.collaborationMode 为 true，也不会初始化协作
  await initCollaboration()
  state = createCollaborativeState()
} else {
  state = createStandardState()
}
```

### 问题流程

```
1. WritingView 传入 collaborationMode={true}
   ↓
2. Editor onMounted() → initEditor()
   ↓
3. props.collaborationMode=true ✅
   但 collaborationEnabled.value=false ❌
   ↓
4. 条件不满足，走 createStandardState()
   ↓
5. 协作模式从未初始化！❌
   ↓
6. 状态始终显示"已断开"
```

---

## ✅ 修复内容

### 1. 修复初始化逻辑

**文件**: `src/ui/components/Editor.vue`

```typescript
// ✅ 修复后的逻辑
if (props.collaborationMode) {
  // 只要 props.collaborationMode 为 true，就初始化协作
  if (!collaborationEnabled.value) {
    await initCollaboration()
  }
  state = createCollaborativeState()
} else {
  state = createStandardState()
}
```

**变更说明**:
- 移除了对 `collaborationEnabled.value` 的依赖判断
- 如果 `collaborationEnabled` 还未设置，则先初始化协作
- 确保协作模式能够正确启动

---

### 2. 修复 WebSocket URL 配置

**文件**: `src/ui/views/WritingView.vue`

```typescript
// ❌ 错误配置
const collaborationConfig = {
  websocketUrl: 'ws://localhost:4001/signaling',  // ← 错误路径
  // ...
}

// ✅ 正确配置
const collaborationConfig = {
  websocketUrl: 'ws://localhost:4001',  // ← 不需要 /signaling
  webrtcSignaling: ['ws://localhost:4001'],
  maxConnections: 10
}
```

**原因**:
- yjs-server 从 URL 路径提取房间名
- y-websocket 会自动添加 `/{roomName}` 路径
- 实际连接: `ws://localhost:4001/content-{contentId}`

---

### 3. 增强调试日志

**文件**: `src/ui/components/Editor.vue`

新增详细日志输出：

```typescript
console.log('🚀 开始初始化协作模式...', {
  contentId: props.contentId,
  userId: props.userId,
  userName: props.userName,
  config: props.collaborationConfig
})

console.log('🔌 使用 WebSocket 连接:', props.collaborationConfig.websocketUrl)
console.log('👤 设置本地用户信息:', { name, userId })
console.log('🔄 连接状态变化:', event.status)
console.log('✅ WebSocket 连接成功！')
```

**日志含义**:
- 🚀 协作初始化开始
- 🔌 WebSocket 连接配置
- 👤 用户信息设置
- 🔄 连接状态变化
- ✅ 连接成功
- ❌ 连接失败
- ⚠️ 警告信息

---

## 🧪 测试步骤

### 1. 启动 yjs-server

```bash
cd yjs-server
npm start

# 应该看到：
# Yjs服务器运行在端口 4001
```

### 2. 启动应用

```bash
npm run dev
```

### 3. 创建团队协作作品

1. 创建新作品
2. 设置协作模式为 "团队协作"
3. 打开作品进入编辑器

### 4. 检查控制台日志

**应该看到以下日志**:

```
🚀 开始初始化协作模式... { contentId: '...', userId: '...', ... }
🔌 使用 WebSocket 连接: ws://localhost:4001
👤 设置本地用户信息: { name: '...', userId: '...' }
⏳ WebSocket 连接中...
✅ WebSocket 连接成功！
🔄 连接状态变化: connected
```

### 5. 检查 UI 状态

**协作状态栏应该显示**:
- 状态: "已连接" ✅ (绿色指示灯)
- 如果有其他用户: "N 位协作者在线"

---

## 🔍 故障排查

### 问题 1: 仍然显示"已断开"

**检查项**:
```bash
# 1. 确认 yjs-server 正在运行
curl http://localhost:4001/health
# 应返回: {"status":"ok","timestamp":"...","connections":0,"documents":0}

# 2. 检查浏览器控制台
# 是否有 WebSocket 错误？
# 是否有 CORS 错误？

# 3. 检查网络面板
# 过滤 "WS" 查看 WebSocket 连接
# 应该看到 ws://localhost:4001/content-xxx
```

### 问题 2: 无法看到协作者

**可能原因**:
- 两个用户必须在同一个 content
- 确认 contentId 相同
- 检查 userId 不同（相同 userId 会被忽略）

**测试方法**:
```bash
# 打开两个浏览器窗口
# 窗口 1: 用户 A 登录
# 窗口 2: 用户 B 登录
# 都打开相同的作品和章节
# 应该互相看到对方
```

### 问题 3: WebSocket 连接错误

**常见错误**:

```javascript
// ERR_CONNECTION_REFUSED
// → yjs-server 未启动

// 404 Not Found
// → URL 配置错误

// CORS 错误
// → yjs-server 需要配置 CORS（已配置）
```

---

## 📊 验证清单

- [x] 修复 Editor 初始化逻辑
- [x] 修复 WebSocket URL 配置
- [x] 增加详细调试日志
- [ ] 测试单人编辑
- [ ] 测试双人协作
- [ ] 测试连接断开恢复
- [ ] 测试多设备同步

---

## 📝 后续建议

### 1. 添加连接重试机制

```typescript
// 在 initCollaboration 中添加
provider.on('connection-close', () => {
  console.log('🔄 连接断开，3秒后重试...')
  setTimeout(() => {
    if (collaborationEnabled.value) {
      provider?.connect()
    }
  }, 3000)
})
```

### 2. 添加网络状态检测

```typescript
// 监听在线/离线状态
window.addEventListener('online', () => {
  console.log('🌐 网络恢复，重新连接...')
  provider?.connect()
})

window.addEventListener('offline', () => {
  console.log('📡 网络断开')
})
```

### 3. 添加心跳检测

```typescript
// 定期检查连接状态
setInterval(() => {
  if (provider && provider.wsconnected === false) {
    console.warn('⚠️ WebSocket 连接丢失，尝试重连')
    provider.connect()
  }
}, 30000) // 每30秒检查一次
```

---

## 🎯 关键代码位置

| 文件 | 修改内容 | 行号 |
|------|---------|------|
| `src/ui/components/Editor.vue` | 修复初始化逻辑 | ~138 |
| `src/ui/components/Editor.vue` | 增强日志输出 | ~241-340 |
| `src/ui/views/WritingView.vue` | 修复 WebSocket URL | ~323 |

---

## 📚 相关文档

- [y-websocket 文档](https://github.com/yjs/y-websocket)
- [Yjs 官方文档](https://docs.yjs.dev/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**修复完成时间**: 2025-10-18 17:00  
**测试状态**: ⏳ 待用户验证  
**下一步**: 刷新页面，检查控制台日志
