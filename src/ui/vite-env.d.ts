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