@echo off
echo 🚀 Starting Gestell Yjs Server...

REM 检查是否安装了依赖
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

REM 启动服务器
echo 🔗 Starting WebSocket server on port 3001...
npm start