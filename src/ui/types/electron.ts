/**
 * Electron API 类型定义
 */

export interface ElectronAPI {
  // 通用IPC调用方法
  invoke: (channel: string, ...args: any[]) => Promise<any>

  user: {
    create: (userData: { name: string; email: string }) => Promise<any>
    find: (id: string) => Promise<any>
    findByEmail: (email: string) => Promise<any>
    update: (id: string, userData: any) => Promise<any>
    delete: (id: string) => Promise<void>
  }
  
  project: {
    create: (projectData: { title: string; description?: string; authorId: string }) => Promise<any>
    list: (authorId: string) => Promise<any[]>
    find: (id: string) => Promise<any>
    update: (id: string, projectData: Partial<{ title: string; description?: string }>) => Promise<any>
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