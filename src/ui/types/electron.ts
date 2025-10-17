/**
 * Electron API 类型定义
 */

export interface ElectronAPI {
  // 通用的 IPC invoke 方法
  invoke: (channel: string, ...args: any[]) => Promise<any>
  
  // 窗口管理 API
  window: {
    minimize: () => Promise<any>
    maximize: () => Promise<any>
    toggleMaximize: () => Promise<any>
    close: () => Promise<any>
  }
  
  // 用户管理 API
  author: {
    login: (credentials: any) => Promise<any>
    register: (data: any) => Promise<any>
    getCurrentUser: (userId: string) => Promise<any>
    updateProfile: (userId: string, data: any) => Promise<any>
    changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<any>
    getStats: (userId: string) => Promise<any>
    findByEmail: (email: string) => Promise<any>
  }
  
  // 作品管理 API
  work: {
    create: (authorId: string, data: any) => Promise<any>
    get: (workId: string, userId: string) => Promise<any>
    getUserWorks: (userId: string, options?: any) => Promise<any>
    getAllWorks: (options?: any) => Promise<any>
    update: (workId: string, userId: string, data: any) => Promise<any>
    delete: (workId: string, userId: string) => Promise<any>
    search: (query: string, userId?: string) => Promise<any>
    getStats: (workId: string) => Promise<any>
    publish: (workId: string, userId: string) => Promise<any>
  }
  
  // 章节管理 API
  chapter: {
    create: (authorId: string, data: any) => Promise<any>
    get: (chapterId: string) => Promise<any>
    list: (workId: string, userId?: string) => Promise<any>
    update: (chapterId: string, userId: string, data: any) => Promise<any>
    delete: (chapterId: string, userId: string) => Promise<any>
    reorder: (userId: string, chapters: any[]) => Promise<any>
  }
  
  // 内容管理 API
  content: {
    create: (authorId: string, data: any) => Promise<any>
    get: (contentId: string, userId: string) => Promise<any>
    getByChapter: (chapterId: string, userId: string) => Promise<any>
    getByWork: (workId: string, userId?: string) => Promise<any>
    update: (contentId: string, userId: string, data: any) => Promise<any>
    autoSave: (contentId: string, userId: string, content: any) => Promise<any>
    delete: (contentId: string, userId: string) => Promise<any>
    getHistory: (contentId: string, userId: string) => Promise<any>
  }
  
  // 系统工具 API
  system: {
    getStats: () => Promise<any>
    generateId: () => string
    getTimestamp: (ulid: string) => number | null
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}