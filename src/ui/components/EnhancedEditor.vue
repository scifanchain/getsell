<template>
  <div class="enhanced-editor">
    <div class="editor-header">
      <div class="title-section">
        <input 
          v-model="localTitle"
          placeholder="章节标题"
          class="title-input"
          @blur="updateTitle"
        />
      </div>
      
      <div class="status-section">
        <div class="word-stats">
          <span class="word-count">{{ stats.wordCount }}字</span>
          <span class="char-count">{{ stats.characterCount }}字符</span>
        </div>
        
        <div class="save-status" :class="{ 'saving': isSaving, 'unsaved': hasUnsavedChanges }">
          <span v-if="isSaving">保存中...</span>
          <span v-else-if="hasUnsavedChanges">未保存</span>
          <span v-else-if="lastSavedAt">{{ saveStatusText }}</span>
          <span v-else>就绪</span>
        </div>
      </div>
    </div>
    
    <div class="editor-container">
      <ProseMirrorEditor
        v-model="editorContent"
        :key="contentId"
        @update="handleEditorUpdate"
        @focus="handleEditorFocus"
        @blur="handleEditorBlur"
        class="main-editor"
      />
    </div>
    
    <div class="editor-footer">
      <button class="save-btn" @click="saveNow" :disabled="isSaving">
        {{ isSaving ? '保存中...' : '立即保存' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import ProseMirrorEditor from './ProseMirrorEditor.vue'
import { useAutoSave } from '../composables/useAutoSave'
import { contentApi } from '../services/api'

interface Props {
  contentId?: string
  userId: string
  chapterId: string
  initialContent?: string
  initialTitle?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'content-saved': [result: any]
  'content-error': [error: Error]
  'title-updated': [title: string]
}>()

// 本地状态
const localTitle = ref(props.initialTitle || '')
const editorContent = ref(props.initialContent || '')
const stats = ref({ wordCount: 0, characterCount: 0 })

// 使用自动保存 Hook
const { isSaving, lastSavedAt, hasUnsavedChanges, triggerAutoSave, saveNow: saveContentNow } = useAutoSave(
  props.contentId || '',
  props.userId,
  {
    interval: 5000, // 5秒自动保存
    onSaved: (result) => {
      emit('content-saved', result)
      updateStats(editorContent.value)
    },
    onError: (error) => {
      emit('content-error', error)
    }
  }
)

// 保存状态文本
const saveStatusText = computed(() => {
  if (!lastSavedAt.value) return ''
  
  const now = new Date()
  const saved = lastSavedAt.value
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

// 监听内容变化，触发自动保存
watch(editorContent, (newContent) => {
  if (props.contentId && newContent !== props.initialContent) {
    triggerAutoSave(newContent)
  }
  updateStats(newContent)
})

// 处理编辑器更新
const handleEditorUpdate = (content: string) => {
  editorContent.value = content
}

// 处理标题更新
const updateTitle = async () => {
  if (!props.contentId || localTitle.value === props.initialTitle) return
  
  try {
    await contentApi.update(props.contentId, props.userId, {
      title: localTitle.value
    })
    emit('title-updated', localTitle.value)
  } catch (error) {
    console.error('Update title failed:', error)
  }
}

// 立即保存
const saveNow = async () => {
  if (!props.contentId) {
    // 如果没有 contentId，说明是新内容，需要先创建
    await createNewContent()
  } else {
    await saveContentNow(editorContent.value)
  }
}

// 创建新内容
const createNewContent = async () => {
  try {
    const result = await contentApi.create(props.userId, {
      chapterId: props.chapterId,
      content: editorContent.value,
      format: 'prosemirror',
      title: localTitle.value
    })
    
    // 更新 contentId 以便后续自动保存
    // 这里需要通知父组件更新 contentId
    emit('content-saved', result)
  } catch (error) {
    emit('content-error', error as Error)
  }
}

// 更新统计信息
const updateStats = (content: string) => {
  if (!content) {
    stats.value = { wordCount: 0, characterCount: 0 }
    return
  }

  // 移除HTML标签
  const plainText = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  
  // 字符数
  const characterCount = plainText.length
  
  // 字数计算（中英文混合）
  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length
  const wordCount = chineseChars + englishWords

  stats.value = { wordCount, characterCount }
}

// 处理编辑器聚焦
const handleEditorFocus = () => {
  // 可以在这里处理聚焦逻辑
}

// 处理编辑器失焦
const handleEditorBlur = () => {
  // 失焦时触发保存
  if (hasUnsavedChanges.value) {
    saveNow()
  }
}

// 组件挂载时初始化统计
onMounted(() => {
  updateStats(editorContent.value)
})

// 页面卸载前保存
onUnmounted(() => {
  if (hasUnsavedChanges.value) {
    // 使用同步方式保存
    navigator.sendBeacon(
      '/api/auto-save',
      JSON.stringify({
        contentId: props.contentId,
        userId: props.userId,
        content: editorContent.value
      })
    )
  }
})
</script>

<style scoped>
.enhanced-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #fafafa;
  border-radius: 8px 8px 0 0;
}

.title-section {
  flex: 1;
  max-width: 400px;
}

.title-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  background: white;
  transition: border-color 0.2s;
}

.title-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.status-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.word-stats {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.save-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.save-status.saving {
  background: #fff3cd;
  color: #856404;
}

.save-status.unsaved {
  background: #f8d7da;
  color: #721c24;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  padding: 20px;
}

.main-editor {
  height: 100%;
  width: 100%;
}

.editor-footer {
  padding: 12px 20px;
  border-top: 1px solid #e1e5e9;
  background: #fafafa;
  display: flex;
  justify-content: flex-end;
}

.save-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.save-btn:hover:not(:disabled) {
  background: #0056b3;
}

.save-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.word-count,
.char-count {
  padding: 2px 6px;
  background: #e9ecef;
  border-radius: 3px;
}
</style>