# 📚 Gestell 项目全面分析与开发指南

> 最后更新：2025-10-12  
> 项目版本：0.1.0  
> 状态：开发中（协同编辑功能已集成）

---

## 🎯 项目概述

**Gestell** 是一个基于 **Electron + Vue 3 + Prisma + SQLite** 的桌面科幻小说写作工具，支持本地单机写作和实时协同编辑。

### 核心特性

1. **📝 富文本编辑**
   - 基于 ProseMirror 的强大编辑器
   - 支持 JSON 格式存储（完整保留格式）
   - 自动保存机制（5秒间隔）
   - 实时字数统计

2. **🤝 协同编辑**（**最新实现**）
   - 基于 Yjs CRDT 算法的无冲突同步
   - WebSocket + WebRTC 双通道传输
   - 实时光标跟随和用户标签
   - 自动断线重连
   - 协作者在线状态显示

3. **🏗️ 作品管理**
   - 多层级章节结构（作品 → 卷 → 章节 → 小节）
   - 拖拽排序支持
   - 章节树状展示
   - 作品统计（字数、进度等）

4. **👥 用户系统**
   - 本地用户账户管理
   - 多用户支持
   - 用户偏好设置

5. **💾 数据管理**
   - SQLite 本地数据库
   - Prisma ORM 类型安全
   - 数据加密支持
   - 版本历史记录

---

## 🏛️ 技术架构

### 技术栈

```
前端框架：Vue 3.5 + TypeScript 5.9
状态管理：Pinia 3.0
路由：Vue Router 4.5
UI组件：自定义组件 + ProseMirror
桌面框架：Electron 32.0
数据库：SQLite + Prisma 6.17
编辑器：ProseMirror 1.x 系列
协同编辑：Yjs 13.6 + y-prosemirror 1.3
实时通信：y-websocket 3.0 + y-webrtc 10.3
构建工具：Vite 6.3 + TypeScript
```

### 项目结构

```
gestell/
├── src/                          # 源代码目录
│   ├── main.ts                   # Electron 主进程入口
│   ├── preload.js                # 预加载脚本（IPC 桥接）
│   │
│   ├── core/                     # 核心业务逻辑
│   │   ├── database.ts           # 数据库连接管理
│   │   └── ...
│   │
│   ├── data/                     # 数据访问层（Repository）
│   │   ├── interfaces/           # Repository 接口定义
│   │   └── prisma/              # Prisma 实现
│   │       ├── UserRepository.ts
│   │       ├── WorkRepository.ts
│   │       ├── ChapterRepository.ts
│   │       └── ContentRepository.ts
│   │
│   ├── services/                 # 业务逻辑层（Service）
│   │   ├── interfaces/           # Service 接口
│   │   ├── UserService.ts        # 用户业务逻辑
│   │   ├── WorkService.ts        # 作品业务逻辑
│   │   ├── ChapterService.ts     # 章节业务逻辑
│   │   ├── ContentService.ts     # 内容业务逻辑
│   │   ├── YjsCollaborationService.ts  # 协同编辑服务
│   │   └── ServiceContainer.ts   # 依赖注入容器
│   │
│   ├── ipc/                      # IPC 通信层
│   │   ├── UserIPCHandler.ts     # 用户相关 IPC
│   │   ├── WorkIPCHandler.ts     # 作品相关 IPC
│   │   ├── ChapterIPCHandler.ts  # 章节相关 IPC
│   │   ├── ContentIPCHandler.ts  # 内容相关 IPC
│   │   ├── SystemIPCHandler.ts   # 系统功能 IPC
│   │   └── IPCManager.ts         # IPC 统一管理
│   │
│   ├── ui/                       # 渲染进程（前端）
│   │   ├── App.vue               # 根组件
│   │   ├── main.ts               # 前端入口
│   │   ├── router/               # 路由配置
│   │   ├── stores/               # Pinia 状态管理
│   │   │   ├── user.ts
│   │   │   ├── work.ts
│   │   │   ├── chapter.ts
│   │   │   └── content.ts
│   │   ├── views/                # 页面组件
│   │   │   ├── LoginView.vue     # 登录页
│   │   │   ├── HomeView.vue      # 主页
│   │   │   ├── WorkListView.vue  # 作品列表
│   │   │   ├── WorkView.vue      # 作品管理
│   │   │   └── WritingView.vue   # 写作工作台（核心）
│   │   ├── components/           # 可复用组件
│   │   │   ├── ChapterTreeNew.vue         # 章节树
│   │   │   ├── EnhancedEditor.vue         # 增强编辑器
│   │   │   ├── ProseMirrorEditor.vue      # ProseMirror 编辑器
│   │   │   ├── CollaborativeProseMirrorEditor.vue  # 协同编辑器 ⭐
│   │   │   └── ...
│   │   ├── services/             # 前端服务
│   │   │   └── api.ts            # API 调用封装
│   │   ├── types/                # TypeScript 类型
│   │   │   ├── models.ts         # 数据模型
│   │   │   └── electron.ts       # Electron API 类型
│   │   └── utils/                # 工具函数
│   │       ├── prosemirror-menu.ts
│   │       └── ...
│   │
│   ├── crypto/                   # 加密模块
│   ├── migrations/               # 数据库迁移
│   ├── generated/                # Prisma 生成代码
│   └── shared/                   # 共享代码
│
├── prisma/                       # Prisma 配置
│   ├── schema.prisma             # 数据库模型定义
│   └── migrations/               # 迁移历史
│
├── yjs-server/                   # Yjs 协同编辑服务器 ⭐
│   ├── server.js                 # WebSocket 服务器
│   ├── package.json              # 服务器依赖
│   └── test-yjs-client.js        # 测试客户端
│
├── docs/                         # 项目文档
│   ├── ARCHITECTURE_ANALYSIS.md
│   ├── PRISMA_ARCHITECTURE_GUIDE.md
│   ├── WRITING_FEATURES_SUMMARY.md
│   └── ...
│
├── dist/                         # 编译输出
├── data/                         # 数据库文件
│   └── gestell.db
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 配置
└── electron-builder.yml          # 打包配置
```

