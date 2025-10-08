const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const GestallDatabase = require('./core/database');
const ULIDGenerator = require('./core/ulid');
const GestallCrypto = require('./crypto/crypto');

// 核心实例
let db;
let crypto;
let mainWindow;

function createWindow() {
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
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // 等待ready-to-show事件
  });

  // 加载应用的index.html
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
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
      } catch (error) {
        console.log('设置标题栏颜色:', error.message);
      }
    }
  });

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function initCore() {
  try {
    // 初始化数据库
    db = new GestallDatabase();
    
    // 初始化加密模块
    crypto = new GestallCrypto();
    
    console.log('🚀 Gestell核心模块初始化成功');
  } catch (error) {
    console.error('❌ 核心模块初始化失败:', error);
  }
}

// IPC处理程序 - 用户管理
ipcMain.handle('user:create', async (event, userData) => {
  try {
    const userId = ULIDGenerator.generate();
    const timestamp = Date.now();
    
    // 生成用户密钥对
    const keyPair = crypto.generateKeyPair();
    const encryptedPrivateKey = crypto.encryptPrivateKey(keyPair.privateKey, userData.password);
    
    // 密码哈希
    const passwordHash = crypto.hashContent(userData.password + userId); // 加盐哈希
    
    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, public_key, private_key_encrypted, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(userId, userData.username, userData.email, passwordHash, keyPair.publicKey, encryptedPrivateKey, timestamp, timestamp);
    
    return { 
      success: true, 
      userId,
      publicKey: keyPair.publicKey 
    };
  } catch (error) {
    console.error('创建用户失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC处理程序 - 项目管理
ipcMain.handle('project:create', async (event, projectData) => {
  try {
    const projectId = ULIDGenerator.generate();
    const timestamp = Date.now();
    
    const stmt = db.prepare(`
      INSERT INTO projects (id, title, description, genre, author_id, collaboration_mode, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      projectId, 
      projectData.title, 
      projectData.description, 
      projectData.genre, 
      projectData.authorId, 
      projectData.collaborationMode || 'private',
      'draft',
      timestamp, 
      timestamp
    );
    
    return { success: true, projectId };
  } catch (error) {
    console.error('创建项目失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('project:list', async (event, authorId) => {
  try {
    const stmt = db.prepare('SELECT * FROM projects WHERE author_id = ? ORDER BY updated_at DESC');
    const projects = stmt.all(authorId);
    return { success: true, projects };
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC处理程序 - 章节管理
ipcMain.handle('chapter:create', async (event, chapterData) => {
  try {
    const chapterId = ULIDGenerator.generate();
    const timestamp = Date.now();
    
    const stmt = db.prepare(`
      INSERT INTO chapters (id, project_id, title, content_delta, content_html, word_count, character_count, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      chapterId,
      chapterData.projectId,
      chapterData.title,
      chapterData.contentDelta,
      chapterData.contentHtml,
      chapterData.wordCount || 0,
      chapterData.characterCount || 0,
      chapterData.orderIndex,
      timestamp,
      timestamp
    );
    
    return { success: true, chapterId };
  } catch (error) {
    console.error('创建章节失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chapter:list', async (event, projectId) => {
  try {
    const stmt = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY order_index ASC');
    const chapters = stmt.all(projectId);
    return { success: true, chapters };
  } catch (error) {
    console.error('获取章节列表失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('chapter:update', async (event, chapterId, chapterData) => {
  try {
    const timestamp = Date.now();
    
    const stmt = db.prepare(`
      UPDATE chapters 
      SET title = ?, content_delta = ?, content_html = ?, word_count = ?, character_count = ?, updated_at = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      chapterData.title,
      chapterData.contentDelta,
      chapterData.contentHtml,
      chapterData.wordCount,
      chapterData.characterCount,
      timestamp,
      chapterId
    );
    
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error('更新章节失败:', error);
    return { success: false, error: error.message };
  }
});

// IPC处理程序 - 窗口控制
ipcMain.handle('window:minimize', () => {
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

ipcMain.handle('window:maximize', () => {
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

ipcMain.handle('window:toggleMaximize', () => {
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

ipcMain.handle('window:close', () => {
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
ipcMain.handle('system:getStats', async () => {
  try {
    const stats = db.getStats();
    return { success: true, stats };
  } catch (error) {
    console.error('获取系统统计失败:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('system:generateId', () => {
  return ULIDGenerator.generate();
});

ipcMain.handle('system:getTimestamp', (event, ulid) => {
  try {
    return ULIDGenerator.getTimestamp(ulid);
  } catch (error) {
    return null;
  }
});

// 应用准备就绪
app.whenReady().then(() => {
  initCore();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    // 关闭数据库连接
    if (db) {
      db.close();
    }
    app.quit();
  }
});

// 应用即将退出时清理
app.on('before-quit', () => {
  if (db) {
    db.close();
  }
});