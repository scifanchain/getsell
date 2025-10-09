// 加载环境变量
import 'dotenv/config';

import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
// 导入TypeScript模块
import GestallPrismaDatabase from './core/prismadb';
import { DatabaseManager } from './core/database';
import { RepositoryContainer } from './data/RepositoryContainer';
import { ServiceContainer } from './services/ServiceContainer';
import { IPCManager } from './ipc/IPCManager';
import ulidGenerator from './core/ulid';
import GestallCrypto from './crypto/crypto';

// 导入类型定义
import {
  UserData,
  UserCreateResponse,
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
let db: any; // 保持旧实例向后兼容
let crypto: any;
let mainWindow: BrowserWindow | null = null;

// 新架构实例
let databaseManager: DatabaseManager;
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
      preload: path.join(__dirname, '../src/preload.js')
    },
    show: false // 等待ready-to-show事件
  });

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

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

async function initCore(): Promise<void> {
  try {
    // 初始化新架构
    console.log('🔍 初始化新的Repository架构');
    databaseManager = new DatabaseManager();
    await databaseManager.connect();
    
    repositories = new RepositoryContainer(databaseManager);
    
    // 初始化服务层
    console.log('🔧 初始化服务层');
    services = new ServiceContainer(repositories);
    
    // 初始化IPC处理器
    console.log('📡 初始化IPC处理器');
    ipcManager = new IPCManager(services, mainWindow);
    ipcManager.initialize();
    
    // 确保默认用户存在
    await repositories.userRepository.ensureDefaultUser();
    
    // 保持旧架构向后兼容
    console.log('🔍 使用Prisma数据库模式');
    db = new GestallPrismaDatabase();
    await db.connect();
    
    // 初始化加密模块
    crypto = new GestallCrypto();
    
    console.log('🚀 Gestell核心模块初始化成功');
  } catch (error) {
    console.error('❌ 核心模块初始化失败:', error);
  }
}

