# Gestell Yjs Server

这是 Gestell 项目的协同编辑 WebSocket 服务器，基于 Yjs 协议。

## 功能特性

- 🔄 实时文档同步
- 👥 用户 Awareness（光标位置、选择等）
- 📄 文档持久化
- 🔗 支持多种连接格式
- 🏥 健康检查接口
- 📊 文档状态监控

## 安装依赖

```bash
cd yjs-server
npm install
```

## 启动服务器

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm start
```

## API 接口

### WebSocket 连接
- `ws://localhost:3001/signaling/room-name`
- `ws://localhost:3001/signaling?room=room-name`

### HTTP 接口
- `GET /health` - 健康检查
- `GET /docs/:docName` - 获取文档信息

## 支持的 URL 格式

### 路径参数格式
```
ws://localhost:3001/signaling/gestell-01K79N7571KD5252NF9V087HK8
```

### 查询参数格式
```
ws://localhost:3001/signaling?room=gestell-01K79N7571KD5252NF9V087HK8
```

## 配置

默认端口：3001
可以通过环境变量 `PORT` 修改：
```bash
PORT=8080 npm start
```

## 监控

### 健康检查
```bash
curl http://localhost:3001/health
```

### 文档信息
```bash
curl http://localhost:3001/docs/gestell-01K79N7571KD5252NF9V087HK8
```

## 日志

服务器会输出详细的连接和文档操作日志：
- 🔗 新连接
- 📄 文档创建/访问
- ❌ 错误信息
- 💾 关闭时的文档状态

## 架构说明

- 使用 `y-websocket` 的标准协议处理函数
- 自动处理 Yjs 的二进制协议
- 支持文档持久化（禁用垃圾回收）
- 提供完整的 Awareness 支持