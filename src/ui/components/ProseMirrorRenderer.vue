<template>
  <div class="prosemirror-renderer" v-html="renderedHtml"></div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Schema, DOMSerializer } from 'prosemirror-model'
import { schema as basicSchema } from 'prosemirror-schema-basic'
import { addListNodes } from 'prosemirror-schema-list'

// Props
interface Props {
  content?: string
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  className: ''
})

// 创建增强的 schema（与编辑器使用相同的 schema）
const createSchema = () => {
  return new Schema({
    nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
    marks: basicSchema.spec.marks
  })
}

// 渲染的HTML内容
const renderedHtml = ref('')

// 将 ProseMirror JSON 转换为 HTML
const renderContent = () => {
  if (!props.content) {
    renderedHtml.value = ''
    return
  }

  try {
    // 尝试解析为 ProseMirror JSON
    const parsed = JSON.parse(props.content)
    
    if (parsed.type === 'doc') {
      // 是 ProseMirror JSON 格式
      const schema = createSchema()
      const doc = schema.nodeFromJSON(parsed)
      
      // 使用 DOMSerializer 将文档转换为 HTML
      const fragment = DOMSerializer.fromSchema(schema).serializeFragment(doc.content)
      const div = document.createElement('div')
      div.appendChild(fragment)
      
      renderedHtml.value = div.innerHTML
      console.log('✅ 成功渲染 ProseMirror JSON 内容')
    } else {
      throw new Error('Not a ProseMirror doc')
    }
  } catch (e) {
    // 不是 JSON 或解析失败，尝试作为 HTML 处理
    if (typeof props.content === 'string') {
      // 检查是否包含HTML标签
      if (props.content.includes('<') && props.content.includes('>')) {
        renderedHtml.value = props.content
        console.log('✅ 直接使用 HTML 内容')
      } else {
        // 纯文本，转换为段落
        renderedHtml.value = `<p>${props.content.replace(/\n/g, '<br>')}</p>`
        console.log('✅ 渲染纯文本内容')
      }
    } else {
      console.warn('⚠️ 无法渲染内容格式:', props.content)
      renderedHtml.value = '<p>无法显示内容</p>'
    }
  }
}

// 监听内容变化
watch(() => props.content, renderContent, { immediate: true })
</script>

<style scoped>
.prosemirror-renderer {
  /* 应用与编辑器相同的样式 */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  max-width: none;
}

/* ProseMirror 内容样式 */
.prosemirror-renderer :deep(p) {
  margin: 0 0 1em 0;
}

.prosemirror-renderer :deep(p:last-child) {
  margin-bottom: 0;
}

.prosemirror-renderer :deep(h1) {
  font-size: 2em;
  font-weight: bold;
  margin: 1em 0 0.5em 0;
  line-height: 1.2;
}

.prosemirror-renderer :deep(h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin: 1em 0 0.5em 0;
  line-height: 1.3;
}

.prosemirror-renderer :deep(h3) {
  font-size: 1.25em;
  font-weight: bold;
  margin: 1em 0 0.5em 0;
  line-height: 1.4;
}

.prosemirror-renderer :deep(h4),
.prosemirror-renderer :deep(h5),
.prosemirror-renderer :deep(h6) {
  font-size: 1em;
  font-weight: bold;
  margin: 1em 0 0.5em 0;
  line-height: 1.5;
}

.prosemirror-renderer :deep(ul),
.prosemirror-renderer :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.prosemirror-renderer :deep(li) {
  margin: 0.5em 0;
}

.prosemirror-renderer :deep(blockquote) {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 3px solid #ddd;
  color: #666;
  font-style: italic;
}

.prosemirror-renderer :deep(code) {
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.9em;
}

.prosemirror-renderer :deep(pre) {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

.prosemirror-renderer :deep(pre code) {
  background: none;
  padding: 0;
}

.prosemirror-renderer :deep(strong) {
  font-weight: bold;
}

.prosemirror-renderer :deep(em) {
  font-style: italic;
}

.prosemirror-renderer :deep(a) {
  color: #3b82f6;
  text-decoration: underline;
}

.prosemirror-renderer :deep(a:hover) {
  color: #2563eb;
}

.prosemirror-renderer :deep(hr) {
  border: none;
  border-top: 1px solid #ddd;
  margin: 2em 0;
}

/* 空内容样式 */
.prosemirror-renderer:empty::before {
  content: "暂无内容";
  color: #9ca3af;
  font-style: italic;
}
</style>