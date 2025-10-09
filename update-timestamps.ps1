# 批量替换 BigInt 时间戳为 Date 对象的 PowerShell 脚本

$files = @(
    "src\data\prisma\ChapterRepository.ts",
    "src\data\prisma\ContentRepository.ts", 
    "src\data\prisma\UserRepository.ts",
    "src\data\prisma\WorkRepository.ts",
    "src\data\prisma\StatsRepository.ts",
    "src\core\prismadb.ts",
    "src\core\database.ts",
    "src\services\UserService.ts",
    "src\services\WorkService.ts",
    "src\services\ContentService.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "更新文件: $file"
        
        # 读取文件内容
        $content = Get-Content $file -Raw
        
        # 替换 BigInt(Date.now()) 为 getCurrentTimestamp()
        $content = $content -replace 'const timestamp = BigInt\(Date\.now\(\)\);', 'const timestamp = getCurrentTimestamp();'
        $content = $content -replace 'BigInt\(Date\.now\(\)\)', 'getCurrentTimestamp()'
        
        # 添加导入语句（如果不存在）
        if ($content -notmatch "import.*getCurrentTimestamp.*from.*timestamp") {
            $importLine = "import { getCurrentTimestamp } from '../../utils/timestamp';"
            if ($file -match "services") {
                $importLine = "import { getCurrentTimestamp } from '../utils/timestamp';"
            } elseif ($file -match "core") {
                $importLine = "import { getCurrentTimestamp } from '../utils/timestamp';"
            }
            
            # 在第一个import之后添加新的import
            $content = $content -replace "(import.*?;)", "`$1`n$importLine"
        }
        
        # 写回文件
        Set-Content $file $content -Encoding UTF8
        Write-Host "完成: $file"
    }
}

Write-Host "所有文件更新完成！"