---

## 🔄 数据流架构

### 完整的请求流程（以创建章节为例）

```
┌─────────────────────────────────────────────┐
│ 1. 用户界面 (Vue Component)                 │
│    WritingView.vue                          │
│    用户点击"创建章节"按钮                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. 状态管理 (Pinia Store)                   │
│    chapterStore.createChapter()             │
│    调用 API 服务                             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. API 服务层 (api.ts)                      │
│    chapterApi.create()                      │
│    通过 window.electronAPI 调用主进程       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. 预加载脚本 (preload.js)                  │
│    contextBridge.exposeInMainWorld()        │
│    安全的 IPC 通信桥接                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 5. IPC 处理器 (ChapterIPCHandler.ts)        │
│    ipcMain.handle('chapter:create')         │
│    调用服务层处理业务逻辑                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 6. 业务服务层 (ChapterService.ts)           │
│    createChapter()                          │
│    执行业务逻辑、数据验证                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 7. 数据访问层 (ChapterRepository.ts)        │
│    create()                                 │
│    通过 Prisma Client 操作数据库            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 8. 数据库 (SQLite + Prisma)                 │
│    INSERT INTO chapters ...                 │
│    数据持久化存储                            │
└─────────────────────────────────────────────┘
```

---

## 🤝 协同编辑架构详解（**核心功能**）

### 协同编辑技术栈

```
前端编辑器：ProseMirror 1.41
协同引擎：Yjs 13.6 (CRDT 算法)
绑定层：y-prosemirror 1.3.7
传输层：
  - y-websocket 3.0.0 (服务器中继)
  - y-webrtc 10.3.0 (P2P 直连)
服务器：Node.js + Express + WebSocket
```

### 协同编辑数据流

```
客户端 A                     Yjs 服务器                    客户端 B
   │                            │                            │
   │  1. 用户输入文字           │                            │
   │ ────────────────────>      │                            │
   │                            │                            │
   │  2. ProseMirror 事件       │                            │
   │     ↓                      │                            │
   │  3. y-prosemirror          │                            │
   │     转换为 Yjs 操作        │                            │
   │     ↓                      │                            │
   │  4. Yjs Doc 更新           │                            │
   │     ↓                      │                            │
   │  5. WebSocket 发送更新     │                            │
   │ ──────────────────────────>│                            │
   │                            │  6. 广播到其他客户端       │
   │                            │ ──────────────────────────>│
   │                            │                            │  7. 接收更新
   │                            │                            │     ↓
   │                            │                            │  8. Yjs Doc 更新
   │                            │                            │     ↓
   │                            │                            │  9. y-prosemirror
   │                            │                            │     转换为 ProseMirror
   │                            │                            │     ↓
   │                            │                            │ 10. 编辑器显示
```

