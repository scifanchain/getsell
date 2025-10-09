# Gestell ✍️

**基于现代技术栈的去中心化科幻写作平台**

一个采用 Clean Architecture 和 Repository Pattern 构建的现代化桌面写作应用，专为科幻作家和内容创作者设计，支持去中心化协作和版本控制。

## ✨ 核心特性

- 🎨 **现代化界面** - Vue 3 + TypeScript + Pinia 构建的响应式 UI
- 📝 **专业编辑器** - ProseMirror 富文本编辑器，支持 Markdown 和科幻写作专用功能
- 🏗️ **清洁架构** - Repository Pattern + DI 容器，高度可测试和可维护
- � **加密安全** - 内置 RSA/AES 加密，保护创作内容和用户隐私
- �📁 **项目管理** - 支持多作品、章节树状结构和协作管理
- 💾 **本地优先** - Prisma + SQLite，可靠的本地数据存储
- � **去中心化** - 支持区块链同步和去中心化协作
- ⚡ **极速体验** - Vite 6.x 构建系统 + Electron 32.x

## 🏗️ 技术架构

### 核心技术栈
```
┌─────────────────────────────────────────┐
│              Presentation Layer          │
│  Vue 3 + TypeScript + Pinia + Router   │
├─────────────────────────────────────────┤
│              Application Layer          │
│     Services + IPC Handlers            │
├─────────────────────────────────────────┤
│              Domain Layer               │
│  Repository Interfaces + Business Logic │
├─────────────────────────────────────────┤
│            Infrastructure Layer         │
│  Prisma Repositories + SQLite + Crypto │
└─────────────────────────────────────────┘
```

### 技术选型
- **桌面框架**: Electron 32.x (主进程 + 渲染进程)
- **前端框架**: Vue 3 + Composition API + TypeScript 5.x
- **状态管理**: Pinia (替代 Vuex)
- **路由管理**: Vue Router 4
- **构建工具**: Vite 6.x (前端) + TypeScript Compiler (主进程)
- **数据库**: Prisma 6.x + SQLite (类型安全的 ORM)
- **富文本编辑**: ProseMirror (可扩展的编辑器)
- **加密**: Node.js Crypto API (RSA + AES)
- **ID 生成**: ULID (时间排序的唯一标识符)

## 📁 项目结构

