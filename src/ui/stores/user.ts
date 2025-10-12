/**
 * 用户状态管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '../types/models'
import { userApi } from '../services/api'

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<User | null>(null)
  const isLoggedIn = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const userDisplayName = computed(() => {
    return currentUser.value?.name || '未登录用户'
  })

  const userEmail = computed(() => {
    return currentUser.value?.email || ''
  })

  // Actions
  async function registerUser(userData: { 
    username: string
    password?: string
    displayName?: string
    email: string
    bio?: string
  }) {
    loading.value = true
    error.value = null
    
    try {
      const user = await userApi.register(userData)
      currentUser.value = user
      isLoggedIn.value = true
      // 保存到本地存储
      localStorage.setItem('currentUserId', user.id)
      return user
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loginUser(username: string, password?: string, rememberMe: boolean = true) {
    loading.value = true
    error.value = null
    
    try {
      const result = await userApi.login({ username, password, rememberMe })
      
      if (result.success && result.user) {
        currentUser.value = result.user
        isLoggedIn.value = true
        
        // 根据 rememberMe 决定是否保存到本地存储
        if (rememberMe) {
          localStorage.setItem('currentUserId', result.user.id)
        }
        
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
  async function createUser(userData: { name: string; email: string }) {
    return await registerUser({
      username: userData.name,
      email: userData.email,
      displayName: userData.name
    })
  }

  async function loadUserFromStorage() {
    const userId = localStorage.getItem('currentUserId')
    if (userId) {
      loading.value = true
      try {
        const user = await userApi.find(userId)
        if (user) {
          currentUser.value = user
          isLoggedIn.value = true
        } else {
          // 用户不存在，清除本地存储
          localStorage.removeItem('currentUserId')
        }
      } catch (err) {
        console.error('加载用户信息失败:', err)
        localStorage.removeItem('currentUserId')
      } finally {
        loading.value = false
      }
    }
  }

  function logoutUser() {
    currentUser.value = null
    isLoggedIn.value = false
    error.value = null
    localStorage.removeItem('currentUserId')
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
    if (!currentUser.value) {
      throw new Error('未登录')
    }

    loading.value = true
    error.value = null

    try {
      const updatedUser = await userApi.updateProfile(currentUser.value.id, profileData)
      currentUser.value = updatedUser
      return updatedUser
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新个人资料失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    if (!currentUser.value) {
      throw new Error('未登录')
    }

    loading.value = true
    error.value = null

    try {
      await userApi.changePassword(currentUser.value.id, currentPassword, newPassword)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更改密码失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    currentUser,
    isLoggedIn,
    loading,
    error,
    
    // Getters
    userDisplayName,
    userEmail,
    
    // Actions
    registerUser,
    loginUser,
    createUser,
    loadUserFromStorage,
    logoutUser,
    clearError,
    updateProfile,
    changePassword
  }
})