# Gestell ✍️

**优雅的写作工具，让创作更简单**

一个基于 Electron + Vue 3 + TypeScript 构建的现代化桌面写作应用，专为作家、博主和内容创作者设计。

## ✨ 主要特性

- 🎨 **现代化界面** - Vue 3 + TypeScript 构建的优雅 UI
- 📝 **智能编辑器** - 专为写作优化的编辑环境  
- 📁 **项目管理** - 支持多项目和章节组织
- 💾 **本地存储** - 基于 Prisma + SQLite 的可靠数据存储
- 🌙 **主题切换** - 支持深色/浅色模式
- ⚡ **快速响应** - Vite 构建系统提供极速开发体验

## 🏗️ 技术架构

### 技术栈
- **桌面框架**: Electron 33.x
- **前端框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **路由管理**: Vue Router 4
- **构建工具**: Vite 6.x
- **数据库**: Prisma + SQLite
- **样式方案**: 原生 CSS + 响应式设计

### 项目结构

```
gestell/
├── src/                           # 源代码目录
│   ├── main.ts                   # Electron 主进程 (TypeScript)
│   ├── preload.js                # 预加载脚本 (IPC 桥接)
│   ├── core/                     # 核心业务逻辑
│   │   ├── prismadb.js          # Prisma 数据库配置
│   │   └── ulid.js              # ULID 生成器
│   ├── crypto/                   # 加密工具
│   ├── migrations/               # 数据库迁移文件
│   ├── utils/                    # 工具函数
│   └── ui/                       # Vue 3 前端应用
│       ├── index.html           # 应用入口页面
│       ├── main.ts              # Vue 应用入口
│       ├── App.vue              # 根组件
│       ├── components/          # 可复用组件
│       │   ├── ArchitectureTest.vue  # 架构测试组件
│       │   ├── StatusBar.vue         # 状态栏
│       │   └── TitleBar.vue          # 标题栏
│       ├── views/               # 页面视图
│       │   ├── HomeView.vue     # 主页
│       │   ├── LoginView.vue    # 登录页
│       │   ├── ProjectView.vue  # 项目详情
│       │   ├── EditorView.vue   # 编辑器
│       │   ├── SettingsView.vue # 设置页
│       │   └── AboutView.vue    # 关于页
│       ├── stores/              # Pinia 状态管理
│       │   ├── app.ts           # 应用全局状态
│       │   ├── user.ts          # 用户状态
│       │   ├── project.ts       # 项目状态
│       │   └── chapter.ts       # 章节状态
│       ├── router/              # Vue Router 配置
│       ├── services/            # API 服务层
│       └── types/               # TypeScript 类型定义
├── prisma/                       # 数据库相关
│   ├── schema.prisma            # 数据库模式定义
│   └── migrations/              # 迁移历史
├── assets/                       # 静态资源
├── dist/                         # 主进程构建输出
├── dist-web/                     # 前端构建输出
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts               # Vite 构建配置
└── cleanup-project.ps1          # 项目清理脚本
```

## 🚀 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn
- Git

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
# 启动开发服务器 (前端热重载 + Electron)
npm run dev

# 或分别启动
npm run dev:vite    # 启动 Vite 开发服务器
npm run dev:electron # 启动 Electron (需要先启动 Vite)
```

### 构建项目
```bash
# 构建整个项目
npm run build

# 分别构建
npm run build:main   # 构建主进程 (TypeScript)
npm run build:web    # 构建前端 (Vue + Vite)
```

### 运行应用
```bash
# 构建并启动应用
npm start

# 清理构建缓存
npm run clean
```

## 🧹 项目维护

### 清理废弃文件
```bash
# 运行自动清理脚本
.\cleanup-project.ps1
```

### 数据库管理
```bash
# 生成 Prisma 客户端
npx prisma generate

# 查看数据库
npx prisma studio

# 重置数据库
npx prisma migrate reset
```

## 📚 开发指南

### 添加新页面
1. 在 `src/ui/views/` 创建 Vue 组件
2. 在 `src/ui/router/index.ts` 添加路由
3. 在导航组件中添加链接

### 添加新功能
1. 在 `src/ui/stores/` 创建状态管理
2. 在 `src/ui/services/` 添加 API 调用
3. 在主进程 `src/main.ts` 添加 IPC 处理

### 数据库操作
1. 修改 `prisma/schema.prisma`
2. 运行 `npx prisma migrate dev`
3. 更新相关类型定义

## 🔧 配置说明

### 环境变量 (.env)
```env
# 数据库连接
DATABASE_URL="file:./data/gestell.db"

# 开发模式设置
NODE_ENV=development
```

### TypeScript 配置
- `tsconfig.json` - 全局 TS 配置
- `tsconfig.main.json` - 主进程专用配置
- `src/ui/vite-env.d.ts` - Vite 环境类型

## 🚦 项目状态

- ✅ **架构迁移完成**: Vue 3 + TypeScript
- ✅ **数据库集成**: Prisma + SQLite  
- ✅ **状态管理**: Pinia stores
- ✅ **路由系统**: Vue Router
- 🔄 **正在开发**: 编辑器功能
- 📋 **计划中**: 插件系统

## 📋 文档

- [项目结构分析](./PROJECT_STRUCTURE_ANALYSIS.md) - 详细的项目结构和清理指南
- [清理脚本](./cleanup-project.ps1) - 自动化项目清理工具

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

---

**Gestell** - 让写作成为享受 ✨