### 核心组件关系

```
CollaborativeProseMirrorEditor.vue (前端组件)
    ↓ 初始化
Yjs Document (ydoc)
    ↓ 绑定
ProseMirror EditorState
    ↓ 插件
[ySyncPlugin, yCursorPlugin, yUndoPlugin]
    ↓ 连接
WebrtcProvider + WebsocketProvider
    ↓ 通信
yjs-server (ws://localhost:4001)
```

### 协同编辑关键代码位置

1. **前端编辑器组件**
   - 文件：`src/ui/components/CollaborativeProseMirrorEditor.vue`
   - 功能：
     - 初始化 Yjs 文档和网络提供者
     - 创建 ProseMirror 编辑器实例
     - 设置协同插件（ySyncPlugin, yCursorPlugin）
     - 处理用户信息和光标显示
     - 管理连接状态

2. **Yjs 服务器**
   - 文件：`yjs-server/server.js`
   - 功能：
     - WebSocket 服务器监听
     - Yjs 文档管理和持久化
     - 消息广播和同步协议处理
     - Awareness 状态管理

3. **写作视图集成**
   - 文件：`src/ui/views/WritingView.vue`
   - 功能：
     - 切换单机/协同模式
     - 传递用户信息到编辑器
     - 显示协作者列表
     - 处理连接状态变化

---

## 📊 数据库设计

### 核心表结构

```prisma
model Author {
  id                    String                 @id
  username              String                 @unique
  displayName           String?
  email                 String?                @unique
  bio                   String?
  avatarUrl             String?
  walletAddress         String?
  publicKey             String?
  privateKeyEncrypted   String?
  totalWorks            Int                    @default(0)
  totalWords            Int                    @default(0)
  status                String                 @default("active")
  preferences           String?
  lastActiveAt          DateTime?
  createdAt             DateTime
  updatedAt             DateTime
  
  // 关联
  works                 Work[]
  chapters              Chapter[]
  contents              Content[]
  collaborativeSessions CollaborativeSession[]
}

model Work {
  id                   String             @id
  title                String
  subtitle             String?
  description          String?
  genre                String?
  authorId             String
  collaborationMode    String             @default("solo")
  status               String             @default("draft")
  totalWords           Int                @default(0)
  targetWords          Int?
  progressPercentage   Int                @default(0)
  isPublic             Boolean            @default(false)
  createdAt            DateTime
  updatedAt            DateTime
  publishedAt          DateTime?
  
  // 关联
  author               Author             @relation(fields: [authorId], references: [id])
  chapters             Chapter[]
}

model Chapter {
  id              String     @id
  title           String
  workId          String
  parentId        String?
  authorId        String
  type            String     @default("chapter")
  level           Int        @default(1)
  orderIndex      Int        @default(0)
  status          String     @default("draft")
  characterCount  Int        @default(0)
  createdAt       DateTime
  updatedAt       DateTime
  
  // 关联
  work            Work       @relation(fields: [workId], references: [id])
  author          Author     @relation(fields: [authorId], references: [id])
  parent          Chapter?   @relation("ChapterHierarchy", fields: [parentId], references: [id])
  children        Chapter[]  @relation("ChapterHierarchy")
  contents        Content[]
}

model Content {
  id              String            @id
  chapterId       String
  title           String?
  contentJson     String?
  authorId        String
  editorId        String?
  version         Int               @default(1)
  wordCount       Int               @default(0)
  characterCount  Int               @default(0)
  isLocked        Boolean           @default(false)
  lockUserId      String?
  lockTime        DateTime?
  createdAt       DateTime
  updatedAt       DateTime
  
  // 关联
  chapter         Chapter           @relation(fields: [chapterId], references: [id])
  author          Author            @relation(fields: [authorId], references: [id])
  editor          Author?           @relation("ContentEditor", fields: [editorId], references: [id])
  versions        ContentVersion[]
}

model ContentVersion {
  id              String     @id
  contentId       String
  versionNumber   Int
  contentJson     String
  editorId        String
  wordCount       Int        @default(0)
  characterCount  Int        @default(0)
  changeLog       String?
  createdAt       DateTime
  
  // 关联
  content         Content    @relation(fields: [contentId], references: [id])
  editor          Author     @relation(fields: [editorId], references: [id])
}

model CollaborativeSession {
  id            String     @id
  contentId     String
  userId        String
  sessionToken  String
  startTime     DateTime
  endTime       DateTime?
  isActive      Boolean    @default(true)
  lastHeartbeat DateTime
  
  // 关联
  user          Author     @relation(fields: [userId], references: [id])
}
```

