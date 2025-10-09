# Gestell 项目架构分析报告# Gestell 项目结构分析与清理文档



**更新时间**: 2025年10月9日  ## 📊 项目概览

**架构版本**: Clean Architecture v2.0  **生成时间**: 2025年10月9日  

**技术栈**: Electron 32.x + Vue 3 + TypeScript + Prisma**项目名称**: Gestell - 优雅的写作工具  

**技术栈**: Electron + Vue 3 + TypeScript + Prisma + SQLite  

## 📋 执行摘要

---

本文档详细分析了 Gestell 项目在采用 Clean Architecture 和 Repository Pattern 重构后的技术架构、代码组织和最佳实践。项目已成功从混合 JavaScript/TypeScript 架构迁移到完全类型安全的现代架构。

## 🏗️ 当前项目结构

## 🏗️ 架构概览

### 根目录

### 架构模式```

- **Clean Architecture**: 依赖倒置 + 分层架构gestell/

- **Repository Pattern**: 数据访问抽象层├── .env                          # 环境变量配置

- **Dependency Injection**: 控制反转容器├── .git/                         # Git 版本控制

- **CQRS 准备**: 为将来的命令查询分离做准备├── .gitignore                    # Git 忽略文件

├── .npmrc                        # NPM 配置

### 技术决策├── gestell.code-workspace        # VSCode 工作区配置

├── package.json                  # 项目依赖配置

| 层级 | 技术选型 | 原因 |├── package-lock.json             # 锁定依赖版本

|------|----------|------|├── tsconfig.json                 # TypeScript 配置

| Presentation | Vue 3 + TypeScript | 现代响应式框架，类型安全 |├── tsconfig.main.json            # 主进程 TS 配置

| Application | Electron IPC + Services | 跨进程通信，业务逻辑封装 |├── vite.config.ts               # Vite 构建配置

| Domain | TypeScript Interfaces | 纯业务逻辑，无外部依赖 |├── README.md                     # 项目说明文档

| Infrastructure | Prisma + SQLite | 类型安全 ORM，本地优先 |├── dev.ps1                       # 开发启动脚本

├── setup-build-env.ps1          # 构建环境设置脚本

## 📁 详细结构分析├── assets/                       # 静态资源

├── data/                         # 数据存储目录

### 1. 主进程架构 (src/)├── dist/                         # 主进程构建输出

├── dist-web/                     # 前端构建输出

```├── node_modules/                 # 依赖包

src/├── prisma/                       # 数据库配置

├── main.ts                    # 应用入口，IPC 处理器├── src/                          # 源代码

├── core/                      # 基础设施核心└── test/                         # 测试文件

│   ├── database.ts           # 新数据库管理器```

│   ├── prismadb.ts           # 旧数据库操作 (向后兼容)

│   └── ulid.ts               # 唯一 ID 生成### 源代码结构 (`src/`)

├── crypto/                   # 加密服务```

│   └── crypto.ts             # RSA/AES 加密实现src/

├── data/                     # Repository 层├── 🎯 ACTIVE FILES (当前使用)

└── shared/                   # 共享类型定义│   ├── main.ts                   # ✅ Electron 主进程 (TypeScript)

```│   ├── preload.js                # ✅ 预加载脚本 (IPC 桥接)

│   ├── core/                     # ✅ 核心业务逻辑

#### 关键设计决策│   │   ├── prismadb.js          # ✅ Prisma 数据库配置

│   │   └── ulid.js              # ✅ ULID 生成器

1. **双数据库管理器并存**│   ├── crypto/                   # ✅ 加密相关

   - `database.ts`: 新的 Clean Architecture 实现│   │   └── crypto.js            # ✅ 加密工具函数

   - `prismadb.ts`: 保留旧实现以确保兼容性│   ├── generated/                # ✅ Prisma 生成文件

   - 逐步迁移策略，降低重构风险│   ├── migrations/               # ✅ 数据库迁移文件

│   ├── utils/                    # ✅ 工具函数

2. **类型化 ULID 生成**│   └── ui/                       # ✅ Vue 3 前端应用

   ```typescript│       ├── index.html           # ✅ 入口 HTML

   // 从 JavaScript 迁移到 TypeScript│       ├── main.ts              # ✅ Vue 应用入口

   // ulid.js → ulid.ts│       ├── App.vue              # ✅ 根组件

   export class ULIDGenerator {│       ├── style.css            # ✅ 全局样式

       static generate(): string { /* ... */ }│       ├── vite-env.d.ts        # ✅ Vite 类型定义

       static isValid(id: string): boolean { /* ... */ }│       ├── components/          # ✅ Vue 组件

   }│       │   ├── ArchitectureTest.vue  # ✅ 架构测试组件

   ```│       │   ├── StatusBar.vue         # ✅ 状态栏组件

│       │   └── TitleBar.vue          # ✅ 标题栏组件

### 2. Repository 层架构 (src/data/)│       ├── views/               # ✅ 页面视图

│       │   ├── HomeView.vue     # ✅ 主页

```│       │   ├── AboutView.vue    # ✅ 关于页

