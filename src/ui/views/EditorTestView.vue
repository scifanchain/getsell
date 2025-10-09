<template>
  <div class="editor-test">
    <h1>ProseMirror 编辑器测试</h1>
    <div class="test-controls">
      <button @click="loadSampleContent" class="btn">加载示例内容</button>
      <button @click="clearContent" class="btn">清空内容</button>
      <button @click="toggleReadonly" class="btn">切换只读模式</button>
      <button @click="getContent" class="btn">获取内容</button>
    </div>
    
    <div class="editor-wrapper">
      <ProseMirrorEditor
        v-model="content"
        :readonly="readonly"
        placeholder="开始在 ProseMirror 中写作..."
        @change="onContentChange"
        ref="editorRef"
      />
    </div>
    
    <div class="content-preview">
      <h3>实时预览</h3>
      <div class="preview-content" v-html="content"></div>
      
      <h3>纯文本</h3>
      <pre>{{ plainText }}</pre>
      
      <h3>统计信息</h3>
      <div class="stats">
        <div>字数: {{ wordCount }}</div>
        <div>字符数: {{ charCount }}</div>
        <div>段落数: {{ paragraphCount }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ProseMirrorEditor from '../components/ProseMirrorEditor.vue'

const content = ref('')
const readonly = ref(false)
const editorRef = ref<InstanceType<typeof ProseMirrorEditor>>()

const plainText = computed(() => {
  return editorRef.value?.getText() || ''
})

const wordCount = computed(() => {
  const text = plainText.value
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  return chineseChars + englishWords
})

const charCount = computed(() => {
  return plainText.value.length
})

const paragraphCount = computed(() => {
  const text = plainText.value
  return (text.match(/\n/g) || []).length + 1
})

const loadSampleContent = () => {
  content.value = `
    <h1>欢迎使用 ProseMirror</h1>
    <p>这是一个强大的富文本编辑器，支持以下功能：</p>
    
    <h2>文本格式</h2>
    <p>你可以使用 <strong>粗体</strong>、<em>斜体</em> 和 <code>行内代码</code>。</p>
    
    <h3>列表支持</h3>
    <ul>
      <li>无序列表项 1</li>
      <li>无序列表项 2</li>
      <li>支持嵌套列表</li>
    </ul>
    
    <ol>
      <li>有序列表项 1</li>
      <li>有序列表项 2</li>
      <li>自动编号</li>
    </ol>
    
    <h3>引用块</h3>
    <blockquote>
      这是一个引用块，可以用来突出重要的文本内容。
      ProseMirror 提供了灵活的文档结构支持。
    </blockquote>
    
    <p>ProseMirror 的优势包括：</p>
    <ul>
      <li><strong>结构化编辑</strong>：基于文档模型，而不是 HTML 字符串</li>
      <li><strong>协作友好</strong>：内置对实时协作的支持</li>
      <li><strong>可扩展性</strong>：可以自定义节点类型和标记</li>
      <li><strong>撤销/重做</strong>：智能的历史管理</li>
    </ul>
  `
}

const clearContent = () => {
  content.value = ''
}

const toggleReadonly = () => {
  readonly.value = !readonly.value
}

const getContent = () => {
  const html = editorRef.value?.getHTML() || ''
  const text = editorRef.value?.getText() || ''
  
  console.log('HTML 内容:', html)
  console.log('纯文本:', text)
  
  alert(`HTML 长度: ${html.length}\n纯文本长度: ${text.length}`)
}

const onContentChange = (newContent: string) => {
  console.log('内容已更改，长度:', newContent.length)
}
</script>

<style scoped>
.editor-test {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.editor-test h1 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.test-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  color: #333;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  background: #f5f5f5;
  border-color: #999;
}

.btn:active {
  background: #e9e9e9;
}

.editor-wrapper {
  height: 400px;
  margin-bottom: 30px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
}

.content-preview {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.content-preview h3 {
  color: #495057;
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 600;
}

.preview-content {
  background: white;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  margin-bottom: 20px;
  min-height: 100px;
}

.preview-content :deep(h1) {
  color: #1a202c;
  font-size: 1.8em;
  margin: 0 0 16px 0;
}

.preview-content :deep(h2) {
  color: #2d3748;
  font-size: 1.4em;
  margin: 20px 0 12px 0;
}

.preview-content :deep(h3) {
  color: #4a5568;
  font-size: 1.2em;
  margin: 16px 0 8px 0;
}

.preview-content :deep(p) {
  margin: 0 0 16px 0;
  line-height: 1.6;
}

.preview-content :deep(ul), 
.preview-content :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.preview-content :deep(blockquote) {
  border-left: 4px solid #e2e8f0;
  margin: 16px 0;
  padding: 8px 16px;
  background: #f7fafc;
  color: #4a5568;
}

pre {
  background: white;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  margin-bottom: 20px;
  white-space: pre-wrap;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  color: #495057;
  max-height: 200px;
  overflow-y: auto;
}

.stats {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.stats div {
  background: white;
  padding: 10px 15px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  font-weight: 500;
  color: #495057;
}
</style>