#!/bin/bash

echo "🚀 Starting Gestell Yjs Server..."

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 启动服务器
echo "🔗 Starting WebSocket server on port 3001..."
npm start