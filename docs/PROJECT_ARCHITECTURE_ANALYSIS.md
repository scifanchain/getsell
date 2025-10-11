# Gestell 项目架构全面分析报告

## 项目概述

Gestell（座架）是一个基于 Electron + Vue 3 + TypeScript 的科幻小说写作工具，具有以下核心特性：
- 桌面原生应用
- 富文本编辑器（基于ProseMirror）
- 层级化章节管理
- 区块链集成
- SQLite 本地数据库

## 技术栈分析

### 核心框架
- **前端**: Vue 3.5.22 + TypeScript 5.9.3
- **桌面框架**: Electron 32.0.0
- **构建工具**: Vite 6.3.6
- **路由**: Vue Router 4.5.1
- **状态管理**: Pinia 3.0.3

### 数据库层
- **ORM**: Prisma 6.17.0
- **数据库**: SQLite
- **Schema生成**: TypeScript类型安全

### 开发工具
- **测试框架**: Jest 30.2.0
- **代码质量**: TypeScript严格模式
- **构建工具**: Vite + Electron Builder

### 专业依赖
- **富文本编辑**: ProseMirror生态系统
- **加密**: crypto-js 4.2.0
- **唯一标识**: ULID 2.3.0
- **拖拽**: Sortable.js, Vuedraggable
- **文件处理**: JSZip
- **代码高亮**: Highlight.js

## 项目结构分析

### 整体目录结构
```
gestell/
├── src/                    # 源代码目录
│   ├── main.ts            # Electron主进程入口
│   ├── preload.js         # 预加载脚本
│   ├── core/              # 核心基础设施
│   ├── data/              # 数据访问层
│   ├── services/          # 业务逻辑层
│   ├── ipc/               # 进程间通信
│   ├── ui/                # Vue前端应用
│   ├── shared/            # 共享类型定义
│   ├── crypto/            # 加密模块
│   ├── utils/             # 工具函数
│   └── generated/         # Prisma生成文件
├── prisma/                # 数据库Schema和迁移
├── data/                  # SQLite数据文件
├── docs/                  # 项目文档
└── test/                  # 测试文件
```

### 核心模块架构

#### 1. 核心基础设施 (src/core/)
- `database.ts`: 数据库管理器
- `prismadb.ts`: Prisma客户端封装
- `ulid.ts`: 唯一标识生成器

#### 2. 数据访问层 (src/data/)
- `RepositoryContainer.ts`: 仓储模式容器
- `interfaces/`: 数据访问接口定义
- `prisma/`: Prisma相关配置

#### 3. 业务逻辑层 (src/services/)
- `ServiceContainer.ts`: 服务容器（依赖注入）
- `UserService.ts`: 用户管理服务
- `WorkService.ts`: 作品管理服务
- `ChapterService.ts`: 章节管理服务
- `ContentService.ts`: 内容管理服务

#### 4. IPC通信层 (src/ipc/)
- `IPCManager.ts`: IPC处理器管理器
- `*IPCHandler.ts`: 各业务域的IPC处理器

#### 5. UI层 (src/ui/)
```
ui/
├── App.vue               # 根组件
├── main.ts              # Vue应用入口
├── components/          # 可复用组件
├── views/               # 页面视图
├── router/              # 路由配置
├── stores/              # Pinia状态管理
├── composables/         # Vue组合式函数
└── services/            # 前端服务层
```

## 数据库架构分析

### 核心实体模型

#### 1. 用户体系
- **Author**: 作者信息，支持区块链钱包集成
- **UserData**: 用户数据传输对象

#### 2. 作品体系
- **Work**: 作品主体信息
- **Chapter**: 章节层级结构（支持无限层级）
- **Content**: 内容块（基于ProseMirror JSON格式）
- **ContentVersion**: 内容版本控制

#### 3. 辅助体系
- **Character**: 角色管理
- **CollaborationLog**: 协作日志
- **BlockchainSync**: 区块链同步记录

### 数据模型特点
1. **层级化设计**: Chapter支持父子关系的无限层级
2. **版本控制**: Content支持完整的版本历史
3. **区块链集成**: 内置区块链哈希和同步机制
4. **协作支持**: 多用户协作日志记录
5. **富文本存储**: 基于ProseMirror的JSON格式存储

