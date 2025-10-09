# Gestell 项目结构分析与清理文档

## 📊 项目概览
**生成时间**: 2025年10月9日  
**项目名称**: Gestell - 优雅的写作工具  
**技术栈**: Electron + Vue 3 + TypeScript + Prisma + SQLite  

---

## 🏗️ 当前项目结构

### 根目录
```
gestell/
├── .env                          # 环境变量配置
├── .git/                         # Git 版本控制
├── .gitignore                    # Git 忽略文件
├── .npmrc                        # NPM 配置
├── gestell.code-workspace        # VSCode 工作区配置
├── package.json                  # 项目依赖配置
├── package-lock.json             # 锁定依赖版本
├── tsconfig.json                 # TypeScript 配置
├── tsconfig.main.json            # 主进程 TS 配置
├── vite.config.ts               # Vite 构建配置
├── README.md                     # 项目说明文档
├── dev.ps1                       # 开发启动脚本
├── setup-build-env.ps1          # 构建环境设置脚本
├── assets/                       # 静态资源
├── data/                         # 数据存储目录
├── dist/                         # 主进程构建输出
├── dist-web/                     # 前端构建输出
├── node_modules/                 # 依赖包
├── prisma/                       # 数据库配置
├── src/                          # 源代码
└── test/                         # 测试文件
```

### 源代码结构 (`src/`)
```
src/
├── 🎯 ACTIVE FILES (当前使用)
│   ├── main.ts                   # ✅ Electron 主进程 (TypeScript)
│   ├── preload.js                # ✅ 预加载脚本 (IPC 桥接)
│   ├── core/                     # ✅ 核心业务逻辑
│   │   ├── prismadb.js          # ✅ Prisma 数据库配置
│   │   └── database.js          # ✅ 数据库操作接口
│   ├── crypto/                   # ✅ 加密相关
│   │   └── crypto.js            # ✅ 加密工具函数
│   ├── generated/                # ✅ Prisma 生成文件
│   ├── migrations/               # ✅ 数据库迁移文件
│   ├── utils/                    # ✅ 工具函数
│   └── ui/                       # ✅ Vue 3 前端应用
│       ├── index.html           # ✅ 入口 HTML
│       ├── main.ts              # ✅ Vue 应用入口
│       ├── App.vue              # ✅ 根组件
│       ├── style.css            # ✅ 全局样式
│       ├── vite-env.d.ts        # ✅ Vite 类型定义
│       ├── components/          # ✅ Vue 组件
│       │   ├── ArchitectureTest.vue  # ✅ 架构测试组件
│       │   ├── StatusBar.vue         # ✅ 状态栏组件
│       │   └── TitleBar.vue          # ✅ 标题栏组件
│       ├── views/               # ✅ 页面视图
│       │   ├── HomeView.vue     # ✅ 主页
│       │   ├── AboutView.vue    # ✅ 关于页
│       │   ├── LoginView.vue    # ✅ 登录页
│       │   ├── ProjectView.vue  # ✅ 项目详情页
│       │   ├── EditorView.vue   # ✅ 编辑器页
│       │   └── SettingsView.vue # ✅ 设置页
│       ├── stores/              # ✅ Pinia 状态管理
│       │   ├── index.ts         # ✅ Store 入口
│       │   ├── app.ts           # ✅ 应用全局状态
│       │   ├── user.ts          # ✅ 用户状态
│       │   ├── project.ts       # ✅ 项目状态
│       │   ├── chapter.ts       # ✅ 章节状态
│       │   └── system.ts        # ⚠️ 旧系统状态 (可删除)
│       ├── router/              # ✅ Vue Router 配置
│       │   └── index.ts         # ✅ 路由配置
│       ├── services/            # ✅ API 服务层
│       │   └── api.ts           # ✅ IPC 通信封装
│       ├── types/               # ✅ TypeScript 类型
│       │   ├── electron.ts      # ✅ Electron 类型定义
│       │   └── models.ts        # ✅ 数据模型类型
│       └── composables/         # 📁 空文件夹 (可删除)
│
└── 🗑️ LEGACY FILES (遗留文件 - 待清理)
    ├── main.js                   # ❌ 旧主进程 (已被 main.ts 替代)
    ├── renderer.js               # ❌ 旧渲染进程 (已迁移到 Vue 3)
    ├── index.html               # ❌ 旧 HTML 入口 (已迁移到 ui/)
    ├── index-new.html           # ❌ 实验性文件 (未使用)
    ├── styles.css               # ❌ 旧全局样式 (已迁移到 ui/)
    ├── styles/                  # ❌ 旧样式目录
    │   └── main.css             # ❌ 旧主样式文件
    ├── scripts/                 # ❌ 旧脚本目录
    │   └── main.js              # ❌ 旧主脚本
    ├── types/                   # ❌ 旧类型定义 (已迁移到 ui/types/)
    │   ├── interfaces.ts        # ❌ 旧接口定义
    │   └── modules.d.ts         # ❌ 旧模块定义
    ├── shared/                  # 📁 空文件夹 (计划使用但未实现)
    ├── editor/                  # 📁 空文件夹 (计划使用但未实现)
    └── blockchain/              # 📁 空文件夹 (计划使用但未实现)
```

---

## 🧹 推荐清理的文件和文件夹

