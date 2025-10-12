/**
 * 应用全局状态管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SystemStats } from '../types/models'
import { systemApi } from '../services/api'
import { useUserStore } from './user'

export const useAppStore = defineStore('app', () => {
  // State
  const isInitialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const stats = ref<SystemStats | null>(null)
  
  // UI 状态
  const sidebarCollapsed = ref(false)
  const theme = ref<'light' | 'dark' | 'auto'>('auto')
  const currentView = ref('home')
  
  // Getters
  const isDarkTheme = computed(() => {
    if (theme.value === 'auto') {
      // 检测系统主题
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme.value === 'dark'
  })
  
  const statsDisplay = computed(() => {
    if (!stats.value) return null
    return {
      users: stats.value.users,
      projects: stats.value.projects,
      chapters: stats.value.chapters,
      storageUsed: `${(stats.value.storage.used / 1024 / 1024).toFixed(2)} MB`,
      storageTotal: `${(stats.value.storage.total / 1024 / 1024).toFixed(2)} MB`,
      storagePercent: Math.round((stats.value.storage.used / stats.value.storage.total) * 100)
    }
  })

  // Actions
  async function initialize() {
    if (isInitialized.value) return
    
    loading.value = true
    error.value = null
    
    try {
      // 1. 加载用户登录状态
      const userStore = useUserStore()
      await userStore.loadUserFromStorage()
      
      // 2. 加载主题设置
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null
      if (savedTheme) {
        theme.value = savedTheme
      }
      
      // 3. 加载侧边栏状态
      const savedSidebar = localStorage.getItem('sidebarCollapsed')
      if (savedSidebar) {
        sidebarCollapsed.value = JSON.parse(savedSidebar)
      }
      
      // 4. 加载系统统计
      await loadStats()
      
      isInitialized.value = true
      console.log('✅ 应用初始化完成', {
        isLoggedIn: userStore.isLoggedIn,
        userId: userStore.currentUser?.id,
        userName: userStore.currentUser?.name
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : '应用初始化失败'
      console.error('❌ 应用初始化失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadStats() {
    try {
      const data = await systemApi.getStats()
      stats.value = data
    } catch (err) {
      console.error('加载统计信息失败:', err)
      // 不抛出错误，因为这不是关键功能
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed.value))
  }

  function setSidebarCollapsed(collapsed: boolean) {
    sidebarCollapsed.value = collapsed
    localStorage.setItem('sidebarCollapsed', JSON.stringify(collapsed))
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
    updateDocumentTheme()
  }

  function setTheme(newTheme: 'light' | 'dark' | 'auto') {
    theme.value = newTheme
    localStorage.setItem('theme', theme.value)
    updateDocumentTheme()
  }

  function updateDocumentTheme() {
    const effectiveTheme = theme.value === 'auto' 
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme.value
    
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function setCurrentView(view: string) {
    currentView.value = view
  }

  function clearError() {
    error.value = null
  }

  // 生成唯一ID
  async function generateId(): Promise<string> {
    try {
      return await systemApi.generateId()
    } catch (err) {
      // 如果无法从主进程获取，生成一个简单的ID
      return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  return {
    // State
    isInitialized,
    loading,
    error,
    stats,
    sidebarCollapsed,
    theme,
    currentView,
    
    // Getters
    isDarkTheme,
    statsDisplay,
    
    // Actions
    initialize,
    loadStats,
    toggleSidebar,
    setSidebarCollapsed,
    toggleTheme,
    setTheme,
    updateDocumentTheme,
    setCurrentView,
    clearError,
    generateId
  }
})