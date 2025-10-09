const { contextBridge, ipcRenderer } = require('electron');

// 通过contextBridge暴露API到渲染进程
contextBridge.exposeInMainWorld('gestell', {
  // 用户管理API
  user: {
    create: (userData) => ipcRenderer.invoke('user:create', userData),
    // TODO: 添加登录、认证等功能
  },

  // 作品管理API
  work: {
    create: (workData) => ipcRenderer.invoke('work:create', workData),
    list: (authorId) => ipcRenderer.invoke('work:list', authorId),
    // TODO: 添加更新、删除等功能
  },

  // 章节管理API
  chapter: {
    create: (chapterData) => ipcRenderer.invoke('chapter:create', chapterData),
    list: (workId) => ipcRenderer.invoke('chapter:list', workId),
    update: (chapterId, chapterData) => ipcRenderer.invoke('chapter:update', chapterId, chapterData),
    // TODO: 添加删除、排序等功能
  },

  // 系统工具API
  system: {
    getStats: () => ipcRenderer.invoke('system:getStats'),
    generateId: () => ipcRenderer.invoke('system:generateId'),
    getTimestamp: (ulid) => ipcRenderer.invoke('system:getTimestamp', ulid),
  },

  // 窗口控制API
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // 应用信息
  app: {
    getVersion: () => process.versions.electron,
    getNodeVersion: () => process.versions.node,
    getChromiumVersion: () => process.versions.chrome
  }
});