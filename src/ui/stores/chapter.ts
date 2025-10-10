/**
 * 章节状态管理 Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Chapter, CreateChapterData, UpdateChapterData } from '../types/models'
import { chapterApi } from '../services/api'
import { useUserStore } from './user'

export const useChapterStore = defineStore('chapter', () => {
  // State
  const chapters = ref<Chapter[]>([])
  const currentChapter = ref<Chapter | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const chapterCount = computed(() => chapters.value.length)
  
  const sortedChapters = computed(() => {
    return [...chapters.value].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  })

  const currentChapterIndex = computed(() => {
    if (!currentChapter.value) return -1
    return sortedChapters.value.findIndex(c => c.id === currentChapter.value!.id)
  })

  const hasNextChapter = computed(() => {
    const index = currentChapterIndex.value
    return index !== -1 && index < sortedChapters.value.length - 1
  })

  const hasPrevChapter = computed(() => {
    const index = currentChapterIndex.value
    return index > 0
  })

  const nextChapter = computed(() => {
    const index = currentChapterIndex.value
    if (hasNextChapter.value) {
      return sortedChapters.value[index + 1]
    }
    return null
  })

  const prevChapter = computed(() => {
    const index = currentChapterIndex.value
    if (hasPrevChapter.value) {
      return sortedChapters.value[index - 1]
    }
    return null
  })

  // Actions
  async function loadChapters(workId: string) {
    loading.value = true
    error.value = null
    
    try {
      const data = await chapterApi.list(workId)
      chapters.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载章节失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createChapter(chapterData: CreateChapterData) {
    loading.value = true
    error.value = null
    
    try {
      // 如果没有指定orderIndex，设置为最后一个
      if (chapterData.orderIndex === undefined) {
        chapterData.orderIndex = chapters.value.length + 1
      }
      
      const chapter = await chapterApi.create(chapterData)
      chapters.value.push(chapter)
      return chapter
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建章节失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateChapter(id: string, chapterData: UpdateChapterData) {
    loading.value = true
    error.value = null
    
    try {
      const userStore = useUserStore()
      if (!userStore.currentUser?.id) {
        throw new Error('用户未登录')
      }
      
      const updatedChapter = await chapterApi.update(userStore.currentUser.id, id, chapterData)
      const index = chapters.value.findIndex(c => c.id === id)
      if (index !== -1) {
        chapters.value[index] = updatedChapter
      }
      if (currentChapter.value?.id === id) {
        currentChapter.value = updatedChapter
      }
      return updatedChapter
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新章节失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteChapter(id: string) {
    loading.value = true
    error.value = null
    
    try {
      const userStore = useUserStore()
      if (!userStore.currentUser?.id) {
        throw new Error('用户未登录')
      }
      
      await chapterApi.delete(userStore.currentUser.id, id)
      chapters.value = chapters.value.filter(c => c.id !== id)
      if (currentChapter.value?.id === id) {
        currentChapter.value = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除章节失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function setCurrentChapter(id: string) {
    const chapter = chapters.value.find(c => c.id === id)
    if (chapter) {
      currentChapter.value = chapter
    } else {
      // 如果本地没有，从服务器获取
      try {
        const chapter = await chapterApi.find(id)
        if (chapter) {
          currentChapter.value = chapter
        }
      } catch (err) {
        error.value = '章节不存在或无法访问'
        throw err
      }
    }
  }

  function navigateToNext() {
    if (hasNextChapter.value && nextChapter.value) {
      currentChapter.value = nextChapter.value
    }
  }

  function navigateToPrev() {
    if (hasPrevChapter.value && prevChapter.value) {
      currentChapter.value = prevChapter.value
    }
  }

  async function reorderChapters(newOrder: Chapter[]) {
    try {
      loading.value = true
      const userStore = useUserStore()
      if (!userStore.currentUser?.id) {
        throw new Error('用户未登录')
      }
      
      // 批量更新章节顺序
      const updatePromises = newOrder.map((chapter, index) => 
        chapterApi.update(userStore.currentUser!.id, chapter.id, { orderIndex: index + 1 })
      )
      
      await Promise.all(updatePromises)
      chapters.value = newOrder.map((chapter, index) => ({
        ...chapter,
        orderIndex: index + 1
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重新排序失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearCurrentChapter() {
    currentChapter.value = null
  }

  function clearError() {
    error.value = null
  }

  function findChapterById(id: string) {
    return chapters.value.find(c => c.id === id)
  }

  return {
    // State
    chapters,
    currentChapter,
    loading,
    error,
    
    // Getters
    chapterCount,
    sortedChapters,
    currentChapterIndex,
    hasNextChapter,
    hasPrevChapter,
    nextChapter,
    prevChapter,
    
    // Actions
    loadChapters,
    createChapter,
    updateChapter,
    deleteChapter,
    setCurrentChapter,
    navigateToNext,
    navigateToPrev,
    reorderChapters,
    clearCurrentChapter,
    clearError,
    findChapterById
  }
})