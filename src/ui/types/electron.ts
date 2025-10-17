/**
 * Electron API 类型定义
 */

export interface ElectronAPI {
  // 通用IPC调用方法
  invoke: (channel: string, ...args: any[]) => Promise<any>

  author: {
    login: (credentials: { username: string; password: string }) => Promise<any>
    register: (authorData: { username: string; password: string; displayName?: string; email?: string }) => Promise<any>
    getCurrentUser: (userId: string) => Promise<any>
    updateProfile: (userId: string, updateData: any) => Promise<any>
    changePassword: (userId: string, currentPassword: string, newPassword: string) => Promise<any>
    getStats: (userId: string) => Promise<any>
    findByEmail: (email: string) => Promise<any>
  }
  
  work: {
    create: (workData: { title: string; description?: string; authorId: string }) => Promise<any>
    list: (authorId: string) => Promise<any[]>
    find: (id: string) => Promise<any>
    update: (id: string, workData: Partial<{ title: string; description?: string }>) => Promise<any>
    delete: (id: string) => Promise<void>
  }
  
  chapter: {
    create: (chapterData: { title: string; content?: string; workId: string; orderIndex: number }) => Promise<any>
    list: (workId: string) => Promise<any[]>
    find: (id: string) => Promise<any>
    update: (id: string, chapterData: Partial<{ title: string; content?: string; orderIndex?: number }>) => Promise<any>
    delete: (id: string) => Promise<void>
  }

  content: {
    create: (contentData: any) => Promise<any>
    list: (chapterId: string) => Promise<any[]>
    update: (contentId: string, contentData: any) => Promise<any>
    delete: (contentId: string) => Promise<void>
  }
  
  system: {
    getStats: () => Promise<any>
    generateId: () => Promise<string>
    getTimestamp: (ulid: string) => Promise<number>
  }
  
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
  
  // 兼容旧API
  var gestell: any
}