/**
 * 作品状态管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Work, WorkData } from '../../shared/types'
import { useUserStore } from './user'

// 模拟 API 调用
const workApi = {
  async createWork(workData: WorkData): Promise<{ workId: string; work: Work }> {
    // 调用主进程的 IPC
    return await (window as any).gestell.work.create(workData)
  },

  async getWorks(authorId?: string): Promise<{ works: Work[] }> {
    return await (window as any).gestell.work.list(authorId)
  },

  async getWork(workId: string, userId: string): Promise<Work> {
    return await (window as any).gestell.work.get(workId, userId)
  },

  async updateWork(workId: string, updateData: Partial<WorkData>): Promise<Work> {
    // TODO: 实现更新作品的 API
    throw new Error('Not implemented')
  },

  async deleteWork(workId: string): Promise<void> {
    // TODO: 实现删除作品的 API
    throw new Error('Not implemented')
  }
}

export const useWorkStore = defineStore('work', () => {
  // State
  const works = ref<Work[]>([])
  const currentWork = ref<Work | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const workCount = computed(() => works.value.length)
  
  const sortedWorks = computed(() => {
    return [...works.value].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  })

  const recentWorks = computed(() => {
    return sortedWorks.value.slice(0, 5)
  })

  const getWorkById = computed(() => {
    return (workId: string) => works.value.find(w => w.id === workId)
  })

  // Actions
  const fetchWorks = async (authorId?: string) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await workApi.getWorks(authorId)
      works.value = response.works
    } catch (err: any) {
      error.value = err.message || '获取作品列表失败'
      console.error('获取作品列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  const createWork = async (workData: WorkData) => {
    loading.value = true
    error.value = null
    
    try {
      const response = await workApi.createWork(workData)
      const newWork = response.work
      works.value.push(newWork)
      currentWork.value = newWork
      return newWork
    } catch (err: any) {
      error.value = err.message || '创建作品失败'
      console.error('创建作品失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const selectWork = async (workId: string) => {
    const work = works.value.find(w => w.id === workId)
    if (work) {
      currentWork.value = work
    } else {
      try {
        // 获取当前用户 ID
        const userStore = useUserStore()
        const userId = userStore.currentUser?.id
        if (!userId) {
          throw new Error('用户未登录')
        }
        
        const fetchedWork = await workApi.getWork(workId, userId)
        currentWork.value = fetchedWork
        // 如果不在列表中，添加到列表
        if (!works.value.find(w => w.id === workId)) {
          works.value.push(fetchedWork)
        }
      } catch (err: any) {
        error.value = err.message || '获取作品详情失败'
        console.error('获取作品详情失败:', err)
        throw err
      }
    }
  }

  const updateWork = async (workId: string, updateData: Partial<WorkData>) => {
    loading.value = true
    error.value = null
    
    try {
      const updatedWork = await workApi.updateWork(workId, updateData)
      
      // 更新列表中的作品
      const index = works.value.findIndex(w => w.id === workId)
      if (index !== -1) {
        works.value[index] = updatedWork
      }
      
      // 更新当前作品
      if (currentWork.value?.id === workId) {
        currentWork.value = updatedWork
      }
      
      return updatedWork
    } catch (err: any) {
      error.value = err.message || '更新作品失败'
      console.error('更新作品失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteWork = async (workId: string) => {
    loading.value = true
    error.value = null
    
    try {
      await workApi.deleteWork(workId)
      
      // 从列表中移除
      works.value = works.value.filter(w => w.id !== workId)
      
      // 如果删除的是当前作品，清空当前作品
      if (currentWork.value?.id === workId) {
        currentWork.value = null
      }
    } catch (err: any) {
      error.value = err.message || '删除作品失败'
      console.error('删除作品失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    works.value = []
    currentWork.value = null
    loading.value = false
    error.value = null
  }

  return {
    // State
    works,
    currentWork,
    loading,
    error,
    
    // Getters
    workCount,
    sortedWorks,
    recentWorks,
    getWorkById,
    
    // Actions
    fetchWorks,
    createWork,
    selectWork,
    updateWork,
    deleteWork,
    clearError,
    reset
  }
})