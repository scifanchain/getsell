import { ref, onUnmounted, Ref, isRef, watch } from 'vue'
import { contentApi } from '../services/api'

/**
 * 自动保存 Hook
 * 用于编辑器内容的自动保存功能
 */
export function useAutoSave(
  contentId: string | Ref<string>, 
  userId: string | Ref<string>, 
  options: {
    interval?: number // 保存间隔，默认5秒
    onSaved?: (result: any) => void // 保存成功回调
    onError?: (error: Error) => void // 保存失败回调
  } = {}
) {
  const { interval = 5000, onSaved, onError } = options
  
  // 将 contentId 和 userId 转换为 ref（如果不是的话）
  const contentIdRef = isRef(contentId) ? contentId : ref(contentId)
  const userIdRef = isRef(userId) ? userId : ref(userId)
  
  const isSaving = ref(false)
  const lastSavedAt = ref<Date | null>(null)
  const hasUnsavedChanges = ref(false)
  
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let pendingContent: string | null = null

  // 🎯 监听 contentId 变化，重置保存状态
  watch(contentIdRef, (newId, oldId) => {
    if (newId !== oldId) {
      console.log('🔄 useAutoSave: contentId 变化', { old: oldId, new: newId })
      // 清除待保存的内容和定时器
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
      pendingContent = null
      hasUnsavedChanges.value = false
      // 不重置 isSaving，避免打断正在进行的保存
    }
  })

  /**
   * 触发自动保存
   */
  const triggerAutoSave = (content: string) => {
    const currentContentId = contentIdRef.value
    if (!currentContentId) {
      console.warn('⚠️ useAutoSave: contentId 为空，跳过自动保存')
      return
    }

    pendingContent = content
    hasUnsavedChanges.value = true
    
    // 清除之前的定时器
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    
    // 设置新的定时器
    saveTimer = setTimeout(async () => {
      if (pendingContent && !isSaving.value) {
        await performSave(pendingContent, currentContentId)
      }
    }, interval)
  }

  /**
   * 立即保存
   */
  const saveNow = async (content: string) => {
    const currentContentId = contentIdRef.value
    if (!currentContentId) {
      console.warn('⚠️ useAutoSave: contentId 为空，无法保存')
      return
    }

    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    
    await performSave(content, currentContentId)
  }

  /**
   * 执行保存操作
   */
  const performSave = async (content: string, targetContentId: string) => {
    if (isSaving.value) return

    try {
      isSaving.value = true
      
      console.log('💾 useAutoSave: 保存到', targetContentId)
      
      const result = await contentApi.autoSave(targetContentId, userIdRef.value, content)
      
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