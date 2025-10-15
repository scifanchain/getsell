#!/usr/bin/env pwsh

# 安全的开发启动脚本，避免VS Code卡死

Write-Host "🔧 检查并清理现有进程..." -ForegroundColor Yellow

# 检查并终止现有的node进程（如果有）
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "发现现有的Node.js进程，正在终止..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# 检查端口占用
$port3000 = netstat -ano | Select-String ":3000"
$port3001 = netstat -ano | Select-String ":3001"

if ($port3000) {
    Write-Host "端口3000被占用，请检查并手动终止相关进程" -ForegroundColor Red
    exit 1
}

if ($port3001) {
    Write-Host "端口3001被占用，请检查并手动终止相关进程" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 环境检查完成，开始启动开发服务器..." -ForegroundColor Green

# 设置Node.js内存限制，避免内存溢出
$env:NODE_OPTIONS = "--max-old-space-size=4096"

# 先启动Vite开发服务器
Write-Host "🚀 启动Vite开发服务器..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev:vite"

# 等待Vite服务器启动
Write-Host "⏳ 等待Vite服务器启动..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 1
    $response = $null
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 1 -ErrorAction SilentlyContinue
    } catch {
        # 忽略错误，继续等待
    }
} while (!$response)

Write-Host "✅ Vite服务器已启动" -ForegroundColor Green

# 构建主进程
Write-Host "🔨 构建主进程..." -ForegroundColor Cyan
npm run build:main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 主进程构建失败" -ForegroundColor Red
    exit 1
}

# 启动Electron
Write-Host "⚡ 启动Electron应用..." -ForegroundColor Cyan
npx electron dist/main.js --dev

Write-Host "🎉 开发环境启动完成！" -ForegroundColor Green