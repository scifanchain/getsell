# Gestell - 座架

去中心化的区块链科幻写作软件

## 项目结构

```
gestell/
├── src/                    # 源代码
│   ├── main.js            # Electron主进程
│   ├── renderer.js        # 渲染进程脚本
│   ├── index.html         # 主界面
│   ├── styles.css         # 样式文件
│   └── core/              # 核心模块
│       └── database.js    # 数据库管理
├── assets/                # 静态资源（图标、图片等）
├── data/                  # 用户数据（被.gitignore忽略）
├── node_modules/          # 依赖包（被.gitignore忽略）
├── package.json           # 项目配置
├── .gitignore            # Git忽略规则
└── gestell.code-workspace # VS Code工作区配置
```

## 开发环境

### 安装依赖
```bash
npm install
```

### 启动应用
```bash
npm start
```

### 构建应用
```bash
npm run build
```

## Git版本控制

### 被忽略的文件/目录
- `data/` - 用户创作数据和数据库文件
- `node_modules/` - npm依赖包
- `dist/`, `build/` - 构建输出
- `*.db`, `*.sqlite` - 数据库文件
- 各种临时文件和缓存

### 包含在版本控制中的文件
- 源代码 (`src/`)
- 配置文件 (`package.json`, `.gitignore`)
- 文档文件 (`README.md`)
- 工作区配置 (`*.code-workspace`)

## 技术栈

- **前端**: Electron, HTML5, CSS3, JavaScript
- **编辑器**: Quill.js
- **数据库**: SQLite3 (better-sqlite3)
- **加密**: crypto-js
- **ID生成**: ULID

## 开发指南

1. 用户数据存储在`data/`目录中，该目录不会被提交到版本控制
2. 数据库文件自动创建，包含完整的迁移系统
3. 使用VS Code工作区配置获得最佳开发体验

## 许可证

MIT License