data/│       │   ├── LoginView.vue    # ✅ 登录页

├── interfaces/               # 接口定义 (Domain Layer)│       │   ├── ProjectView.vue  # ✅ 项目详情页

│   ├── IDatabaseManager.ts   # 数据库管理器抽象│       │   ├── EditorView.vue   # ✅ 编辑器页

│   ├── IUserRepository.ts    # 用户数据访问接口│       │   └── SettingsView.vue # ✅ 设置页

│   ├── IWorkRepository.ts    # 作品数据访问接口│       ├── stores/              # ✅ Pinia 状态管理

│   ├── IChapterRepository.ts # 章节数据访问接口│       │   ├── index.ts         # ✅ Store 入口

│   ├── IContentRepository.ts # 内容数据访问接口│       │   ├── app.ts           # ✅ 应用全局状态

│   └── IStatsRepository.ts   # 统计数据访问接口│       │   ├── user.ts          # ✅ 用户状态

├── prisma/                   # Prisma 实现 (Infrastructure Layer)│       │   ├── project.ts       # ✅ 项目状态

│   ├── UserRepository.ts     # ✅ 已实现│       │   ├── chapter.ts       # ✅ 章节状态

│   ├── WorkRepository.ts     # 🚧 待实现│       │   └── system.ts        # ⚠️ 旧系统状态 (可删除)

│   ├── ChapterRepository.ts  # 🚧 待实现│       ├── router/              # ✅ Vue Router 配置

│   ├── ContentRepository.ts  # 🚧 待实现│       │   └── index.ts         # ✅ 路由配置

│   └── StatsRepository.ts    # 🚧 待实现│       ├── services/            # ✅ API 服务层

└── RepositoryContainer.ts    # DI 容器│       │   └── api.ts           # ✅ IPC 通信封装

```│       ├── types/               # ✅ TypeScript 类型

│       │   ├── electron.ts      # ✅ Electron 类型定义

#### Repository Pattern 实现│       │   └── models.ts        # ✅ 数据模型类型

│       └── composables/         # 📁 空文件夹 (可删除)

```typescript│

// 接口定义 (Domain)└── 🗑️ LEGACY FILES (遗留文件 - 待清理)

export interface IUserRepository {    ├── main.js                   # ❌ 旧主进程 (已被 main.ts 替代)

    findById(id: string): Promise<User | null>;    ├── renderer.js               # ❌ 旧渲染进程 (已迁移到 Vue 3)

    findByUsername(username: string): Promise<User | null>;    ├── index.html               # ❌ 旧 HTML 入口 (已迁移到 ui/)

    create(userData: CreateUserData): Promise<User>;    ├── index-new.html           # ❌ 实验性文件 (未使用)

    update(id: string, userData: UpdateUserData): Promise<User>;    ├── styles.css               # ❌ 旧全局样式 (已迁移到 ui/)

    delete(id: string): Promise<void>;    ├── styles/                  # ❌ 旧样式目录

    getDefaultUser(): Promise<User>;    │   └── main.css             # ❌ 旧主样式文件

}    ├── scripts/                 # ❌ 旧脚本目录

    │   └── main.js              # ❌ 旧主脚本

// 具体实现 (Infrastructure)    ├── types/                   # ❌ 旧类型定义 (已迁移到 ui/types/)

export class PrismaUserRepository implements IUserRepository {    │   ├── interfaces.ts        # ❌ 旧接口定义

