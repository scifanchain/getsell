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
    interval?: number // 保存间隔，默认30秒
    onSaved?: (result: any) => void // 保存成功回调
    onError?: (error: Error) => void // 保存失败回调
  } = {}
) {
  const { interval = 30000, onSaved, onError } = options // 改为30秒
  
  // 将 contentId 和 userId 转换为 ref（如果不是的话）
  const contentIdRef = isRef(contentId) ? contentId : ref(contentId)
  const userIdRef = isRef(userId) ? userId : ref(userId)
  
  const isSaving = ref(false)
  const lastSavedAt = ref<Date | null>(null)
  const hasUnsavedChanges = ref(false)
  
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let pendingContent: string | null = null
  let lastTriggerTime = 0
  let lastSaveTime = 0
  const DEBOUNCE_DELAY = 8000 // 防抖延迟：8秒内无变化才保存
  const MIN_SAVE_INTERVAL = 10000 // 最小保存间隔：10秒
  const MAX_WAIT_TIME = 60000 // 最大等待时间：60秒强制保存

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
   * 智能触发自动保存 - 防抖动模式
   */
  const triggerAutoSave = (content: string) => {
    const currentContentId = contentIdRef.value
    if (!currentContentId) {
      console.warn('⚠️ useAutoSave: contentId 为空，跳过自动保存')
      return
    }

    const now = Date.now()
    pendingContent = content
    hasUnsavedChanges.value = true
    
    // 清除之前的定时器
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    
    // 计算实际保存延迟
    const timeSinceLastSave = now - lastSaveTime
    const timeSinceLastTrigger = now - lastTriggerTime
    lastTriggerTime = now
    
    let saveDelay = DEBOUNCE_DELAY
    
    // 如果距离上次保存太久，缩短延迟
    if (timeSinceLastSave > MAX_WAIT_TIME) {
      saveDelay = 100 // 立即保存
      console.log('⚡ useAutoSave: 超过最大等待时间，立即保存')
    } else if (timeSinceLastSave < MIN_SAVE_INTERVAL) {
      // 如果保存太频繁，延长延迟
      saveDelay = Math.max(DEBOUNCE_DELAY, MIN_SAVE_INTERVAL - timeSinceLastSave)
      console.log('🕐 useAutoSave: 保存间隔不足，延长延迟至', saveDelay, 'ms')
    }
    
    // 防止卡死：增加保存状态检查
    if (isSaving.value) {
      console.log('⚠️ useAutoSave: 正在保存中，延长等待时间')
      saveDelay = DEBOUNCE_DELAY * 2
    }
    
    // 设置新的定时器
    saveTimer = setTimeout(async () => {
      if (pendingContent && !isSaving.value && currentContentId === contentIdRef.value) {
        console.log('💾 useAutoSave: 执行防抖保存')
        await performSave(pendingContent, currentContentId)
      } else {
        console.log('⏭️ useAutoSave: 跳过保存（内容或状态已变化）')
      }
    }, saveDelay)
    
    console.log(`⏰ useAutoSave: 已设置${saveDelay/1000}秒后自动保存`)
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
    if (isSaving.value) {
      console.warn('⚠️ useAutoSave: 已有保存操作在进行，跳过')
      return
    }

    try {
      isSaving.value = true
      
      console.log('💾 useAutoSave: 开始保存到', targetContentId, '内容长度:', content.length)
      
      // 🔧 增加超时保护，防止卡死
      const savePromise = contentApi.autoSave(targetContentId, userIdRef.value, content)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('保存超时')), 10000) // 10秒超时
      })
      
      const result = await Promise.race([savePromise, timeoutPromise])
      
      if (result.success) {
        lastSavedAt.value = new Date()
        lastSaveTime = Date.now() // 记录保存时间
        hasUnsavedChanges.value = false
        pendingContent = null
        
        console.log('✅ useAutoSave: 保存成功')
        if (onSaved) {
          onSaved(result)
        }
      } else {
        throw new Error(result.error || '自动保存失败')
      }
    } catch (error) {
      console.error('❌ useAutoSave: 保存失败:', error)
      
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