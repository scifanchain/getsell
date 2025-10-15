<template>
  <div class="enhanced-editor">
    <div class="editor-header">
      <div class="title-section">
        <input 
          v-model="localTitle"
          placeholder="章节标题"
          class="title-input"
          @blur="updateTitle"
          @keydown.enter="updateTitle"
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
// 始终以字符串存储内容，避免类型混乱
const editorContent = ref(typeof props.initialContent === 'string' ? props.initialContent : JSON.stringify(props.initialContent || ''))
const stats = ref({ wordCount: 0, characterCount: 0 })
const isInternalUpdate = ref(false) // 🔧 添加内部更新标记防止循环

// 🎯 监听 props 变化，更新本地状态（修复内容切换问题）
watch(() => props.contentId, (newContentId, oldContentId) => {
  if (newContentId && newContentId !== oldContentId) {
    console.log('EnhancedEditor: contentId 变化', { 
      old: oldContentId, 
      new: newContentId 
    })
    // 🔧 标记为内部更新，防止触发自动保存
    isInternalUpdate.value = true
    // 更新本地状态
    localTitle.value = props.initialTitle || ''
  editorContent.value = typeof props.initialContent === 'string' ? props.initialContent : JSON.stringify(props.initialContent || '')
  updateStats(editorContent.value)
    
    // 更新全局状态
    editorStore.updateEditorStatus({ currentContentId: newContentId })
  }
})