    constructor(private prisma: PrismaClient) {}    │   └── modules.d.ts         # ❌ 旧模块定义

        ├── shared/                  # 📁 空文件夹 (计划使用但未实现)

    async findById(id: string): Promise<User | null> {    ├── editor/                  # 📁 空文件夹 (计划使用但未实现)

        return await this.prisma.author.findUnique({    └── blockchain/              # 📁 空文件夹 (计划使用但未实现)

            where: { id }```

        });

    }---

    // ... 其他方法实现

}## 🧹 推荐清理的文件和文件夹



// DI 容器### 🔴 立即删除 - 已废弃的文件

export class RepositoryContainer {```bash

    constructor(private databaseManager: IDatabaseManager) {}# 旧的渲染进程文件 (已迁移到 Vue 3)

    src/renderer.js

    getUserRepository(): IUserRepository {src/index.html

        return new PrismaUserRepository(this.databaseManager.getPrismaClient());src/index-new.html

    }src/styles.css

}

```# 旧的样式和脚本目录

src/styles/

### 3. 前端架构 (src/ui/)src/scripts/



```# 旧的主进程文件 (已被 TypeScript 版本替代)

ui/src/main.js

├── main.ts                   # Vue 应用入口

├── App.vue                   # 根组件# 旧的类型定义 (已迁移到 ui/types/)

├── style.css                 # 全局样式src/types/

├── components/               # 可复用组件

│   ├── ArchitectureTest.vue  # 架构测试组件# 未使用的系统状态管理

│   ├── ChapterNode.vue       # 章节树节点src/ui/stores/system.ts

│   ├── ChapterTree.vue       # 章节树组件```

│   ├── ProseMirrorEditor.vue # 富文本编辑器

│   ├── StatusBar.vue         # 状态栏### 🟡 可选删除 - 空文件夹

│   └── TitleBar.vue          # 自定义标题栏```bash

├── views/                    # 页面视图# 空的计划目录 (如果确定不使用)

├── stores/                   # Pinia 状态管理src/shared/          # 共享代码目录 (计划中)

├── router/                   # Vue Router 配置src/editor/          # 编辑器目录 (计划中)  

├── services/                 # API 服务层src/blockchain/      # 区块链目录 (计划中)

├── types/                    # UI 类型定义src/ui/composables/  # Vue 组合式函数目录 (暂未使用)

└── utils/                    # UI 工具函数```

```

### 🟢 保留但可重构

#### 状态管理架构```bash

# 构建配置文件

```typescriptvite.config.d.ts      # Vite 配置类型声明 (构建生成)

// stores/user.tsvite.config.d.ts.map  # Source map (构建生成)

export const useUserStore = defineStore('user', () => {vite.config.js.map    # 旧配置的 map 文件 (可删除)

    const currentUser = ref<User | null>(null);```

    

    const login = async (credentials: LoginCredentials) => {---

        // 通过 IPC 调用主进程

        const user = await window.electronAPI.loginUser(credentials);## 📋 清理脚本

        currentUser.value = user;

    };### PowerShell 清理命令

    ```powershell

    return { currentUser, login };# 删除已废弃的文件

});Remove-Item "src\renderer.js" -ErrorAction SilentlyContinue

```Remove-Item "src\main.js" -ErrorAction SilentlyContinue

Remove-Item "src\index.html" -ErrorAction SilentlyContinue

### 4. 构建系统架构Remove-Item "src\index-new.html" -ErrorAction SilentlyContinue

Remove-Item "src\styles.css" -ErrorAction SilentlyContinue

```

构建输出 (dist/)# 删除已废弃的目录

├── main.js                   # 编译后的主进程Remove-Item "src\styles" -Recurse -ErrorAction SilentlyContinue

├── core/                     # 核心模块 (TypeScript → JavaScript)Remove-Item "src\scripts" -Recurse -ErrorAction SilentlyContinue

├── data/                     # Repository 层 (TypeScript → JavaScript)Remove-Item "src\types" -Recurse -ErrorAction SilentlyContinue

├── crypto/                   # 加密模块 (TypeScript → JavaScript)

├── generated/                # Prisma Client 代码# 删除空的计划目录 (可选)

└── renderer/                 # 前端构建结果 (Vue → 静态资源)Remove-Item "src\shared" -Recurse -ErrorAction SilentlyContinue

    ├── assets/               # CSS/JS BundleRemove-Item "src\editor" -Recurse -ErrorAction SilentlyContinue

    └── src/ui/index.html     # 应用入口Remove-Item "src\blockchain" -Recurse -ErrorAction SilentlyContinue

```Remove-Item "src\ui\composables" -Recurse -ErrorAction SilentlyContinue



#### 构建流程优化# 删除未使用的 store

Remove-Item "src\ui\stores\system.ts" -ErrorAction SilentlyContinue

1. **统一输出目录**: 从 `dist` + `dist-web` → 统一的 `dist/`

2. **语义化命名**: `dist/renderer/` 明确表示 Electron 渲染进程# 删除构建生成的临时文件

3. **增量构建**: 主进程和渲染进程可独立构建Remove-Item "vite.config.js.map" -ErrorAction SilentlyContinue



## 🔄 迁移历程Write-Host "✅ 项目清理完成！"

```

### 阶段一：JavaScript → TypeScript 迁移 ✅

---

| 文件 | 原路径 | 新路径 | 状态 |

|------|--------|--------|------|## 🎯 清理后的精简结构

| ULID 生成器 | `src/core/ulid.js` | `src/core/ulid.ts` | ✅ 完成 |

| 加密服务 | `src/crypto/crypto.js` | `src/crypto/crypto.ts` | ✅ 完成 |```

| 数据库操作 | `src/core/prismadb.js` | `src/core/prismadb.ts` | ✅ 完成 |src/

| 工具函数 | `src/utils/ulid.js` | `src/utils/ulid.ts` | ✅ 完成 |├── main.ts                      # Electron 主进程

├── preload.js                   # 预加载脚本

### 阶段二：Repository Pattern 实现 🚧├── core/                        # 核心业务逻辑

├── crypto/                      # 加密工具

| 组件 | 状态 | 完成度 |├── generated/                   # Prisma 生成文件

|------|------|--------|├── migrations/                  # 数据库迁移

| Repository 接口 | ✅ 完成 | 100% |├── utils/                       # 工具函数

| DI 容器 | ✅ 完成 | 100% |└── ui/                          # Vue 3 前端应用

| UserRepository | ✅ 完成 | 100% |    ├── index.html              # 入口页面

| WorkRepository | 🚧 进行中 | 0% |    ├── main.ts                 # Vue 入口

| ChapterRepository | 📋 计划中 | 0% |    ├── App.vue                 # 根组件

| ContentRepository | 📋 计划中 | 0% |    ├── style.css               # 全局样式

| StatsRepository | 📋 计划中 | 0% |    ├── components/             # 组件

    ├── views/                  # 页面视图

### 阶段三：架构清理 ✅    ├── stores/                 # 状态管理

    ├── router/                 # 路由配置

- ✅ 构建目录统一 (`dist-web` → `dist/renderer`)    ├── services/               # API 服务

- ✅ 环境变量配置 (dotenv 集成)    └── types/                  # 类型定义

- ✅ 数据库路径标准化 (绝对路径)```

- ✅ 废弃文件清理

---

## 📊 架构指标

## 📈 项目统计

### 代码质量指标

### 文件数量统计

| 指标 | 当前值 | 目标值 | 状态 |- **活跃文件**: ~45 个

|------|--------|--------|------|- **废弃文件**: ~8 个

| TypeScript 覆盖率 | 95% | 100% | 🟢 良好 |- **空文件夹**: ~4 个

| 接口抽象化 | 80% | 100% | 🟡 改进中 |- **清理后节省**: 约 15% 的文件数量

| 测试覆盖率 | 0% | 80% | 🔴 需要 |

| 文档覆盖率 | 70% | 90% | 🟡 改进中 |### 技术债务清理

- ✅ **主进程**: JavaScript → TypeScript 迁移完成

### 技术债务- ✅ **前端框架**: 传统 HTML/JS → Vue 3 + TypeScript 完成

- ✅ **状态管理**: 无状态 → Pinia 状态管理完成

| 项目 | 优先级 | 预估工作量 | 状态 |- ✅ **路由系统**: 单页面 → Vue Router 多页面完成

|------|--------|------------|------|- ✅ **构建系统**: 传统构建 → Vite 现代构建完成

| 旧数据库管理器移除 | 中 | 2天 | 计划中 |

| 剩余 Repository 实现 | 高 | 5天 | 进行中 |---

| 单元测试套件 | 高 | 10天 | 计划中 |

| 集成测试 | 中 | 5天 | 计划中 |## 🚀 架构优势

| 性能优化 | 低 | 3天 | 计划中 |

### 现代化架构

## 🎯 最佳实践1. **类型安全**: 完整的 TypeScript 支持

2. **组件化**: Vue 3 Composition API

### 1. 依赖管理3. **响应式**: Pinia 状态管理

4. **模块化**: 清晰的文件组织

```typescript5. **开发体验**: Vite 热重载

// ✅ 推荐：通过接口依赖

class UserService {### 可维护性提升

    constructor(private userRepo: IUserRepository) {}1. **代码复用**: 组件化架构

}2. **类型检查**: 编译时错误检测

3. **调试友好**: Vue DevTools 支持

// ❌ 避免：直接依赖具体实现4. **文档清晰**: 自文档化的 TypeScript

class UserService {

    constructor(private userRepo: PrismaUserRepository) {}### 性能优化

}1. **按需加载**: Vue Router 懒加载

```2. **Tree Shaking**: Vite 构建优化

3. **缓存策略**: 智能依赖管理

### 2. 错误处理4. **开发效率**: 热重载 + 类型提示



```typescript---

// ✅ 推荐：统一错误处理

async findUser(id: string): Promise<Result<User, UserError>> {## 📝 维护建议

    try {

        const user = await this.userRepository.findById(id);### 短期 (1-2周)

        return user ? Ok(user) : Err(UserError.NotFound);1. ✅ **执行清理脚本**: 删除废弃文件

    } catch (error) {2. 🔄 **测试功能**: 确保清理后应用正常

        return Err(UserError.DatabaseError);3. 📚 **更新文档**: 同步 README.md

    }

}### 中期 (1个月)

```1. 🎨 **UI 优化**: 完善组件样式

2. 🔧 **功能补全**: 实现核心业务逻辑

### 3. 类型安全3. 🧪 **测试覆盖**: 添加单元测试



```typescript### 长期 (3个月)

// ✅ 推荐：严格类型定义1. 📦 **打包优化**: Electron Builder 配置

interface CreateUserData {2. 🚀 **性能优化**: 代码分割和懒加载

    username: string;3. 🔐 **安全加固**: 代码签名和更新机制

    email: string;

    displayName?: string;---

}

**文档生成时间**: 2025年10月9日  

// ❌ 避免：any 类型**版本**: 1.0.0  

async createUser(userData: any): Promise<any>**状态**: Vue 3 + TypeScript 架构迁移完成  

```**下一步**: 执行清理脚本，开始业务功能开发

## 🔮 未来规划

### 短期目标 (1-2 个月)

1. **完成 Repository 实现**
   - WorkRepository, ChapterRepository, ContentRepository, StatsRepository
   - 全面替换旧数据库操作

2. **服务层重构**
   - 提取业务逻辑到 Service 类
   - 实现统一错误处理
   - 添加日志系统

3. **测试覆盖**
   - 单元测试框架搭建
   - Repository 层测试
   - 服务层测试

### 中期目标 (3-6 个月)

1. **CQRS 实现**
   - 命令查询分离
   - 事件驱动架构
   - 缓存策略

2. **微服务准备**
   - 模块化服务
   - 插件系统
   - API 网关

3. **性能优化**
   - 数据库查询优化
   - 前端性能监控
   - 内存管理优化

### 长期目标 (6个月+)

1. **去中心化功能**
   - 区块链集成
   - P2P 协作
   - 分布式存储

2. **AI 集成**
   - 智能写作助手
   - 内容分析
   - 自动校对

## 📚 参考资源

### 架构模式
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Repository Pattern in TypeScript](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)
- [Dependency Injection Patterns](https://martinfowler.com/articles/injection.html)

### 技术文档
- [Electron Architecture](https://www.electronjs.org/docs/latest/tutorial/architecture)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**文档维护**: 该文档应在每次重大架构变更后更新。  
**下次审查**: 2025年11月9日  
**负责人**: 架构团队