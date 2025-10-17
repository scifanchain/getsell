// 加载环境变量
import 'dotenv/config';

import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
// 导入TypeScript模块
import { DatabaseManager } from './core/db-manager';
import { RepositoryContainer } from './repositories/RepositoryContainer';
import { ServiceContainer } from './services/ServiceContainer';
import { IPCManager } from './ipc/IPCManager';
import { authorConfigStore } from './core/storage/AuthorConfigStore';
import ulidGenerator from './core/ulid';
import GestallCrypto from './crypto/crypto';

// 导入类型定义
import {
  AuthorData,
  AuthorCreateResponse,
  WorkData,
  Work,
  ChapterData,
  Chapter,
  ContentData,
  Content,
  SystemStats,
  WindowResponse,
  IPCResponse,
  KeyPair
} from './shared/types';

// 版本信息
console.log('🚀 Gestell启动中...');
console.log('📦 Electron版本:', process.versions.electron);
console.log('🟢 Node.js版本:', process.versions.node);
console.log('🔧 Chrome版本:', process.versions.chrome);

// 核心实例
let crypto: any;
let mainWindow: BrowserWindow | null = null;

// 数据库和服务实例
let dbManager: DatabaseManager;
let repositories: RepositoryContainer;
let services: ServiceContainer;
let ipcManager: IPCManager;

function createWindow(): void {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    frame: false, // 使用自定义标题栏
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      preload: path.join(__dirname, '../src/preload.js')
    },
    show: false // 等待ready-to-show事件
  })

  // 加载应用的index.html
  // 检查是否是测试模式
  const isTestMode = process.argv.includes('--test');
  
  if (isTestMode) {
    // 测试模式：加载测试页面
    mainWindow.loadFile(path.join(__dirname, '../test/database-performance.html'));
    console.log('🧪 启动数据库性能测试模式');
  } else {
    // 正常模式：加载Vue应用
    if (process.env.NODE_ENV === 'development') {
      // 开发模式：连接Vite开发服务器
      mainWindow.loadURL('http://localhost:3000');
    } else {
      // 生产模式：加载构建后的文件
      mainWindow.loadFile(path.join(__dirname, '../dist/renderer/src/ui/index.html'));
    }
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.maximize(); 
      mainWindow.show(); 
      
      // 开发时打开开发者工具
      mainWindow.webContents.openDevTools();
      
      // 设置窗口标题
      mainWindow.setTitle('Gestell - 去中心化科幻写作平台');
      
      // 在 Windows 上自定义标题栏颜色
      if (process.platform === 'win32') {
        try {
          // 设置标题栏颜色 (适用于 Windows 10/11)
          mainWindow.setTitleBarOverlay({
            color: '#1a1a2e',      // 标题栏背景色
            symbolColor: '#ffffff', // 按钮颜色
            height: 30             // 标题栏高度
          });
        } catch (error: any) {
          console.log('设置标题栏颜色:', error.message);
        }
      }
    }
  });

  // 🔧 终极修复：移除所有复杂的关闭逻辑
  // 让程序直接通过 IPC 强制退出

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

async function initCore(): Promise<void> {
  try {
    // 初始化用户配置存储
    console.log('🔧 初始化作者配置存储');
    await authorConfigStore.loadConfig();
    console.log('✅ 作者配置存储初始化成功');
    
    // 完全使用 CR-SQLite 作为唯一数据库
    console.log('🔍 初始化数据库');
    const appDataPath = app.getPath('userData');
    const dbPath = path.join(appDataPath, 'gestell.db');
    
    dbManager = new DatabaseManager({
      dbPath,
      enableWal: true,
    });
    await dbManager.initialize();
    console.log('✅ 数据库初始化成功:', dbPath);
    
    // 创建仓储容器
    repositories = new RepositoryContainer(dbManager);
    console.log('✅ 仓储容器创建成功');
    
    // 初始化服务层
    console.log('🔧 初始化服务层');
    services = new ServiceContainer(repositories);
    console.log('✅ 服务层初始化成功');
    
    // 初始化加密模块
    crypto = new GestallCrypto();
    
    console.log('🚀 Gestell核心模块初始化成功');
    console.log('📊 数据库架构重构完成');
    console.log('✨ 使用 Drizzle ORM + CR-SQLite');
  } catch (error) {
    console.error('❌ 核心模块初始化失败:', error);
    throw error;
  }
}

// ========================================
// 新架构 IPC 处理器已在 IPCManager 中注册
// ========================================

// 应用准备就绪
app.whenReady().then(async () => {
  // 🔧 修复：先初始化核心模块，再创建窗口，最后初始化 IPC handlers
  await initCore();
  createWindow();
  
  // 在窗口创建后初始化 IPC 处理器
  console.log('📡 初始化IPC处理器');
  ipcManager = new IPCManager(services, mainWindow, dbManager);
  ipcManager.initialize();
  console.log('✅ IPC 处理器初始化成功');

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    try {
      if (dbManager) {
        dbManager.close();
        console.log('✅ 数据库连接已关闭');
      }
    } catch (error) {
      console.error('❌ 关闭数据库时出错:', error);
    }
    app.quit();
  }
});

// 应用即将退出时清理（避免重复关闭）
app.on('before-quit', () => {
  console.log('📝 应用即将退出');
  // 不再重复关闭数据库，因为 window-all-closed 已经处理了
});