### 🔴 立即删除 - 已废弃的文件
```bash
# 旧的渲染进程文件 (已迁移到 Vue 3)
src/renderer.js
src/index.html
src/index-new.html
src/styles.css

# 旧的样式和脚本目录
src/styles/
src/scripts/

# 旧的主进程文件 (已被 TypeScript 版本替代)
src/main.js

# 旧的类型定义 (已迁移到 ui/types/)
src/types/

# 未使用的系统状态管理
src/ui/stores/system.ts
```

### 🟡 可选删除 - 空文件夹
```bash
# 空的计划目录 (如果确定不使用)
src/shared/          # 共享代码目录 (计划中)
src/editor/          # 编辑器目录 (计划中)  
src/blockchain/      # 区块链目录 (计划中)
src/ui/composables/  # Vue 组合式函数目录 (暂未使用)
```

### 🟢 保留但可重构
```bash
# 构建配置文件
vite.config.d.ts      # Vite 配置类型声明 (构建生成)
vite.config.d.ts.map  # Source map (构建生成)
vite.config.js.map    # 旧配置的 map 文件 (可删除)
```

---

## 📋 清理脚本

### PowerShell 清理命令
```powershell
# 删除已废弃的文件
Remove-Item "src\renderer.js" -ErrorAction SilentlyContinue
Remove-Item "src\main.js" -ErrorAction SilentlyContinue
Remove-Item "src\index.html" -ErrorAction SilentlyContinue
Remove-Item "src\index-new.html" -ErrorAction SilentlyContinue
Remove-Item "src\styles.css" -ErrorAction SilentlyContinue

# 删除已废弃的目录
Remove-Item "src\styles" -Recurse -ErrorAction SilentlyContinue
Remove-Item "src\scripts" -Recurse -ErrorAction SilentlyContinue
Remove-Item "src\types" -Recurse -ErrorAction SilentlyContinue

# 删除空的计划目录 (可选)
Remove-Item "src\shared" -Recurse -ErrorAction SilentlyContinue
Remove-Item "src\editor" -Recurse -ErrorAction SilentlyContinue
Remove-Item "src\blockchain" -Recurse -ErrorAction SilentlyContinue
Remove-Item "src\ui\composables" -Recurse -ErrorAction SilentlyContinue

# 删除未使用的 store
Remove-Item "src\ui\stores\system.ts" -ErrorAction SilentlyContinue

# 删除构建生成的临时文件
Remove-Item "vite.config.js.map" -ErrorAction SilentlyContinue

Write-Host "✅ 项目清理完成！"
```

---

## 🎯 清理后的精简结构

```
src/
├── main.ts                      # Electron 主进程
├── preload.js                   # 预加载脚本
├── core/                        # 核心业务逻辑
├── crypto/                      # 加密工具
├── generated/                   # Prisma 生成文件
├── migrations/                  # 数据库迁移
├── utils/                       # 工具函数
└── ui/                          # Vue 3 前端应用
    ├── index.html              # 入口页面
    ├── main.ts                 # Vue 入口
    ├── App.vue                 # 根组件
    ├── style.css               # 全局样式
    ├── components/             # 组件
    ├── views/                  # 页面视图
    ├── stores/                 # 状态管理
    ├── router/                 # 路由配置
    ├── services/               # API 服务
    └── types/                  # 类型定义
```

---

## 📈 项目统计

### 文件数量统计
- **活跃文件**: ~45 个
- **废弃文件**: ~8 个
- **空文件夹**: ~4 个
- **清理后节省**: 约 15% 的文件数量

### 技术债务清理
- ✅ **主进程**: JavaScript → TypeScript 迁移完成
- ✅ **前端框架**: 传统 HTML/JS → Vue 3 + TypeScript 完成
- ✅ **状态管理**: 无状态 → Pinia 状态管理完成
- ✅ **路由系统**: 单页面 → Vue Router 多页面完成
- ✅ **构建系统**: 传统构建 → Vite 现代构建完成

---

## 🚀 架构优势

### 现代化架构
1. **类型安全**: 完整的 TypeScript 支持
2. **组件化**: Vue 3 Composition API
3. **响应式**: Pinia 状态管理
4. **模块化**: 清晰的文件组织
5. **开发体验**: Vite 热重载

### 可维护性提升
1. **代码复用**: 组件化架构
2. **类型检查**: 编译时错误检测
3. **调试友好**: Vue DevTools 支持
4. **文档清晰**: 自文档化的 TypeScript

### 性能优化
1. **按需加载**: Vue Router 懒加载
2. **Tree Shaking**: Vite 构建优化
3. **缓存策略**: 智能依赖管理
4. **开发效率**: 热重载 + 类型提示

---

## 📝 维护建议

### 短期 (1-2周)
1. ✅ **执行清理脚本**: 删除废弃文件
2. 🔄 **测试功能**: 确保清理后应用正常
3. 📚 **更新文档**: 同步 README.md

### 中期 (1个月)
1. 🎨 **UI 优化**: 完善组件样式
2. 🔧 **功能补全**: 实现核心业务逻辑
3. 🧪 **测试覆盖**: 添加单元测试

### 长期 (3个月)
1. 📦 **打包优化**: Electron Builder 配置
2. 🚀 **性能优化**: 代码分割和懒加载
3. 🔐 **安全加固**: 代码签名和更新机制

---

**文档生成时间**: 2025年10月9日  
**版本**: 1.0.0  
**状态**: Vue 3 + TypeScript 架构迁移完成  
**下一步**: 执行清理脚本，开始业务功能开发