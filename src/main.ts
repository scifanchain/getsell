import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
// 使用require暂时导入JS模块，使用绝对路径
const GestallPrismaDatabase = require(path.join(__dirname, '../src/core/prismadb'));
const ULIDGenerator = require(path.join(__dirname, '../src/core/ulid'));
const GestallCrypto = require(path.join(__dirname, '../src/crypto/crypto'));

// 导入类型定义
import {
  UserData,
  UserCreateResponse,
  ProjectData,
  Project,
  ChapterData,
  Chapter,
  ContentData,
  Content,
  SystemStats,
  WindowResponse,
  IPCResponse,
  KeyPair
} from './types/interfaces';

// 版本信息
console.log('🚀 Gestell启动中...');
console.log('📦 Electron版本:', process.versions.electron);
console.log('🟢 Node.js版本:', process.versions.node);
console.log('🔧 Chrome版本:', process.versions.chrome);

// 核心实例
let db: any;
let crypto: any;
let mainWindow: BrowserWindow | null = null;

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
    // 正常模式：加载主页面
    mainWindow.loadFile(path.join(__dirname, '../src/index.html'));
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
    // 使用Prisma数据库
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

// IPC处理程序 - 用户管理
ipcMain.handle('user:create', async (event: IpcMainInvokeEvent, userData: UserData): Promise<IPCResponse<UserCreateResponse>> => {
  try {
    const userId = ULIDGenerator.generate();
    
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

// IPC处理程序 - 项目管理
ipcMain.handle('project:create', async (event: IpcMainInvokeEvent, projectData: ProjectData): Promise<IPCResponse<{ projectId: string; work: any }>> => {
  try {
    // 使用Prisma创建项目
    const work = await db.createWork({
      title: projectData.title,
      description: projectData.description,
      genre: projectData.genre,
      authorId: projectData.authorId || 'user_mock_001',
      collaborationMode: projectData.collaborationMode || 'solo'
    });
    
    return { success: true, data: { projectId: work.id, work } };
  } catch (error: any) {
    console.error('创建项目失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:list', async (event: IpcMainInvokeEvent, authorId?: string): Promise<IPCResponse<{ projects: Project[] }>> => {
  try {
    // 使用Prisma查询
    const works = await db.getWorksList(authorId || 'user_mock_001');
    const projects: Project[] = works.map((work: any) => ({
      id: work.id,
      title: work.title,
      description: work.description,
      genre: work.genre,
      author_id: work.authorId,
      collaboration_mode: work.collaborationMode,
      status: work.status,
      created_at: Number(work.createdAt),
      updated_at: Number(work.updatedAt),
      chapter_count: work._count?.chapters || 0,
      content_count: work._count?.contents || 0
    }));
    return { success: true, data: { projects } };
  } catch (error: any) {
    console.error('获取项目列表失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC处理程序 - 章节管理
ipcMain.handle('chapter:create', async (event: IpcMainInvokeEvent, chapterData: ChapterData): Promise<IPCResponse<{ chapterId: string; chapter: any }>> => {
  try {
    // 使用Prisma创建章节
    const chapter = await db.createChapter({
      workId: chapterData.projectId,
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

ipcMain.handle('chapter:list', async (event: IpcMainInvokeEvent, projectId: string): Promise<IPCResponse<{ chapters: Chapter[] }>> => {
  try {
    // 使用Prisma查询章节列表
    const chapters = await db.getChaptersList(projectId);
    const formattedChapters: Chapter[] = chapters.map((chapter: any) => ({
      id: chapter.id,
      project_id: chapter.workId,
      work_id: chapter.workId,
      parent_id: chapter.parentId,
      level: chapter.level,
      order_index: chapter.orderIndex,
      title: chapter.title,
      subtitle: chapter.subtitle,
      description: chapter.description,
      type: chapter.type,
      status: chapter.status,
      word_count: chapter.wordCount,
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
      workId: contentData.projectId || contentData.workId!,
      chapterId: contentData.chapterId,
      title: contentData.title,
      type: contentData.type || 'text',
      contentDelta: contentData.contentDelta || '',
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
  return ULIDGenerator.generate();
});

ipcMain.handle('system:getTimestamp', (event: IpcMainInvokeEvent, ulid: string): number | null => {
  try {
    return ULIDGenerator.getTimestamp(ulid);
  } catch (error) {
    return null;
  }
});

// 应用准备就绪
app.whenReady().then(async () => {
  await initCore();
  createWindow();

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