```
gestell/
├── src/                          # 源代码目录
│   ├── main.ts                   # Electron 主进程入口
│   ├── preload.js                # 渲染进程预加载脚本
│   │
│   ├── core/                     # 核心基础设施
│   │   ├── database.ts           # 数据库管理器 (新架构)
│   │   ├── prismadb.ts           # Prisma 数据库操作 (旧架构兼容)
│   │   └── ulid.ts               # ULID 生成器 (TypeScript)
│   │
│   ├── crypto/                   # 加密模块
│   │   └── crypto.ts             # RSA/AES 加密服务
│   │
│   ├── data/                     # Repository 层 (Clean Architecture)
│   │   ├── interfaces/           # Repository 接口定义
│   │   │   ├── IDatabaseManager.ts      # 数据库管理器接口
│   │   │   ├── IUserRepository.ts       # 用户数据接口
│   │   │   ├── IWorkRepository.ts       # 作品数据接口
│   │   │   ├── IChapterRepository.ts    # 章节数据接口
│   │   │   ├── IContentRepository.ts    # 内容数据接口
│   │   │   └── IStatsRepository.ts      # 统计数据接口
│   │   ├── prisma/               # Prisma 具体实现
│   │   │   ├── UserRepository.ts         # 用户仓储实现
│   │   │   ├── WorkRepository.ts         # 作品仓储实现 (待实现)
│   │   │   ├── ChapterRepository.ts     # 章节仓储实现 (待实现)
│   │   │   ├── ContentRepository.ts     # 内容仓储实现 (待实现)
│   │   │   └── StatsRepository.ts       # 统计仓储实现 (待实现)
│   │   └── RepositoryContainer.ts       # DI 容器
│   │
│   ├── shared/                   # 共享类型和工具
│   │   └── types.ts              # 通用类型定义
│   │
│   ├── generated/                # Prisma 生成代码
│   │   └── prisma/               # Prisma Client 生成文件
│   │
│   └── ui/                       # Vue 3 前端应用
│       ├── index.html            # 应用入口页面
│       ├── main.ts               # Vue 应用启动入口
│       ├── App.vue               # 根组件
│       ├── style.css             # 全局样式
│       │
│       ├── components/           # 可复用组件
│       │   ├── ArchitectureTest.vue     # 架构测试组件
│       │   ├── ChapterNode.vue          # 章节树节点
│       │   ├── ChapterTree.vue          # 章节树组件
│       │   ├── ProseMirrorEditor.vue    # 富文本编辑器
│       │   ├── StatusBar.vue            # 状态栏
│       │   └── TitleBar.vue             # 自定义标题栏
│       │
│       ├── views/                # 页面视图
│       │   ├── HomeView.vue             # 主页
│       │   ├── LoginView.vue            # 登录页
│       │   ├── WorkView.vue             # 作品管理
│       │   ├── EditorView.vue           # 编辑器主界面
│       │   ├── EditorTestView.vue       # 编辑器测试页
│       │   ├── SettingsView.vue         # 设置页
│       │   └── AboutView.vue            # 关于页
│       │
│       ├── stores/               # Pinia 状态管理
│       │   ├── index.ts                 # Store 导出
│       │   ├── app.ts                   # 应用全局状态
│       │   ├── user.ts                  # 用户状态
│       │   ├── work.ts                  # 作品状态
│       │   └── chapter.ts               # 章节状态
│       │
│       ├── router/               # Vue Router 配置
│       │   └── index.ts                 # 路由定义
│       │
│       ├── services/             # API 服务层
│       │   └── api.ts                   # IPC 通信封装
│       │
│       ├── types/                # UI 类型定义
│       │   ├── electron.ts              # Electron IPC 类型
│       │   └── models.ts                # 前端数据模型
│       │
│       ├── utils/                # UI 工具函数
│       │   └── prosemirror-menu.ts     # 编辑器菜单配置
│       │
│       └── vite-env.d.ts         # Vite 环境类型声明
│
├── prisma/                       # 数据库相关
│   ├── schema.prisma             # 数据库模式定义
│   └── migrations/               # 数据库迁移历史
│       ├── migration_lock.toml            # 迁移锁文件
│       ├── 20241009120000_baseline/       # 基线迁移
│       └── 20251009123912_update_content_format_to_prosemirror/
│
├── data/                         # 应用数据目录
│   └── gestell.db                # 主数据库文件
│
├── dist/                         # 构建输出目录
│   ├── main.js                   # 编译后的主进程
│   ├── core/                     # 核心模块构建结果
│   ├── data/                     # Repository 层构建结果
│   ├── generated/                # Prisma 生成代码
│   └── renderer/                 # 前端构建结果
│       ├── assets/               # CSS/JS 资源文件
│       └── src/ui/index.html     # 前端入口页面
│
├── test/                         # 测试相关
│   ├── integration.html          # 集成测试页面
│   └── temp/                     # 临时测试文件
│
├── assets/                       # 应用资源
├── .env                          # 环境变量配置
├── .env.example                  # 环境变量示例
├── .gitignore                    # Git 忽略规则
├── package.json                  # 项目配置和依赖
├── tsconfig.json                 # TypeScript 全局配置
├── tsconfig.main.json            # 主进程 TypeScript 配置
├── vite.config.ts                # Vite 构建配置
├── cleanup-project.ps1           # 项目清理脚本
└── dev.ps1                       # 开发启动脚本
```
## 🚀 快速开始

### 环境要求
- **Node.js**: 18.x 或更高版本
- **npm**: 8.x 或更高版本
- **操作系统**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 18.04+)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd gestell
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，设置数据库路径等配置
   ```

4. **初始化数据库**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

### 开发模式

```bash
# 方式一：使用开发脚本 (推荐)
.\dev.ps1

# 方式二：手动启动
npm run dev         # 同时启动前端和 Electron
# 或分别启动
npm run dev:vite    # 启动 Vite 开发服务器 (http://localhost:3000)
npm run dev:electron # 启动 Electron (需要先启动 Vite)
```

### 构建和部署

```bash
# 构建整个项目
npm run build

# 分别构建 (用于调试)
npm run build:main  # 构建主进程 (TypeScript → JavaScript)
npm run build:web   # 构建前端 (Vue → 静态资源)

# 运行构建后的应用
npm start

# 清理构建缓存
npm run clean
```

## 🏛️ 架构详解

### Clean Architecture 分层

1. **Presentation Layer (UI层)**
   - Vue 3 组件和页面
   - Pinia 状态管理
   - Vue Router 路由管理

2. **Application Layer (应用层)**
   - IPC 处理器 (main.ts)
   - 服务类 (services/)
   - 业务逻辑协调

3. **Domain Layer (领域层)**
   - Repository 接口定义
   - 业务实体和规则
   - 领域服务

4. **Infrastructure Layer (基础设施层)**
   - Prisma Repository 实现
   - 数据库连接管理
   - 文件系统和加密服务

### Repository Pattern

```typescript
// 接口定义 (Domain Layer)
interface IUserRepository {
    findById(id: string): Promise<User | null>;
    create(userData: CreateUserData): Promise<User>;
    update(id: string, userData: UpdateUserData): Promise<User>;
    delete(id: string): Promise<void>;
}