---

## 🛠️ 开发指南

### 环境要求

```
Node.js: >= 18.0.0
npm: >= 9.0.0
Python: >= 3.x (用于 node-gyp)
操作系统: Windows/macOS/Linux
```

### 安装与运行

```bash
# 1. 克隆仓库
git clone <repository-url>
cd gestell

# 2. 安装依赖
npm install

# 3. 安装 Yjs 服务器依赖
cd yjs-server
npm install
cd ..

# 4. 生成 Prisma Client
npx prisma generate

# 5. 运行数据库迁移
npx prisma migrate dev

# 6. 启动 Yjs 协同服务器（新终端）
cd yjs-server
node server.js
# 或使用 nodemon 自动重启
npm run dev

# 7. 启动主应用（新终端）
npm run dev
```

### 开发命令

```bash
# 开发模式（前端 + Electron）
npm run dev

# 只启动前端开发服务器
npm run dev:vite

# 只启动 Electron
npm run dev:electron

# 编译主进程
npm run build:main

# 编译前端
npm run build:web

# 完整编译
npm run build

# 运行测试
npm run test:unit

# 代码覆盖率
npm run test:coverage

# Prisma Studio（数据库可视化）
npx prisma studio
```

### 调试技巧

1. **前端调试**
   - 打开 Electron DevTools: `Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (macOS)
   - 查看 Console 日志
   - 使用 Vue DevTools 浏览器扩展

2. **主进程调试**
   - 在终端查看主进程日志
   - 添加 `console.log` 或使用 `debug` 模块
   - VSCode 断点调试配置：
     ```json
     {
       "type": "node",
       "request": "launch",
       "name": "Electron Main",
       "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
       "runtimeArgs": ["--remote-debugging-port=9222", "dist/main.js"],
       "protocol": "inspector"
     }
     ```

3. **协同编辑调试**
   - 查看 yjs-server 控制台日志
   - 使用浏览器 Network 面板查看 WebSocket 消息
   - 在 CollaborativeProseMirrorEditor 中添加调试日志：
     ```typescript
     console.log('🚀 Yjs 初始化', { ydoc, yxml })
     console.log('📡 网络提供者状态', { webrtc, websocket })
     ```

4. **数据库调试**
   - 使用 `npx prisma studio` 查看数据
   - 启用 Prisma 查询日志：
     ```typescript
     const prisma = new PrismaClient({
       log: ['query', 'info', 'warn', 'error'],
     })
     ```

---

## 🧪 测试协同编辑功能

### 快速测试步骤

1. **启动服务器**
   ```bash
   cd yjs-server
   node server.js
   ```

2. **启动应用**
   ```bash
   npm run dev
   ```

3. **打开两个实例**
   - 方式 1：两个浏览器标签（http://localhost:3000）
   - 方式 2：Electron + 浏览器
   - 方式 3：两个 Electron 实例（需要不同的用户数据目录）

4. **进入协同模式**
   - 登录用户
   - 创建或打开作品
   - 选择章节
   - 点击"开启协作"按钮

5. **测试功能**
   - ✅ 实时文字同步
   - ✅ 光标位置显示
   - ✅ 协作者列表
   - ✅ 连接状态指示
   - ✅ 断线重连

### 测试检查清单

```markdown
- [ ] 服务器正常启动（端口 4001）
- [ ] 应用成功连接到服务器
- [ ] 协作状态栏显示正确
- [ ] 两个客户端能看到彼此的编辑
- [ ] 光标位置实时同步
- [ ] 用户名标签正确显示
- [ ] 连接断开后能自动重连
- [ ] 编辑内容能保存到数据库
```

---

## 📝 常见问题与解决方案

### 1. Yjs 服务器连接失败

**问题**：控制台显示 `WebSocket connection failed`

**解决方案**：
```bash
# 检查服务器是否运行
cd yjs-server
node server.js