// ========================================
// 旧版 IPC 处理器 (已禁用，使用新的Service层架构)
// ========================================
/*
// IPC处理程序 - 用户管理
ipcMain.handle('user:create', async (event: IpcMainInvokeEvent, userData: UserData): Promise<IPCResponse<UserCreateResponse>> => {
  try {
    const userId = ulidGenerator.generate();
    
    // 生成用户密钥对
    const keyPair = crypto.generateKeyPair() as KeyPair;
    const encryptedPrivateKey = crypto.encryptPrivateKey(keyPair.privateKey, userData.password);
    
    // 密码哈希
    const passwordHash = crypto.hashContent(userData.password + userId); // 加盐哈希
    
    // 使用Prisma创建用户
    const user = await db.createUser({
      id: userId,
      username: userData.username,
      email: userData.email,
      passwordHash: passwordHash,
      publicKey: keyPair.publicKey,
      privateKeyEncrypted: encryptedPrivateKey
    });
    
    return { 
      success: true, 
      data: {
        userId: user.id,
        publicKey: keyPair.publicKey 
      }
    };
  } catch (error: any) {
    console.error('创建用户失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC处理程序 - 作品管理
ipcMain.handle('work:create', async (event: IpcMainInvokeEvent, workData: WorkData): Promise<IPCResponse<{ workId: string; work: any }>> => {
  try {
    // 使用Prisma创建作品
    const work = await db.createWork({
      title: workData.title,
      description: workData.description,
      genre: workData.genre,
      authorId: workData.authorId || 'user_mock_001',
      collaborationMode: workData.collaborationMode || 'solo'
    });
    
    return { success: true, data: { workId: work.id, work } };
  } catch (error: any) {
    console.error('创建作品失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('work:list', async (event: IpcMainInvokeEvent, authorId?: string): Promise<IPCResponse<{ works: Work[] }>> => {
  try {
    // 使用Prisma查询
    const workList = await db.getWorksList(authorId || 'user_mock_001');
    const works: Work[] = workList.map((work: any) => ({
      id: work.id,
      title: work.title,
      description: work.description,
      genre: work.genre,
      authorId: work.authorId,
      collaborationMode: work.collaborationMode,
      createdAt: work.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: work.updatedAt?.toISOString() || new Date().toISOString(),
      chapters: [] // 暂时不加载章节数据
    }));
    return { success: true, data: { works } };
  } catch (error: any) {
    console.error('获取作品列表失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC处理程序 - 章节管理
ipcMain.handle('chapter:create', async (event: IpcMainInvokeEvent, chapterData: ChapterData): Promise<IPCResponse<{ chapterId: string; chapter: any }>> => {
  try {
    // 使用Prisma创建章节
    const chapter = await db.createChapter({
      workId: chapterData.workId,
      title: chapterData.title,
      parentId: chapterData.parentId,
      orderIndex: chapterData.orderIndex || 0,
      subtitle: chapterData.subtitle,
      description: chapterData.description,
      type: chapterData.type || 'chapter',
      authorId: chapterData.authorId || 'user_mock_001'
    });
    
    return { success: true, data: { chapterId: chapter.id, chapter } };
  } catch (error: any) {
    console.error('创建章节失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chapter:list', async (event: IpcMainInvokeEvent, workId: string): Promise<IPCResponse<{ chapters: Chapter[] }>> => {
  try {
    // 使用Prisma查询章节列表
    const chapters = await db.getChaptersList(workId);
    const formattedChapters: Chapter[] = chapters.map((chapter: any) => ({
      id: chapter.id,
      title: chapter.title,
      content: chapter.content,
      workId: chapter.workId,
      order: chapter.orderIndex || 0,
      parentId: chapter.parentId,
      orderIndex: chapter.orderIndex,
      subtitle: chapter.subtitle,
      description: chapter.description,
      type: chapter.type,
      authorId: chapter.authorId,
      character_count: chapter.characterCount,
      content_count: chapter._count?.contents || 0,
      child_chapter_count: chapter._count?.children || 0,
      author_id: chapter.authorId,
      created_at: Number(chapter.createdAt),
      updated_at: Number(chapter.updatedAt)
    }));
    return { success: true, data: { chapters: formattedChapters } };
  } catch (error: any) {
    console.error('获取章节列表失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chapter:update', async (event: IpcMainInvokeEvent, chapterId: string, chapterData: Partial<ChapterData>): Promise<IPCResponse<{ chapter: any }>> => {
  try {
    // 使用Prisma更新章节
    const chapter = await db.updateChapter(chapterId, {
      title: chapterData.title,
      subtitle: chapterData.subtitle,
      description: chapterData.description,
      // status: chapterData.status
    });
    return { success: true, data: { chapter } };
  } catch (error: any) {
    console.error('更新章节失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC处理程序 - 内容管理
ipcMain.handle('content:create', async (event: IpcMainInvokeEvent, contentData: ContentData): Promise<IPCResponse<{ contentId: string; content: any }>> => {
  try {
    // 使用Prisma创建内容
    const content = await db.createContent({
      workId: contentData.workId,
      chapterId: contentData.chapterId,
      title: contentData.title,
      type: contentData.type || 'text',
      contentJson: contentData.contentJson || '',  // 使用 ProseMirror JSON 格式
      contentHtml: contentData.contentHtml || '',
      orderIndex: contentData.orderIndex || 0,
      authorId: contentData.authorId || 'user_mock_001'
    });
    
    return { success: true, data: { contentId: content.id, content } };
  } catch (error: any) {
    console.error('创建内容失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('content:list', async (event: IpcMainInvokeEvent, workId: string, chapterId?: any): Promise<IPCResponse<{ contents: any[] }>> => {
  try {
    // 使用Prisma查询内容列表
    const contents = await db.getContentsList(workId, chapterId);
    return { success: true, data: { contents } };
  } catch (error: any) {
    console.error('获取内容列表失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('content:update', async (event: IpcMainInvokeEvent, contentId: string, contentData: Partial<ContentData>): Promise<IPCResponse<{ content: any }>> => {
  try {
    // 使用Prisma更新内容
    const content = await db.updateContent(contentId, contentData);
    return { success: true, data: { content } };
  } catch (error: any) {
    console.error('更新内容失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC处理程序 - 窗口控制
ipcMain.handle('window:minimize', (): WindowResponse => {
  console.log('🔵 收到最小化请求');
  if (mainWindow) {
    mainWindow.minimize();
    console.log('✅ 窗口已最小化');
    return { success: true };
  } else {
    console.log('❌ mainWindow 不存在');
    return { success: false, error: 'mainWindow not found' };
  }
});

ipcMain.handle('window:maximize', (): WindowResponse => {
  console.log('🟡 收到最大化请求');
  if (mainWindow) {
    mainWindow.maximize();
    console.log('✅ 窗口已最大化');
    return { success: true };
  } else {
    console.log('❌ mainWindow 不存在');
    return { success: false, error: 'mainWindow not found' };
  }
});

ipcMain.handle('window:toggleMaximize', (): WindowResponse => {
  console.log('🟡 收到切换最大化请求');
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      console.log('✅ 窗口已还原');
    } else {
      mainWindow.maximize();
      console.log('✅ 窗口已最大化');
    }
    return { success: true };
  } else {
    console.log('❌ mainWindow 不存在');
    return { success: false, error: 'mainWindow not found' };
  }
});

ipcMain.handle('window:close', (): WindowResponse => {
  console.log('🔴 收到关闭请求');
  if (mainWindow) {
    mainWindow.close();
    console.log('✅ 窗口已关闭');
    return { success: true };
  } else {
    console.log('❌ mainWindow 不存在');
    return { success: false, error: 'mainWindow not found' };
  }
});

// IPC处理程序 - 系统信息
ipcMain.handle('system:getStats', async (): Promise<IPCResponse<{ stats: any }>> => {
  try {
    // 使用Prisma获取统计信息
    const stats = await db.getStats();
    return { success: true, data: { stats } };
  } catch (error: any) {
    console.error('获取系统统计失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('system:generateId', (): string => {
  return ulidGenerator.generate();
});

ipcMain.handle('system:getTimestamp', (event: IpcMainInvokeEvent, ulid: string): number | null => {
  try {
    return ulidGenerator.getTimestamp(ulid);
  } catch (error) {
    return null;
  }
});
*/
// ========================================
// 新架构 IPC 处理器已在 IPCManager 中注册
// ========================================

// 应用准备就绪
app.whenReady().then(async () => {
  createWindow();
  await initCore();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', async function () {
  if (process.platform !== 'darwin') {
    // 关闭数据库连接
    if (db) {
      await db.disconnect();
    }
    app.quit();
  }
});

// 应用即将退出时清理
app.on('before-quit', async () => {
  if (db) {
    await db.disconnect();
  }
});