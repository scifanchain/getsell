# 修复重复导入和剩余BigInt问题的PowerShell脚本

$files = @(
    "src\core\database.ts",
    "src\core\prismadb.ts",
    "src\data\prisma\ChapterRepository.ts",
    "src\data\prisma\ContentRepository.ts", 
    "src\data\prisma\UserRepository.ts",
    "src\data\prisma\WorkRepository.ts",
    "src\data\prisma\StatsRepository.ts",
    "src\services\UserService.ts",
    "src\services\WorkService.ts",
    "src\services\ContentService.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "修复文件: $file"
        
        # 读取文件内容
        $content = Get-Content $file -Raw
        
        # 移除重复的导入语句
        $lines = $content -split "`n"
        $uniqueLines = @()
        $importSeen = $false
        
        foreach ($line in $lines) {
            if ($line -match "import.*getCurrentTimestamp.*from.*timestamp") {
                if (-not $importSeen) {
                    $uniqueLines += $line
                    $importSeen = $true
                }
            } else {
                $uniqueLines += $line
            }
        }
        
        $content = $uniqueLines -join "`n"
        
        # 移除剩余的BigInt相关代码并替换为正确的类型
        $content = $content -replace 'timestamp: bigint', 'timestamp: Date'
        $content = $content -replace ': bigint\(\)', ': Date'
        $content = $content -replace 'const timestamp = .*BigInt.*', 'const timestamp = getCurrentTimestamp();'
        
        # 写回文件
        Set-Content $file $content -Encoding UTF8 -NoNewline
        Write-Host "完成: $file"
    }
}

Write-Host "修复完成！"