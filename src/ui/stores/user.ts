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
  async function createUser(userData: { name: string; email: string }) {
    loading.value = true
    error.value = null
    
    try {
      const user = await userApi.create(userData)
      currentUser.value = user
      isLoggedIn.value = true
      return user
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建用户失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loginUser(email: string) {
    loading.value = true
    error.value = null
    
    try {
      const user = await userApi.findByEmail(email)
      if (user) {
        currentUser.value = user
        isLoggedIn.value = true
        // 保存到本地存储
        localStorage.setItem('currentUserId', user.id)
        return user
      } else {
        error.value = '用户不存在'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败'
      throw err
    } finally {
      loading.value = false
    }
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
    createUser,
    loginUser,
    loadUserFromStorage,
    logoutUser,
    clearError
  }
})