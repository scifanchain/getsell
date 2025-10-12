const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const Y = require('yjs');
const { setupWSConnection } = require('y-websocket/bin/utils');

const app = express();
const server = http.createServer(app);

// 启用 CORS
app.use(cors());
app.use(express.json());

// 存储所有 Yjs 文档
const docs = new Map();

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: wss.clients.size,
    documents: docs.size,
    rooms: Array.from(docs.keys())
  });
});

// 获取文档信息端点
app.get('/docs/:docName', (req, res) => {
  const docName = req.params.docName;
  const doc = docs.get(docName);
  
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  res.json({
    docName,
    clientsCount: doc.awareness ? doc.awareness.getStates().size : 0,
    lastModified: new Date().toISOString()
  });
});

// 创建 WebSocket 服务器 - 支持多个路径
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info) => {
    // 允许 /signaling 路径（用于 Yjs）
    const url = info.req.url;
    return url.startsWith('/signaling') || url === '/';
  }
});

// Yjs 文档管理
const getYDoc = (docname) => {
  let doc = docs.get(docname);
  if (!doc) {
    doc = new Y.Doc();
    doc.gc = false; // 禁用垃圾回收以保持历史记录
    docs.set(docname, doc);
    
    console.log(`📄 Created new Yjs document: ${docname}`);
  }
  return doc;
};

// 清理空文档的定时器
setInterval(() => {
  docs.forEach((doc, docName) => {
    if (doc.awareness && doc.awareness.getStates().size === 0) {
      // 如果没有活跃连接，可以选择性清理文档
      // 注意：这里不清理，保持文档持久化
      console.log(`📄 Document ${docName} has no active connections`);
    }
  });
}, 30000); // 每30秒检查一次

wss.on('connection', (ws, req) => {
  const url = req.url;
  const remoteAddress = req.socket.remoteAddress;
  
  console.log(`🔗 New WebSocket connection from ${remoteAddress} to ${url}`);
  
  try {
    // 使用 y-websocket 的标准处理函数
    // 这会自动处理 Yjs 的二进制协议和文档同步
    setupWSConnection(ws, req, {
      // 自定义文档获取函数
      docName: (req) => {
        const url = req.url;
        
        // 从 URL 中提取文档名
        if (url.includes('?')) {
          // 支持查询参数格式: /signaling?room=gestell-xxx
          const params = new URLSearchParams(url.split('?')[1]);
          const room = params.get('room');
          if (room) {
            return room;
          }
        }
        
        // 支持路径格式: /signaling/gestell-xxx
        const pathParts = url.split('/');
        if (pathParts.length >= 3) {
          return pathParts[2];
        }
        
        // 默认文档名
        return 'default-room';
      },
      
      // 自定义文档获取函数
      getYDoc: (docName) => {
        console.log(`📄 Accessing document: ${docName}`);
        return getYDoc(docName);
      },
      
      // 垃圾回收选项
      gc: false
    });
    
  } catch (error) {
    console.error('❌ Error setting up WebSocket connection:', error);
    ws.close(1011, 'Server error');
  }
});

// 错误处理
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  
  // 保存所有文档状态（可选）
  docs.forEach((doc, docName) => {
    console.log(`💾 Document ${docName} has ${doc.getArray('content').length} items`);
  });
  
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`🚀 Gestell Yjs collaboration server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/signaling`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📄 Supported URL formats:`);
  console.log(`   - ws://localhost:${PORT}/signaling/room-name`);
  console.log(`   - ws://localhost:${PORT}/signaling?room=room-name`);
});