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
        
        <!-- 手动保存按钮 -->
        <button class="save-btn-header" @click="saveNow" :disabled="isSaving">
          <span class="save-icon">💾</span>
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
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
import { useEditorStore } from '../stores/editor'
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

// 使用编辑器状态管理
const editorStore = useEditorStore()

// 本地状态
const localTitle = ref(props.initialTitle || '')
const editorContent = ref(props.initialContent || '')
const stats = ref({ wordCount: 0, characterCount: 0 })

// 🎯 监听 props 变化，更新本地状态（修复内容切换问题）
watch(() => props.contentId, (newContentId, oldContentId) => {
  if (newContentId && newContentId !== oldContentId) {
    console.log('EnhancedEditor: contentId 变化', { 
      old: oldContentId, 
      new: newContentId 
    })
    // 更新本地状态
    localTitle.value = props.initialTitle || ''
    editorContent.value = props.initialContent || ''
    updateStats(editorContent.value)
    
    // 更新全局状态
    editorStore.updateEditorStatus({ currentContentId: newContentId })
  }
})

// 监听 initialContent 变化（当同一个 contentId 但内容变化时）
watch(() => props.initialContent, (newContent) => {
  if (newContent !== undefined && newContent !== editorContent.value) {
    console.log('EnhancedEditor: initialContent 变化')
    editorContent.value = newContent
    updateStats(newContent)
  }
})

// 监听 initialTitle 变化
watch(() => props.initialTitle, (newTitle) => {
  if (newTitle !== undefined && newTitle !== localTitle.value) {
    console.log('EnhancedEditor: initialTitle 变化')
    localTitle.value = newTitle
  }
})

// 设置当前内容ID到全局状态
if (props.contentId) {
  editorStore.updateEditorStatus({ currentContentId: props.contentId })
}

// 🎯 使用 computed 创建非空的响应式引用
const contentIdRef = computed(() => props.contentId || '')
const userIdRef = computed(() => props.userId)

// 使用自动保存 Hook（传入 Ref，自动追踪变化）
const { isSaving, lastSavedAt, hasUnsavedChanges, triggerAutoSave, saveNow: saveContentNow } = useAutoSave(
  contentIdRef,  // ← 传入响应式 computed
  userIdRef,     // ← 传入响应式 computed
  {
    interval: 5000, // 5秒自动保存
    onSaved: (result) => {
      emit('content-saved', result)
      updateStats(editorContent.value)
      editorStore.markSaved() // 更新全局状态
    },
    onError: (error) => {
      emit('content-error', error)
      editorStore.setSaving(false) // 保存失败，停止保存状态
    }
  }
)

// 移除原来的 saveStatusText 计算属性，因为现在在 store 中处理

// 监听自动保存状态变化，同步到全局 store
watch(isSaving, (newValue) => {
  editorStore.setSaving(newValue)
})

watch(hasUnsavedChanges, (newValue) => {
  editorStore.setUnsaved(newValue)
})

// 监听内容变化，触发自动保存
watch(editorContent, (newContent) => {
  if (props.contentId && newContent !== props.initialContent) {
    console.log('🔄 EnhancedEditor: 内容变化，触发自动保存', {
      contentId: props.contentId,
      contentIdRef: contentIdRef.value,
      contentLength: newContent.length
    })
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

.save-btn-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.save-btn-header:hover:not(:disabled) {
  background: #0056b3;
  transform: translateY(-1px);
}

.save-btn-header:disabled {
  background: #6c757d;
  cursor: not-allowed;
  transform: none;
}

.save-icon {
  font-size: 14px;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  padding: 0; /* 🎯 移除 padding，让编辑器占满 */
  display: flex;
  flex-direction: column;
}

.main-editor {
  height: 100%;
  width: 100%;
  flex: 1; /* 🎯 占满父容器 */
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