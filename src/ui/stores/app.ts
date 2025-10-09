/**
 * 应用全局状态管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SystemStats } from '../types/models'
import { systemApi } from '../services/api'

export const useAppStore = defineStore('app', () => {
  // State
  const isInitialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const stats = ref<SystemStats | null>(null)
  
  // UI 状态
  const sidebarCollapsed = ref(false)
  const theme = ref<'light' | 'dark'>('light')
  const currentView = ref('home')
  
  // Getters
  const isDarkTheme = computed(() => theme.value === 'dark')
  
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
      // 加载主题设置
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (savedTheme) {
        theme.value = savedTheme
      }
      
      // 加载侧边栏状态
      const savedSidebar = localStorage.getItem('sidebarCollapsed')
      if (savedSidebar) {
        sidebarCollapsed.value = JSON.parse(savedSidebar)
      }
      
      // 加载系统统计
      await loadStats()
      
      isInitialized.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '应用初始化失败'
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

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme
    localStorage.setItem('theme', theme.value)
    updateDocumentTheme()
  }

  function updateDocumentTheme() {
    if (theme.value === 'dark') {
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