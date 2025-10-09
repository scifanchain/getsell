#!/usr/bin/env pwsh
# 开发脚本：实时编译TypeScript并启动应用

Write-Host "🔄 启动TypeScript实时编译模式..." -ForegroundColor Green

# 启动TypeScript监听模式（后台）
Start-Process pwsh -ArgumentList "-Command", "cd '$PWD'; npm run build:watch" -WindowStyle Hidden

# 等待一下确保编译完成
Start-Sleep 3

# 启动应用
npm start