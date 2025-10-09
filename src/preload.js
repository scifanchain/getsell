const { contextBridge, ipcRenderer } = require('electron');

// 通过contextBridge暴露API到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 通用IPC调用方法
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // 用户管理API (新架构)
  user: {
    // 兼容旧接口
    create: (userData) => ipcRenderer.invoke('user:create', userData),
    find: (id) => ipcRenderer.invoke('user:find', id),
    findByEmail: (email) => ipcRenderer.invoke('user:findByEmail', email),
    update: (id, userData) => ipcRenderer.invoke('user:update', id, userData),
    delete: (id) => ipcRenderer.invoke('user:delete', id),
  },

  // 项目管理API (兼容旧接口)
  project: {
    create: (projectData) => ipcRenderer.invoke('project:create', projectData),
    list: (authorId) => ipcRenderer.invoke('project:list', authorId),
    find: (id) => ipcRenderer.invoke('project:find', id),
    update: (id, projectData) => ipcRenderer.invoke('project:update', id, projectData),
    delete: (id) => ipcRenderer.invoke('project:delete', id),
  },

  // 章节管理API
  chapter: {
    create: (chapterData) => ipcRenderer.invoke('chapter:create', chapterData),
    list: (workId) => ipcRenderer.invoke('chapter:list', workId),
    update: (chapterId, chapterData) => ipcRenderer.invoke('chapter:update', chapterId, chapterData),
    delete: (chapterId) => ipcRenderer.invoke('chapter:delete', chapterId),
  },

  // 内容管理API
  content: {
    create: (contentData) => ipcRenderer.invoke('content:create', contentData),
    list: (chapterId) => ipcRenderer.invoke('content:list', chapterId),
    update: (contentId, contentData) => ipcRenderer.invoke('content:update', contentId, contentData),
    delete: (contentId) => ipcRenderer.invoke('content:delete', contentId),
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

// 兼容旧的 gestell API
contextBridge.exposeInMainWorld('gestell', {
  // 用户管理API
  user: {
    create: (userData) => ipcRenderer.invoke('user:create', userData),
  },

  // 作品管理API
  work: {
    create: (workData) => ipcRenderer.invoke('work:create', workData),
    list: (authorId) => ipcRenderer.invoke('work:list', authorId),
  },

  // 章节管理API
  chapter: {
    create: (chapterData) => ipcRenderer.invoke('chapter:create', chapterData),
    list: (workId) => ipcRenderer.invoke('chapter:list', workId),
    update: (chapterId, chapterData) => ipcRenderer.invoke('chapter:update', chapterId, chapterData),
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