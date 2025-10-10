import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface EditorStatus {
  isSaving: boolean
  hasUnsavedChanges: boolean
  lastSavedAt: Date | null
  currentContentId?: string
}

export const useEditorStore = defineStore('editor', () => {
  // 编辑器状态
  const editorStatus = ref<EditorStatus>({
    isSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    currentContentId: undefined
  })

  // 保存状态文本
  const saveStatusText = computed(() => {
    if (editorStatus.value.isSaving) {
      return '保存中...'
    }
    
    if (editorStatus.value.hasUnsavedChanges) {
      return '未保存'
    }
    
    if (!editorStatus.value.lastSavedAt) {
      return '就绪'
    }
    
    const now = new Date()
    const saved = editorStatus.value.lastSavedAt
    const diffMs = now.getTime() - saved.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    if (diffMinutes < 1) {
      return '刚刚保存'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前保存`
    } else {
      return saved.toLocaleTimeString()
    }
  })

  // 状态样式类
  const saveStatusClass = computed(() => {
    if (editorStatus.value.isSaving) {
      return 'status-saving'
    }
    if (editorStatus.value.hasUnsavedChanges) {
      return 'status-unsaved'
    }
    return 'status-saved'
  })

  // 更新编辑器状态
  const updateEditorStatus = (status: Partial<EditorStatus>) => {
    editorStatus.value = { ...editorStatus.value, ...status }
  }

  // 设置保存中状态
  const setSaving = (saving: boolean) => {
    editorStatus.value.isSaving = saving
  }

  // 设置未保存状态
  const setUnsaved = (unsaved: boolean) => {
    editorStatus.value.hasUnsavedChanges = unsaved
  }

  // 标记已保存
  const markSaved = () => {
    editorStatus.value.isSaving = false
    editorStatus.value.hasUnsavedChanges = false
    editorStatus.value.lastSavedAt = new Date()
  }

  // 重置状态
  const resetStatus = () => {
    editorStatus.value = {
      isSaving: false,
      hasUnsavedChanges: false,
      lastSavedAt: null,
      currentContentId: undefined
    }
  }

  return {
    editorStatus: computed(() => editorStatus.value),
    saveStatusText,
    saveStatusClass,
    updateEditorStatus,
    setSaving,
    setUnsaved,
    markSaved,
    resetStatus
  }
})