// 监听 initialContent 变化（当同一个 contentId 但内容变化时）
watch(() => props.initialContent, (newContent) => {
  if (newContent !== undefined && newContent !== editorContent.value) {
    console.log('EnhancedEditor: initialContent 变化')
    isInternalUpdate.value = true // 🔧 防止触发自动保存
  editorContent.value = typeof newContent === 'string' ? newContent : JSON.stringify(newContent || '')
  updateStats(editorContent.value)
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
    interval: 30000, // 🔧 修复：30秒自动保存（而不是5秒）
    onSaved: (result) => {
      emit('content-saved', result)
      updateStats(editorContent.value)
      editorStore.markSaved() // 更新全局状态
    },
    onError: (error) => {
      console.error('EnhancedEditor自动保存失败:', error)
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

// 监听内容变化，智能触发自动保存
let lastContentLength = 0
let inputActivityTimer: ReturnType<typeof setTimeout> | null = null
let lastSaveContent = ''
let lastAutoSaveTime = 0
let significantChangeThreshold = 50 // 至少输入50个字符才触发立即保存
const MIN_AUTO_SAVE_INTERVAL = 15000 // 最小自动保存间隔：15秒

watch(editorContent, (newContent) => {
  // 🔧 防止内部更新触发自动保存循环
  if (isInternalUpdate.value) {
    isInternalUpdate.value = false
    updateStats(typeof newContent === 'string' ? newContent : JSON.stringify(newContent || ''))
    return
  }
  const contentStr = typeof newContent === 'string' ? newContent : JSON.stringify(newContent || '')
  if (props.contentId && contentStr !== (typeof props.initialContent === 'string' ? props.initialContent : JSON.stringify(props.initialContent || ''))) {
    const currentLength = contentStr.length
    const lengthDiffFromLast = Math.abs(currentLength - lastContentLength)
    const lengthDiffFromSaved = Math.abs(currentLength - lastSaveContent.length)
    const now = Date.now()
    const timeSinceLastSave = now - lastAutoSaveTime
    if (inputActivityTimer) {
      clearTimeout(inputActivityTimer)
    }
    if (lengthDiffFromSaved >= significantChangeThreshold && timeSinceLastSave >= MIN_AUTO_SAVE_INTERVAL) {
      console.log('🔄 EnhancedEditor: 内容显著变化，触发自动保存', {
        contentId: props.contentId,
        lengthDiff: lengthDiffFromSaved,
        contentLength: currentLength,
        timeSinceLastSave: Math.round(timeSinceLastSave / 1000) + 's'
      })
      triggerAutoSave(contentStr)
      lastSaveContent = contentStr
      lastContentLength = currentLength
      lastAutoSaveTime = now
    } else {
      inputActivityTimer = setTimeout(() => {
        if (contentStr !== lastSaveContent && lengthDiffFromLast > 0) {
          console.log('🔄 EnhancedEditor: 用户停止输入，触发自动保存', {
            contentId: props.contentId,
            lengthDiff: lengthDiffFromSaved,
            contentLength: currentLength
          })
          triggerAutoSave(contentStr)
          lastSaveContent = contentStr
          lastContentLength = currentLength
          lastAutoSaveTime = Date.now()
        }
      }, 8000)
    }
  } else if (!props.contentId) {
    console.warn('⚠️ EnhancedEditor: contentId 为空，跳过自动保存')
  }
  updateStats(contentStr)
})

// 处理编辑器更新
const handleEditorUpdate = (content: string | object) => {
  // 🔧 标记为内部更新，防止触发自动保存循环
  isInternalUpdate.value = true
  editorContent.value = typeof content === 'string' ? content : JSON.stringify(content || '')
}

// 处理标题更新
const updateTitle = async () => {
  if (!props.contentId) return
  if (localTitle.value === props.initialTitle) return
  
  try {
    await contentApi.update(props.contentId, props.userId, {
      title: localTitle.value
    })
    emit('title-updated', localTitle.value)
  } catch (error) {
    console.error('标题更新失败:', error)
  }
}

// 立即保存
const saveNow = async () => {
  const contentStr = typeof editorContent.value === 'string' ? editorContent.value : JSON.stringify(editorContent.value || '')
  if (!props.contentId) {
    await createNewContent()
  } else {
    await saveContentNow(contentStr)
  }
}

// 创建新内容
const createNewContent = async () => {
  try {
    const contentStr = typeof editorContent.value === 'string' ? editorContent.value : JSON.stringify(editorContent.value || '')
    const result = await contentApi.create(props.userId, {
      chapterId: props.chapterId,
      content: contentStr,
      format: 'prosemirror',
      title: localTitle.value
    })
    emit('content-saved', result)
  } catch (error) {
    emit('content-error', error as Error)
  }
}

// 更新统计信息
const updateStats = (content: string | object) => {
  let plainText = ''
  
  try {
    if (typeof content === 'string') {
      // 尝试解析为 JSON
      try {
        const parsed = JSON.parse(content)
        plainText = extractTextFromProseMirrorDoc(parsed)
      } catch {
        // 如果不是 JSON，当作 HTML 处理
        plainText = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
      }
    } else if (typeof content === 'object' && content !== null) {
      // 直接处理 ProseMirror 文档对象
      plainText = extractTextFromProseMirrorDoc(content)
    }
  } catch (error) {
    console.error('提取纯文本失败:', error)
    plainText = ''
  }
  
  if (!plainText) {
    stats.value = { wordCount: 0, characterCount: 0 }
    return
  }
  
  // 字符数
  const characterCount = plainText.length
  
  // 字数计算（中英文混合）
  const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length
  const wordCount = chineseChars + englishWords

  stats.value = { wordCount, characterCount }
}

// 从 ProseMirror 文档对象中提取纯文本
const extractTextFromProseMirrorDoc = (doc: any): string => {
  if (!doc || typeof doc !== 'object') return ''
  
  let text = ''
  
  function traverse(node: any) {
    if (node.type === 'text') {
      text += node.text || ''
    } else if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse)
    }
  }
  
  traverse(doc)
  return text.trim()
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
  lastContentLength = editorContent.value.length // 初始化长度记录
  lastSaveContent = editorContent.value // 初始化保存内容记录
})

// 页面卸载前保存
onUnmounted(() => {
  // 清理输入活动定时器
  if (inputActivityTimer) {
    clearTimeout(inputActivityTimer)
  }
  
  if (hasUnsavedChanges.value) {
    const contentStr = typeof editorContent.value === 'string' ? editorContent.value : JSON.stringify(editorContent.value)
    
    // 使用同步方式保存
    navigator.sendBeacon(
      '/api/auto-save',
      JSON.stringify({
        contentId: props.contentId,
        userId: props.userId,
        content: contentStr
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