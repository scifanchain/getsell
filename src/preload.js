const { contextBridge, ipcRenderer } = require('electron');

// 通过contextBridge暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 通用IPC调用方法
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // 作者管理API
  author: {
    login: (credentials) => ipcRenderer.invoke('author:login', credentials),
    register: (userData) => ipcRenderer.invoke('author:register', userData),
    getCurrentUser: (userId) => ipcRenderer.invoke('author:getCurrentUser', userId),
    updateProfile: (userId, updateData) => ipcRenderer.invoke('author:updateProfile', userId, updateData),
    changePassword: (userId, currentPassword, newPassword) => ipcRenderer.invoke('author:changePassword', userId, currentPassword, newPassword),
    getStats: (userId) => ipcRenderer.invoke('author:getStats', userId),
    findByEmail: (email) => ipcRenderer.invoke('author:findByEmail', email),
  },

  // 作品管理API
  work: {
    create: (authorId, workData) => ipcRenderer.invoke('work:create', authorId, workData),
    list: (authorId) => ipcRenderer.invoke('work:list', authorId),
    get: (workId, userId) => ipcRenderer.invoke('work:get', workId, userId),
    update: (workId, userId, updateData) => ipcRenderer.invoke('work:update', workId, userId, updateData),
    delete: (workId, userId) => ipcRenderer.invoke('work:delete', workId, userId),
  },

  // 章节管理API
  chapter: {
    create: (authorId, chapterData) => ipcRenderer.invoke('chapter:create', authorId, chapterData),
    list: (workId, userId) => ipcRenderer.invoke('chapter:list', workId, userId),
    update: (chapterId, userId, chapterData) => ipcRenderer.invoke('chapter:update', chapterId, userId, chapterData),
    delete: (chapterId, userId) => ipcRenderer.invoke('chapter:delete', chapterId, userId),
  },

  // 内容管理API
  content: {
    create: (authorId, contentData) => ipcRenderer.invoke('content:create', authorId, contentData),
    getById: (contentId) => ipcRenderer.invoke('content:get', contentId),
    getByChapter: (chapterId) => ipcRenderer.invoke('content:getByChapter', chapterId),
    getByWork: (workId) => ipcRenderer.invoke('content:getByWork', workId),
    update: (contentId, userId, updateData) => ipcRenderer.invoke('content:update', contentId, userId, updateData),
    autoSave: (contentId, userId, content) => ipcRenderer.invoke('content:autoSave', contentId, userId, content),
    delete: (contentId, userId) => ipcRenderer.invoke('content:delete', contentId, userId),
    getHistory: (contentId, userId) => ipcRenderer.invoke('content:getHistory', contentId, userId),
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