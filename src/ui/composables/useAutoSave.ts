import { ref, onUnmounted } from 'vue'
import { contentApi } from '../services/api'

/**
 * 自动保存 Hook
 * 用于编辑器内容的自动保存功能
 */
export function useAutoSave(contentId: string, userId: string, options: {
  interval?: number // 保存间隔，默认5秒
  onSaved?: (result: any) => void // 保存成功回调
  onError?: (error: Error) => void // 保存失败回调
} = {}) {
  const { interval = 5000, onSaved, onError } = options
  
  const isSaving = ref(false)
  const lastSavedAt = ref<Date | null>(null)
  const hasUnsavedChanges = ref(false)
  
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let pendingContent: string | null = null

  /**
   * 触发自动保存
   */
  const triggerAutoSave = (content: string) => {
    pendingContent = content
    hasUnsavedChanges.value = true
    
    // 清除之前的定时器
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    
    // 设置新的定时器
    saveTimer = setTimeout(async () => {
      if (pendingContent && !isSaving.value) {
        await performSave(pendingContent)
      }
    }, interval)
  }

  /**
   * 立即保存
   */
  const saveNow = async (content: string) => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    
    await performSave(content)
  }

  /**
   * 执行保存操作
   */
  const performSave = async (content: string) => {
    if (isSaving.value) return

    try {
      isSaving.value = true
      
      const result = await contentApi.autoSave(contentId, userId, content)
      
      if (result.success) {
        lastSavedAt.value = new Date()
        hasUnsavedChanges.value = false
        pendingContent = null
        
        if (onSaved) {
          onSaved(result)
        }
      } else {
        throw new Error('自动保存失败')
      }
    } catch (error) {
      console.error('Auto save error:', error)
      
      if (onError) {
        onError(error as Error)
      }
    } finally {
      isSaving.value = false
    }
  }

  /**
   * 清理定时器
   */
  const cleanup = () => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    isSaving,
    lastSavedAt,
    hasUnsavedChanges,
    triggerAutoSave,
    saveNow,
    cleanup
  }
}