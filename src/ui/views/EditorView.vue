<template>
  <div class="editor-view">
    <div class="editor-header">
      <h2>编辑器视图</h2>
      <div class="editor-info">
        <span>作品ID: {{ $route.params.workId || '未指定' }}</span>
        <div class="editor-actions">
          <button @click="saveContent" class="btn btn-primary" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button @click="toggleReadonly" class="btn btn-secondary">
            {{ readonly ? '编辑' : '只读' }}
          </button>
        </div>
      </div>
    </div>
    
    <div class="editor-container">
      <Editor
        v-model="content"
        :readonly="readonly"
        :placeholder="placeholder"
        @change="onContentChange"
      />
    </div>
    
    <div class="editor-status">
      <span>字数: {{ wordCount }}</span>
      <span>字符数: {{ charCount }}</span>
      <span v-if="lastSaved">最后保存: {{ formatTime(lastSaved) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Editor from '../components/Editor.vue'

const route = useRoute()

// 响应式数据
const content = ref('')
const readonly = ref(false)
const saving = ref(false)
const lastSaved = ref<Date | null>(null)
const extractPlainText = (html: string): string => {
  if (!html) return ''
  const container = document.createElement('div')
  container.innerHTML = html
  return container.textContent || ''
}

const plainText = computed(() => extractPlainText(content.value))

// 计算属性
const placeholder = computed(() => {
  const workId = route.params.workId
  return workId ? `开始编写作品 ${workId} 的内容...` : '开始写作...'
})

const wordCount = computed(() => {
  const text = plainText.value
  if (!text) return 0
  // 简单的单词计数（中文按字符计算，英文按单词计算）
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  return chineseChars + englishWords
})

const charCount = computed(() => {
  return plainText.value.length
})

// 方法
const onContentChange = (newContent: string) => {
  content.value = newContent
  // 这里可以添加自动保存逻辑
}

const saveContent = async () => {
  if (saving.value) return
  
  saving.value = true
  try {
    // 模拟保存到后端
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 这里应该调用实际的保存 API
    console.log('保存内容:', content.value)
    
    lastSaved.value = new Date()
  } catch (error) {
    console.error('保存失败:', error)
    // 这里可以显示错误提示
  } finally {
    saving.value = false
  }
}

const toggleReadonly = () => {
  readonly.value = !readonly.value
}

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  // 这里可以加载现有内容
  const workId = route.params.workId
  const chapterId = route.params.chapterId
  if (workId) {
    // 模拟加载作品内容
    content.value = `<h2>作品 ${workId}</h2><p>这里是${chapterId ? `章节 ${chapterId}` : '作品'}的初始内容...</p>`
  }
})
</script>

<style scoped>
.editor-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
}

.editor-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.editor-header h2 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
}

.editor-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #6c757d;
  font-size: 14px;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  color: #495057;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: #e9ecef;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #545b62;
  border-color: #545b62;
}

.editor-container {
  flex: 1;
  margin: 16px;
  display: flex;
  flex-direction: column;
}

.editor-status {
  padding: 8px 24px;
  background: #f8f9fa;
  border-top: 1px solid #e1e5e9;
  color: #6c757d;
  font-size: 12px;
  display: flex;
  gap: 24px;
}
</style>