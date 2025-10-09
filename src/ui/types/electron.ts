/**
 * Electron API 类型定义
 */

export interface ElectronAPI {
  user: {
    create: (userData: { name: string; email: string }) => Promise<any>
    find: (id: string) => Promise<any>
    findByEmail: (email: string) => Promise<any>
  }
  
  project: {
    create: (projectData: { title: string; description?: string; authorId: string }) => Promise<any>
    list: (authorId: string) => Promise<any[]>
    find: (id: string) => Promise<any>
    update: (id: string, projectData: Partial<{ title: string; description?: string }>) => Promise<any>
    delete: (id: string) => Promise<void>
  }
  
  chapter: {
    create: (chapterData: { title: string; content?: string; projectId: string; order?: number }) => Promise<any>
    list: (projectId: string) => Promise<any[]>
    find: (id: string) => Promise<any>
    update: (id: string, chapterData: Partial<{ title: string; content?: string; order?: number }>) => Promise<any>
    delete: (id: string) => Promise<void>
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
}