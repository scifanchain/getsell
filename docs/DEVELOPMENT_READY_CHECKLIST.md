# 🚀 Gestell 开发准备清单

> 为接下来的开发工作做好准备 - 快速参考

---

## ✅ 当前项目状态

### 已完成的功能

#### 1. 核心架构 ✅
- ✅ Electron + Vue 3 + TypeScript 基础框架
- ✅ Prisma + SQLite 数据库集成
- ✅ 清洁架构分层（Service/Repository/IPC）
- ✅ 依赖注入容器（ServiceContainer）

#### 2. 用户系统 ✅
- ✅ 本地用户注册/登录
- ✅ 用户状态管理（Pinia Store）
- ✅ 多用户支持

#### 3. 作品管理 ✅
- ✅ 作品 CRUD 操作
- ✅ 作品列表展示
- ✅ 作品统计（字数、进度）
- ✅ 作品状态管理（草稿/已发布/归档）

#### 4. 章节管理 ✅
- ✅ 多层级章节结构（作品 → 卷 → 章 → 节）
- ✅ 章节树状展示（ChapterTreeNew 组件）
- ✅ 拖拽排序（VueDraggable）
- ✅ 章节 CRUD 操作

#### 5. 内容编辑 ✅
- ✅ ProseMirror 富文本编辑器
- ✅ JSON 格式存储（完整保留格式）
- ✅ 自动保存机制（5秒间隔）
- ✅ 实时字数统计
- ✅ 版本历史记录

#### 6. 协同编辑 ✅ **（最新实现）**
- ✅ Yjs CRDT 算法集成
- ✅ WebSocket + WebRTC 双通道
- ✅ 实时文本同步
- ✅ 光标位置跟随
- ✅ 用户在线状态
- ✅ 自动断线重连
- ✅ Yjs 服务器部署（端口 4001）

---

## 🎯 技术栈速览

```
前端：Vue 3.5 + TypeScript 5.9 + Pinia 3.0
桌面：Electron 32.0
编辑器：ProseMirror 1.x
协同：Yjs 13.6 + y-prosemirror 1.3
通信：y-websocket 3.0 + y-webrtc 10.3
数据库：SQLite + Prisma 6.17
构建：Vite 6.3
```

---

## 📁 关键文件位置

### 前端核心组件
```
src/ui/views/WritingView.vue           # 主写作界面
src/ui/components/
  ├── CollaborativeProseMirrorEditor.vue  # 协同编辑器 ⭐
  ├── EnhancedEditor.vue                  # 增强编辑器
  ├── ProseMirrorEditor.vue               # 基础编辑器
  └── ChapterTreeNew.vue                  # 章节树
```

### 后端业务逻辑
```
src/services/
  ├── ChapterService.ts         # 章节业务逻辑
  ├── ContentService.ts         # 内容业务逻辑
  ├── WorkService.ts            # 作品业务逻辑
  ├── UserService.ts            # 用户业务逻辑
  └── YjsCollaborationService.ts # 协同编辑服务
```

### IPC 通信层
```
src/ipc/
  ├── IPCManager.ts             # IPC 统一管理
  ├── ChapterIPCHandler.ts      # 章节 IPC
  ├── ContentIPCHandler.ts      # 内容 IPC
  ├── WorkIPCHandler.ts         # 作品 IPC
  └── UserIPCHandler.ts         # 用户 IPC
```

### 数据访问层
```
src/data/prisma/
  ├── ChapterRepository.ts      # 章节数据访问
  ├── ContentRepository.ts      # 内容数据访问
  ├── WorkRepository.ts         # 作品数据访问
  └── UserRepository.ts         # 用户数据访问
```

### 协同编辑服务器
```
yjs-server/
  ├── server.js                 # Yjs WebSocket 服务器
  └── package.json              # 服务器依赖
```

---

## 🔧 快速启动命令

### 开发模式
```bash
# 终端 1：启动 Yjs 协同服务器
cd yjs-server
node server.js

# 终端 2：启动主应用
npm run dev
```

### 编译命令
```bash
npm run build:web      # 编译前端
npm run build:main     # 编译主进程
npm run build          # 完整编译
```

### 数据库管理
```bash
npx prisma studio      # 可视化数据库
npx prisma generate    # 生成 Prisma Client
npx prisma migrate dev # 执行迁移
```

---

## 🐛 已知问题与解决方案

### 1. ~~协同编辑器光标显示为黑方块~~ ✅ 已修复
- **状态**：✅ 已修复
- **解决方案**：自定义 cursorBuilder，光标标签显示在上方

### 2. ~~协同模式下编辑器为空~~ ✅ 已修复
- **状态**：✅ 已修复
- **解决方案**：500ms 延迟检查 + 自动填充本地内容

### 3. ~~用户名显示为"匿名用户"~~ ⚠️ 调查中
- **状态**：⚠️ 待确认
- **临时解决**：确保 props 正确传递，添加调试日志

### 4. 数据库日期格式问题 ✅ 已修复
- **状态**：✅ 已修复
- **解决方案**：ChapterService 中添加 formatDate 辅助函数

---

## 📊 数据库结构概览

### 核心表
```
authors (用户)
  ├── works (作品)
  │     └── chapters (章节)
  │           └── contents (内容)
  │                 └── content_versions (版本)
  └── collaborative_sessions (协作会话)
```

### 关键字段
```typescript
// Author
id, username, displayName, email, totalWorks, totalWords

// Work  
id, title, authorId, collaborationMode, status, totalWords, targetWords

// Chapter
id, title, workId, parentId, type, level, orderIndex

// Content
id, chapterId, contentJson, version, wordCount, characterCount

// CollaborativeSession
id, contentId, userId, sessionToken, isActive
```

