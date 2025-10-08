# PowerShell脚本：设置编译环境
# 使用方法：在项目根目录运行 .\setup-build-env.ps1

Write-Host "🔧 配置 Node.js 原生模块编译环境..." -ForegroundColor Green

# 设置环境变量
$env:npm_config_msvs_version = "2022"
$env:GYP_MSVS_VERSION = "2022"
$env:npm_config_disturl = "https://electronjs.org/headers"
$env:npm_config_target = "32.0.0"  # Electron版本
$env:npm_config_arch = "x64"
$env:npm_config_target_arch = "x64"
$env:npm_config_cache = "$env:USERPROFILE\.electron-gyp"
$env:npm_config_build_from_source = "true"

Write-Host "✅ 环境变量已设置" -ForegroundColor Green
Write-Host "📦 当前配置:" -ForegroundColor Cyan
Write-Host "   Visual Studio: $env:npm_config_msvs_version" -ForegroundColor White
Write-Host "   Node.js: $(node --version)" -ForegroundColor White
Write-Host "   Python: $(python3 --version)" -ForegroundColor White

Write-Host "🚀 现在可以运行: npm install" -ForegroundColor Yellow