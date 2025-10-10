/// <reference types="vite/client" />
/// <reference path="./types/electron.ts" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 扩展已有的ImportMetaEnv
interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string
  DEV: boolean
  MODE: string
  PROD: boolean
  SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Electron API类型声明
interface ElectronAPI {
  window: {
    minimize: () => Promise<any>
    maximize: () => Promise<any>
    toggleMaximize: () => Promise<any>
    close: () => Promise<any>
  }
  project: {
    create: (data: any) => Promise<any>
    list: (authorId?: string) => Promise<any>
    update: (id: string, data: any) => Promise<any>
  }
  chapter: {
    create: (data: any) => Promise<any>
    list: (workId: string) => Promise<any>
    update: (id: string, data: any) => Promise<any>
  }
  content: {
    create: (data: any) => Promise<any>
    list: (workId: string, chapterId?: string) => Promise<any>
    update: (id: string, data: any) => Promise<any>
  }
  system: {
    getStats: () => Promise<any>
    generateId: () => string
    getTimestamp: (ulid: string) => number | null
  }
}

interface Window {
  gestell: ElectronAPI
}