---

## 🎨 UI 组件层级

```
App.vue
  └── Router
      ├── LoginView              # 登录页
      ├── HomeView               # 主页
      ├── WorkListView           # 作品列表
      ├── WorkView               # 作品详情
      └── WritingView            # 写作工作台 ⭐
          ├── Sidebar (左)
          │   └── ChapterTreeNew # 章节树
          ├── Editor (中)
          │   ├── CollaborativeProseMirrorEditor (协同模式)
          │   └── EnhancedEditor (单机模式)
          └── Info Panel (右)
              ├── Work Stats     # 作品统计
              ├── Outline        # 大纲
              └── Writing Stats  # 写作统计
```

---

## 🔄 开发工作流

### 1. 添加新功能
```bash
# 1. 创建分支
git checkout -b feature/new-feature

# 2. 修改代码
# - 数据模型：修改 prisma/schema.prisma
# - 数据访问：添加/修改 Repository
# - 业务逻辑：添加/修改 Service
# - IPC 通信：添加/修改 IPCHandler
# - 前端界面：添加/修改 Vue 组件

# 3. 测试
npm run dev

# 4. 提交
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### 2. 修改数据库
```bash
# 1. 修改 schema.prisma
vi prisma/schema.prisma

# 2. 创建迁移
npx prisma migrate dev --name describe_change

# 3. 生成客户端
npx prisma generate

# 4. 更新 Repository/Service 代码
```

### 3. 调试协同编辑
```bash
# 1. 启动服务器（带日志）
cd yjs-server
node server.js

# 2. 打开浏览器 DevTools
# F12 → Console → 查看日志

# 3. 检查 WebSocket 连接
# F12 → Network → WS → 查看消息

# 4. 查看 Yjs 文档状态
# 在组件中添加：
console.log('Yjs Doc:', ydoc.toJSON())
```

---

## 📚 重要文档参考

### 项目文档
- [项目全面分析](./PROJECT_COMPREHENSIVE_ANALYSIS.md) ⭐ 新建
- [架构分析](./ARCHITECTURE_ANALYSIS.md)
- [Prisma 架构指南](./PRISMA_ARCHITECTURE_GUIDE.md)
- [写作功能总结](./WRITING_FEATURES_SUMMARY.md)
- [协同编辑测试](../COLLABORATION_TESTING_GUIDE.md)

### 技术文档
- [ProseMirror 官方文档](https://prosemirror.net/)
- [Yjs 官方文档](https://docs.yjs.dev/)
- [Prisma 文档](https://www.prisma.io/docs)
- [Electron 文档](https://www.electronjs.org/docs)
- [Vue 3 文档](https://vuejs.org/)

---

## 🎯 下一步计划建议

### 优先级 P0（立即处理）
1. ✅ 验证协同编辑功能完全正常
2. ⚠️ 确认用户名显示问题
3. [ ] 完善错误处理和用户提示

### 优先级 P1（短期）
1. [ ] 添加选区高亮功能
2. [ ] 实现协作者评论系统
3. [ ] 优化自动保存逻辑
4. [ ] 添加导出功能（Markdown/PDF）

### 优先级 P2（中期）
1. [ ] AI 辅助写作功能
2. [ ] 云端同步
3. [ ] 世界观管理工具
4. [ ] 移动端支持

### 优先级 P3（长期）
1. [ ] 去中心化存储（IPFS）
2. [ ] 区块链版权保护
3. [ ] 社区功能
4. [ ] 插件系统

---

## 🔍 关键代码片段

### 1. 初始化协同编辑
```typescript
// src/ui/components/CollaborativeProseMirrorEditor.vue
const initYjs = async () => {
  ydoc = new Y.Doc()
  yxml = ydoc.getXmlFragment('prosemirror')
  await setupNetworkProviders()
}
```

### 2. 创建协同插件
```typescript
const createCollaborativePlugins = () => {
  return [
    ySyncPlugin(yxml),
    yCursorPlugin(awareness, { cursorBuilder }),
    yUndoPlugin(),
    // ... 其他插件
  ]
}
```

### 3. 自动保存
```typescript
// src/ui/composables/useAutoSave.ts
const { triggerAutoSave, saveNow } = useAutoSave(
  contentIdRef,
  userIdRef,
  { interval: 5000, onSaved, onError }
)
```

### 4. IPC 调用
```typescript
// 前端调用
const result = await window.electronAPI.invoke('chapter:create', chapterData)

// 主进程处理
ipcMain.handle('chapter:create', async (event, chapterData) => {
  return await chapterService.createChapter(chapterData)
})
```

---

## ✅ 开发前检查清单

- [ ] Node.js 和 npm 版本正确
- [ ] 所有依赖已安装（`npm install`）
- [ ] Prisma Client 已生成（`npx prisma generate`）
- [ ] 数据库迁移已执行（`npx prisma migrate dev`）
- [ ] Yjs 服务器已启动（`cd yjs-server && node server.js`）
- [ ] 主应用可以正常启动（`npm run dev`）
- [ ] 浏览器 DevTools 已打开（F12）
- [ ] 了解项目结构和关键文件位置
- [ ] 阅读过相关文档

---

**准备完毕！🎉 现在可以开始开发了！**

有任何问题，请参考：
- [项目全面分析文档](./PROJECT_COMPREHENSIVE_ANALYSIS.md)
- [协同编辑测试指南](../COLLABORATION_TESTING_GUIDE.md)
- 或查看各个子文档的详细说明