# 检查端口是否被占用
netstat -ano | findstr :4001  # Windows
lsof -i :4001                  # macOS/Linux

# 检查防火墙设置
# 确保 4001 端口未被阻止
```

### 2. 编辑器显示 JSON 字符串而非富文本

**问题**：编辑器中显示 `{"type":"doc","content":[]}`

**解决方案**：
- 问题已修复，确保使用最新版本的 `ProseMirrorEditor.vue`
- 编辑器现在支持 JSON 和 HTML 双格式
- 数据库存储统一使用 JSON 格式

### 3. 协同编辑器为空

**问题**：切换到协同模式后编辑器内容消失

**解决方案**：
- 已实现 500ms 延迟检查机制
- 如果编辑器为空但有本地内容，会自动填充
- 检查 `modelValue` 是否正确传递

### 4. 光标显示为黑方块

**问题**：协作者光标显示异常

**解决方案**：
- 已修复光标样式
- 使用自定义 `cursorBuilder` 函数
- 光标标签显示在光标上方，带用户名

### 5. 用户名显示为"匿名用户"

**问题**：协作者列表显示错误的用户名

**解决方案**：
- 确保 `currentUser` 正确加载
- 检查 `userId` 和 `userName` props 传递
- 查看控制台日志确认用户信息

---

## 🔮 未来开发计划

### 短期计划（v0.2.0）

- [ ] **协同编辑增强**
  - [x] 基础实时同步
  - [x] 光标位置显示
  - [ ] 选区高亮
  - [ ] 协作者评论系统
  - [ ] 编辑历史回放

- [ ] **导出功能**
  - [ ] 导出为 Markdown
  - [ ] 导出为 EPUB
  - [ ] 导出为 PDF
  - [ ] 导出为 Word (.docx)

- [ ] **AI 辅助写作**
  - [ ] 文本续写
  - [ ] 智能纠错
  - [ ] 风格分析
  - [ ] 情节建议

### 中期计划（v0.3.0）

- [ ] **云端同步**
  - [ ] 账户系统升级
  - [ ] 云端备份
  - [ ] 多设备同步

- [ ] **世界观管理**
  - [ ] 角色关系图
  - [ ] 时间线编辑器
  - [ ] 地点管理
  - [ ] 设定卡片

- [ ] **版本管理**
  - [ ] Git 式分支管理
  - [ ] 版本对比
  - [ ] 合并冲突解决

### 长期计划（v1.0.0）

- [ ] **去中心化存储**
  - [ ] IPFS 集成
  - [ ] 区块链版权保护
  - [ ] NFT 铸造

- [ ] **社区功能**
  - [ ] 作品分享
  - [ ] 协作邀请
  - [ ] 评论互动

---

## 📚 相关文档

- [架构分析文档](./ARCHITECTURE_ANALYSIS.md)
- [Prisma 架构指南](./PRISMA_ARCHITECTURE_GUIDE.md)
- [写作功能总结](./WRITING_FEATURES_SUMMARY.md)
- [协同编辑测试指南](../COLLABORATION_TESTING_GUIDE.md)

---

## 👥 贡献指南

### 代码规范

1. **TypeScript 类型**：所有新代码必须有完整类型定义
2. **命名规范**：
   - 组件：PascalCase (e.g., `ChapterTreeNew.vue`)
   - 函数：camelCase (e.g., `createChapter`)
   - 常量：UPPER_SNAKE_CASE (e.g., `MAX_CHAPTERS`)
3. **注释**：关键函数和复杂逻辑必须有注释
4. **提交信息**：使用语义化提交（feat/fix/docs/style/refactor/test/chore）

### 提交流程

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature-name

# 2. 开发并测试
# ... 编写代码 ...

# 3. 提交变更
git add .
git commit -m "feat: add new feature description"

# 4. 推送到远程
git push origin feature/your-feature-name

# 5. 创建 Pull Request
# 在 GitHub/GitLab 上创建 PR
```

---

## 📞 联系方式

- **项目维护者**：unity
- **问题反馈**：GitHub Issues
- **技术讨论**：项目讨论区

---

**最后更新**：2025-10-12  
**文档版本**：1.0.0  
**项目状态**：🟢 活跃开发中