### 数据库迁移历史
- `20241009120000_baseline`: 基础数据结构
- `20251009123912_update_content_format_to_prosemirror`: 切换到ProseMirror格式
- `20251009142913_del_work_fields`: 清理Work表字段
- `20251009170935_convert_timestamps_to_datetime`: 时间戳格式优化

## 架构设计模式

### 1. 分层架构
```
UI层 (Vue组件) 
    ↓ IPC通信
业务逻辑层 (Services)
    ↓ 依赖注入
数据访问层 (Repositories)
    ↓ ORM
数据库层 (SQLite + Prisma)
```

### 2. 依赖注入模式
- **ServiceContainer**: 管理所有业务服务
- **RepositoryContainer**: 管理所有数据访问层
- 支持懒加载和单例模式

### 3. 仓储模式
- 抽象数据访问逻辑
- 统一接口定义
- 便于测试和维护

### 4. IPC处理器模式
- 按业务域分离IPC处理逻辑
- 统一的错误处理和响应格式
- 类型安全的通信协议

## 前端架构特点

### 1. Vue 3 组合式API
- 使用`<script setup>`语法
- TypeScript类型推导
- 响应式数据管理

### 2. 路由设计
- 基于文件的视图组织
- 嵌套路由支持
- 路由元信息配置

### 3. 状态管理
- Pinia存储用户状态
- 响应式数据流
- 持久化存储支持

### 4. 组件架构
- **全局组件**: TitleBar、GlobalSidebar、StatusBar
- **业务组件**: WorkCreateModal、ChapterEditModal等
- **编辑器组件**: ProseMirrorEditor、EnhancedEditor

## 开发工具链

### 1. 构建配置
- **主进程**: TypeScript编译到`dist/main.js`
- **渲染进程**: Vite构建到`dist/renderer/`
- **类型生成**: Prisma自动生成TypeScript类型

### 2. 开发环境
- 并发开发模式：`npm run dev`
- 热重载支持
- 自动重建机制

### 3. 测试配置
- Jest单元测试
- 覆盖率报告
- 集成测试支持

## 项目优势

### 1. 架构优势
- **清晰的分层结构**: 便于维护和扩展
- **类型安全**: 全程TypeScript支持
- **模块化设计**: 高内聚低耦合
- **依赖注入**: 便于测试和替换组件

### 2. 技术优势
- **现代化技术栈**: Vue 3 + TypeScript + Vite
- **专业编辑器**: ProseMirror富文本编辑
- **数据完整性**: Prisma ORM + SQLite
- **桌面原生**: Electron提供原生体验

### 3. 业务优势
- **版本控制**: 完整的内容版本历史
- **层级管理**: 灵活的章节组织结构
- **区块链集成**: 版权保护和去中心化存储
- **协作支持**: 多用户写作协作

## 潜在改进建议

### 1. 性能优化
- 实现虚拟滚动优化大型文档
- 添加内容懒加载机制
- 优化ProseMirror编辑器性能

### 2. 功能扩展
- 实现实时协作编辑
- 添加插件系统支持
- 增强搜索和替换功能

### 3. 代码质量
- 增加单元测试覆盖率
- 实现端到端测试
- 添加代码格式化工具

### 4. 用户体验
- 改进响应式设计
- 添加键盘快捷键系统
- 优化加载和保存体验

## 开发准备建议

### 1. 环境设置
- 确保Node.js 18+和npm最新版本
- 安装SQLite工具用于数据库调试
- 配置TypeScript开发环境

### 2. 开发工具
- 推荐使用VS Code + Vue官方扩展
- 安装Prisma扩展用于Schema编辑
- 配置ESLint和Prettier

### 3. 学习重点
- 熟悉ProseMirror编辑器API
- 理解Electron主进程/渲染进程架构
- 掌握Prisma ORM使用方法

### 4. 调试建议
- 使用Electron DevTools调试渲染进程
- 利用主进程控制台调试后端逻辑
- 通过Prisma Studio查看数据库状态

## 总结

Gestell项目展现了一个设计良好的桌面应用架构，具有清晰的分层结构、现代化的技术栈和专业的业务逻辑设计。项目特别适合科幻小说创作的需求，提供了从基础写作到版权保护的完整解决方案。

架构的模块化设计使得项目具有良好的可维护性和可扩展性，为后续的功能开发和性能优化奠定了坚实的基础。

*生成时间: 2025年10月11日*