// 具体实现 (Infrastructure Layer)
class PrismaUserRepository implements IUserRepository {
    constructor(private prisma: PrismaClient) {}
    
    async findById(id: string): Promise<User | null> {
        return await this.prisma.author.findUnique({ where: { id } });
    }
    // ... 其他方法实现
}

// 依赖注入容器
class RepositoryContainer {
    getUserRepository(): IUserRepository {
        return new PrismaUserRepository(this.prisma);
    }
}
```

### 数据流架构

```
┌─────────────┐    IPC     ┌──────────────┐    Repository    ┌──────────────┐
│   Vue UI    │ ◄────────► │  Main Process │ ◄──────────────► │   Database   │
│  (Renderer) │            │  (Services)   │                  │   (SQLite)   │
└─────────────┘            └──────────────┘                  └──────────────┘
      ▲                             ▲
      │                             │
      ▼                             ▼
┌─────────────┐            ┌──────────────┐
│    Pinia    │            │ Repository   │
│   Stores    │            │  Container   │
└─────────────┘            └──────────────┘
```

## 🔧 配置说明

### 环境变量 (.env)
```env
# 数据库配置
DATABASE_URL="file:D:/gestell/data/gestell.db"

# 开发模式设置
NODE_ENV=development

# 应用配置
ELECTRON_IS_DEV=true
```

### 数据库配置 (prisma/schema.prisma)
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### 构建配置

**主进程构建** (tsconfig.main.json):
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "target": "ES2020",
    "module": "CommonJS"
  },
  "include": ["src/main.ts", "src/core/**/*", "src/data/**/*", "src/crypto/**/*"],
  "exclude": ["src/ui/**/*"]
}
```

**前端构建** (vite.config.ts):
```typescript
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/ui/index.html')
      }
    }
  }
});
```

## � 开发状态

### ✅ 已完成
- Clean Architecture 基础架构
- Repository Pattern 实现
- TypeScript 全面迁移 (ulid.js → ulid.ts, crypto.js → crypto.ts 等)
- 数据库管理器重构
- 构建系统优化 (统一 dist/ 目录)
- 环境变量配置 (dotenv 集成)
- 用户 Repository 完整实现

### 🚧 进行中
- 其他 Repository 实现 (Work, Chapter, Content, Stats)
- Service 层重构
- IPC 处理器迁移到新架构

### 📋 计划中
- 单元测试覆盖
- 集成测试套件
- 性能优化
- 错误处理增强
- 日志系统完善

## 🧪 测试

```bash
# 运行测试 (计划中)
npm test

# 运行性能测试
npm run test:performance

# 检查类型
npm run type-check
```

## � 开发工具

### 数据库管理
```bash
# 启动 Prisma Studio (数据库可视化)
npx prisma studio

# 查看数据库状态
npx prisma migrate status

# 生成新迁移
npx prisma migrate dev --name <migration_name>

# 重置数据库
npx prisma migrate reset
```

### 项目维护
```bash
# 清理项目 (删除生成文件和缓存)
.\cleanup-project.ps1

# 重新生成 Prisma Client
npx prisma generate

# 检查依赖更新
npm outdated
```

## 🎯 设计原则

1. **依赖倒置**: 高层模块不依赖低层模块，都依赖抽象
2. **单一职责**: 每个类和模块只有一个变化的理由
3. **开闭原则**: 对扩展开放，对修改关闭
4. **接口隔离**: 不依赖不需要的接口
5. **类型安全**: 充分利用 TypeScript 的类型系统

## � 故障排除

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查数据库文件权限
   ls -la data/gestell.db
   
   # 检查环境变量
   echo $DATABASE_URL
   ```

2. **构建错误**
   ```bash
   # 清理并重新构建
   npm run clean
   npm run build
   ```

3. **开发服务器无法启动**
   ```bash
   # 检查端口占用
   netstat -ano | findstr :3000
   
   # 重启开发服务器
   npm run dev:vite
   ```

## 📚 相关文档

- [Electron 官方文档](https://www.electronjs.org/docs)
- [Vue 3 官方文档](https://vuejs.org/)
- [Prisma 官方文档](https://www.prisma.io/docs)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs)
- [Clean Architecture 介绍](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

## �📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 并保持严格的类型检查
- 遵循 Repository Pattern 和 Clean Architecture 原则
- 编写有意义的提交信息
- 添加必要的注释和文档

---

**Gestell** - 现代化的科幻写作平台，让创作更智能、更安全、更协作 ✨