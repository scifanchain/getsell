/**
 * 作者状态管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Author } from '../types/models'
import { userApi } from '../services/api'
import { userActivityWatcher } from '../utils/UserActivityWatcher'

export const useAuthorStore = defineStore('author', () => {
  // State
  const currentAuthor = ref<Author | null>(null)
  const isLoggedIn = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const authorDisplayName = computed(() => {
    return currentAuthor.value?.displayName || currentAuthor.value?.username || '未登录作者'
  })

  const authorEmail = computed(() => {
    return currentAuthor.value?.email || ''
  })

  // Actions
  async function registerAuthor(authorData: { 
    username: string
    password?: string
    displayName?: string
    email: string
    bio?: string
  }) {
    loading.value = true
    error.value = null
    
    try {
      const author = await userApi.register(authorData)
      currentAuthor.value = author
      isLoggedIn.value = true
      // 使用 IPC 保存到主进程的配置存储
      await userApi.saveAuthorConfig({ currentAuthorId: author.id })
      
      // 启动作者活动监听（自动续期）
      console.log('🎯 启动作者活动监听')
      
      return author
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loginAuthor(username: string, password?: string, rememberMe: boolean = true) {
    loading.value = true
    error.value = null
    
    try {
      const result = await userApi.login({ username, password, rememberMe })
      
      if (result.success && result.user) {
        currentAuthor.value = result.user
        isLoggedIn.value = true
        
        // 使用 IPC 保存到主进程的配置存储
        if (rememberMe) {
          await userApi.saveAuthorConfig({ currentAuthorId: result.user.id })
        }
        
        // 启动作者活动监听（自动续期）
        console.log('🎯 启动作者活动监听')
        
        return result.user
      } else {
        error.value = result.message || '登录失败'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 兼容旧的方法
  async function createAuthor(authorData: { name: string; email: string }) {
    return await registerAuthor({
      username: authorData.name,
      email: authorData.email,
      displayName: authorData.name
    })
  }

  async function loadAuthorFromStorage() {
    try {
      const configResult = await userApi.loadAuthorConfig()
      if (configResult.success && configResult.data.currentAuthorId && !configResult.data.isExpired) {
        loading.value = true
        const author = await userApi.find(configResult.data.currentAuthorId)
        if (author) {
          currentAuthor.value = author
          isLoggedIn.value = true
          
          // 启动作者活动监听（自动续期）
          console.log('🎯 从存储恢复登录状态，启动作者活动监听')
        } else {
          // 作者不存在，清除配置
          await userApi.clearAuthorConfig()
        }
      }
    } catch (err) {
      console.error('加载作者信息失败:', err)
      await userApi.clearAuthorConfig()
    } finally {
      loading.value = false
    }
  }

  function logoutAuthor() {
    currentAuthor.value = null
    isLoggedIn.value = false
    error.value = null
    // 使用 IPC 清除配置
    userApi.clearAuthorConfig().catch(err => {
      console.error('清除作者配置失败:', err)
    })
  }

  function clearError() {
    error.value = null
  }

  async function updateProfile(profileData: {
    displayName?: string
    bio?: string
    email?: string
    avatarUrl?: string
  }) {
    if (!currentAuthor.value) {
      throw new Error('未登录')
    }

    loading.value = true
    error.value = null

    try {
      const updatedAuthor = await userApi.updateProfile(currentAuthor.value.id, profileData)
      currentAuthor.value = updatedAuthor
      return updatedAuthor
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新个人资料失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!currentAuthor.value) {
      throw new Error('未登录')
    }

    loading.value = true
    error.value = null

    try {
      await userApi.changePassword(currentAuthor.value.id, currentPassword, newPassword)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更改密码失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    currentAuthor,
    isLoggedIn,
    loading,
    error,
    
    // Getters
    authorDisplayName,
    authorEmail,
    
    // Actions
    registerAuthor,
    loginAuthor,
    createAuthor,
    loadAuthorFromStorage,
    logoutAuthor,
    clearError,
    updateProfile,
    changePassword
  }
})