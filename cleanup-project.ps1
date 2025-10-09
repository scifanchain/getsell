# Gestell 项目清理脚本
# 清理废弃文件和空文件夹，保持项目结构整洁
# 使用方法: .\cleanup-project.ps1

Write-Host "🧹 开始清理 Gestell 项目..." -ForegroundColor Green

# 记录清理的文件
$cleanedFiles = @()
$cleanedDirs = @()

# 函数：安全删除文件
function Remove-SafeFile {
    param($FilePath, $Description)
    if (Test-Path $FilePath) {
        Remove-Item $FilePath -ErrorAction SilentlyContinue
        if (-not (Test-Path $FilePath)) {
            $script:cleanedFiles += "$FilePath - $Description"
            Write-Host "  ✅ 删除文件: $FilePath" -ForegroundColor Yellow
        }
    }
}

# 函数：安全删除目录
function Remove-SafeDirectory {
    param($DirPath, $Description)
    if (Test-Path $DirPath) {
        $itemCount = (Get-ChildItem $DirPath -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
        if ($itemCount -eq 0) {
            Remove-Item $DirPath -Recurse -ErrorAction SilentlyContinue
            if (-not (Test-Path $DirPath)) {
                $script:cleanedDirs += "$DirPath - $Description"
                Write-Host "  ✅ 删除空目录: $DirPath" -ForegroundColor Cyan
            }
        } else {
            Write-Host "  ⚠️  跳过非空目录: $DirPath (包含 $itemCount 个项目)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n🔴 第一阶段：删除已废弃的文件" -ForegroundColor Red

# 删除旧的渲染进程文件
Remove-SafeFile "src\renderer.js" "旧渲染进程脚本"
Remove-SafeFile "src\main.js" "旧主进程脚本"
Remove-SafeFile "src\index.html" "旧HTML入口文件"
Remove-SafeFile "src\index-new.html" "实验性HTML文件"
Remove-SafeFile "src\styles.css" "旧全局样式文件"

Write-Host "`n🟡 第二阶段：删除已废弃的目录" -ForegroundColor Yellow

# 删除旧的目录结构
Remove-SafeDirectory "src\styles" "旧样式目录"
Remove-SafeDirectory "src\scripts" "旧脚本目录" 
Remove-SafeDirectory "src\types" "旧类型定义目录"

Write-Host "`n🔵 第三阶段：删除空的计划目录" -ForegroundColor Blue

# 删除空的计划目录
Remove-SafeDirectory "src\shared" "空的共享代码目录"
Remove-SafeDirectory "src\editor" "空的编辑器目录"
Remove-SafeDirectory "src\blockchain" "空的区块链目录"
Remove-SafeDirectory "src\ui\composables" "空的组合式函数目录"

Write-Host "`n🟢 第四阶段：删除未使用的文件" -ForegroundColor Green

# 删除未使用的文件
Remove-SafeFile "src\ui\stores\system.ts" "未使用的系统状态管理"
Remove-SafeFile "vite.config.js.map" "旧配置文件的source map"

Write-Host "`n🧽 第五阶段：清理构建缓存" -ForegroundColor Magenta

# 可选：清理构建缓存 (谨慎使用)
$clearCache = Read-Host "是否清理构建缓存？(y/N)"
if ($clearCache -eq "y" -or $clearCache -eq "Y") {
    Remove-SafeDirectory "dist" "主进程构建输出"
    Remove-SafeDirectory "dist-web" "前端构建输出" 
    Remove-SafeDirectory "node_modules\.cache" "Node模块缓存"
    Write-Host "  ✅ 构建缓存已清理" -ForegroundColor Green
}

Write-Host "`n📊 清理统计报告:" -ForegroundColor White -BackgroundColor DarkBlue

Write-Host "`n已清理的文件 ($($cleanedFiles.Count) 个):" -ForegroundColor Green
foreach ($file in $cleanedFiles) {
    Write-Host "  • $file" -ForegroundColor Gray
}

Write-Host "`n已清理的目录 ($($cleanedDirs.Count) 个):" -ForegroundColor Cyan  
foreach ($dir in $cleanedDirs) {
    Write-Host "  • $dir" -ForegroundColor Gray
}

# 验证关键文件是否存在
Write-Host "`n🔍 验证关键文件:" -ForegroundColor Magenta

$criticalFiles = @(
    "src\main.ts",
    "src\preload.js", 
    "src\ui\main.ts",
    "src\ui\App.vue",
    "src\ui\index.html",
    "package.json",
    "vite.config.ts"
)

$allCriticalExist = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file - 缺失！" -ForegroundColor Red
        $allCriticalExist = $false
    }
}

if ($allCriticalExist) {
    Write-Host "`n🎉 项目清理完成！所有关键文件完整。" -ForegroundColor Green -BackgroundColor DarkGreen
    Write-Host "建议执行以下命令验证项目:" -ForegroundColor White
    Write-Host "  npm run build" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  警告：部分关键文件缺失，请检查项目完整性。" -ForegroundColor Red -BackgroundColor DarkRed
}

Write-Host "`n📋 后续建议:" -ForegroundColor Cyan
Write-Host "  1. 运行 'npm run build' 验证构建" -ForegroundColor White  
Write-Host "  2. 运行 'npm run dev' 测试开发环境" -ForegroundColor White
Write-Host "  3. 提交清理后的代码: git add . && git commit -m 'clean: remove legacy files'" -ForegroundColor White
Write-Host "  4. 更新 README.md 项目结构说明" -ForegroundColor White

Write-Host "`n✨ Gestell 项目清理完成！" -ForegroundColor Green