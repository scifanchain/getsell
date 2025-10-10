/**
 * Pinia Store 入口文件
 */

import { createPinia } from 'pinia'

// 导出 store 实例
export const store = createPinia()

// 导出所有 stores
export { useUserStore } from './user'
export { useWorkStore } from './work'
export { useChapterStore } from './chapter'
export { useAppStore } from './app'
export { useEditorStore } from './editor'