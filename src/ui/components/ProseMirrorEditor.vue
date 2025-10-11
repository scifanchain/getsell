<template>
  <div class="prosemirror-editor">
    <div class="editor-menu" ref="menuContainer"></div>
    <div 
      class="editor-content" 
      ref="editorContainer"
      @click="handleContentClick"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Schema, DOMParser, DOMSerializer } from 'prosemirror-model'
import { schema as basicSchema } from 'prosemirror-schema-basic'
import { addListNodes } from 'prosemirror-schema-list'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { history, undo, redo } from 'prosemirror-history'
import { menuBar } from 'prosemirror-menu'
import { buildMenuItems } from '../utils/prosemirror-menu'

// Props
interface Props {
  modelValue?: string
  placeholder?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '开始写作...',
  readonly: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [content: string]
}>()

// Refs
const editorContainer = ref<HTMLDivElement>()
const menuContainer = ref<HTMLDivElement>()

// Editor instance
let editorView: EditorView | null = null
let schema: Schema

// 创建增强的 schema（包含基础 schema + 列表支持）
const createSchema = () => {
  return new Schema({
    nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
    marks: basicSchema.spec.marks
  })
}

// 初始化编辑器
const initEditor = () => {
  if (!editorContainer.value || !menuContainer.value) return

  schema = createSchema()

  // 创建初始文档
  let doc
  if (props.modelValue) {
    try {
      // 🎯 尝试解析为 ProseMirror JSON
      const parsed = JSON.parse(props.modelValue)
      if (parsed.type === 'doc') {
        // 是 ProseMirror JSON 格式
        doc = schema.nodeFromJSON(parsed)
        console.log('✅ 成功从 JSON 加载文档')
      } else {
        throw new Error('Not a ProseMirror doc')
      }
    } catch (e) {
      // 不是 JSON 或解析失败，尝试作为 HTML 处理
      try {
        const htmlDoc = new window.DOMParser().parseFromString(props.modelValue, 'text/html')
        doc = DOMParser.fromSchema(schema).parse(htmlDoc.body)
        console.log('✅ 成功从 HTML 加载文档')
      } catch (htmlError) {
        console.warn('⚠️ 内容格式不正确，使用空文档', e, htmlError)
        doc = schema.nodes.doc.createAndFill()
      }
    }
  } else {
    doc = schema.nodes.doc.createAndFill()
  }

  // 创建编辑器状态
  const state = EditorState.create({
    doc: doc ?? schema.nodes.doc.createAndFill() ?? schema.nodes.doc.create(),
    plugins: [
      history(),
      keymap({
        'Mod-z': undo,
        'Mod-y': redo,
        'Mod-Shift-z': redo
      }),
      keymap(baseKeymap),
      menuBar({
        content: buildMenuItems(schema).fullMenu,
        floating: false
      })
    ]
  })

  // 创建编辑器视图
  editorView = new EditorView(editorContainer.value, {
    state,
    editable: () => !props.readonly,
    dispatchTransaction(transaction) {
      if (!editorView) return

      const newState = editorView.state.apply(transaction)
      editorView.updateState(newState)

      // 发出内容变化事件
      if (transaction.docChanged) {
        const content = getContent()  // 使用 JSON 格式
        emit('update:modelValue', content)
        emit('change', content)
      }
    },
    attributes: {
      class: 'prose-editor',
      'data-placeholder': props.placeholder
    }
  })

  // 将菜单移动到指定容器
  const menuElement = editorContainer.value.querySelector('.ProseMirror-menubar')
  if (menuElement && menuContainer.value) {
    // 清空目标容器
    menuContainer.value.innerHTML = ''
    // 移动菜单
    menuContainer.value.appendChild(menuElement)
    
    // 确保菜单样式正确应用
    const menuBar = menuElement as HTMLElement
    menuBar.style.display = 'flex'
    menuBar.style.flexWrap = 'wrap'
    menuBar.style.alignItems = 'center'
    menuBar.style.gap = '4px'
    menuBar.style.padding = '8px'
    menuBar.style.border = 'none'
    menuBar.style.background = 'transparent'
    
    // 确保菜单项正确布局
    const menuItems = menuElement.querySelectorAll('.ProseMirror-menuitem')
    menuItems.forEach((item) => {
      const menuItem = item as HTMLElement
      menuItem.style.display = 'inline-flex'
      menuItem.style.alignItems = 'center'
      menuItem.style.justifyContent = 'center'
      menuItem.style.flexShrink = '0'
      menuItem.style.minWidth = '32px'
      menuItem.style.height = '32px'
      menuItem.style.whiteSpace = 'nowrap'
    })
  }
}

// 获取HTML内容
const getHTML = (): string => {
  if (!editorView) return ''
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(editorView.state.doc.content)
  const div = document.createElement('div')
  div.appendChild(fragment)
  return div.innerHTML
}

// 🎯 获取 ProseMirror JSON 内容
const getJSON = (): string => {
  if (!editorView) return JSON.stringify({ type: 'doc', content: [] })
  return JSON.stringify(editorView.state.doc.toJSON())
}

// 获取当前内容（默认返回 JSON 格式）
const getContent = (): string => {
  return getJSON()
}

// 设置内容
const setContent = (content: string) => {
  if (!editorView || !content) return
  
  try {
    // 🎯 尝试解析为 JSON
    const parsed = JSON.parse(content)
    if (parsed.type === 'doc') {
      const doc = schema.nodeFromJSON(parsed)
      const transaction = editorView.state.tr.replaceWith(0, editorView.state.doc.content.size, doc.content)
      editorView.dispatch(transaction)
      console.log('✅ 成功设置 JSON 内容')
      return
    }
  } catch (e) {
    // 不是 JSON，尝试作为 HTML 处理
  }
  
  // 作为 HTML 处理
  try {
    const htmlDoc = new window.DOMParser().parseFromString(content, 'text/html')
    const doc = DOMParser.fromSchema(schema).parse(htmlDoc.body)
    const transaction = editorView.state.tr.replaceWith(0, editorView.state.doc.content.size, doc.content)
    editorView.dispatch(transaction)
    console.log('✅ 成功设置 HTML 内容')
  } catch (e) {
    console.error('❌ 设置内容失败:', e)
  }
}

// 获取纯文本内容
const getText = (): string => {
  if (!editorView) return ''
  return editorView.state.doc.textContent
}

// 监听 modelValue 变化
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue !== getContent()) {
    setContent(newValue)
  }
})

// 监听只读状态变化
watch(() => props.readonly, () => {
  if (editorView) {
    editorView.setProps({
      editable: () => !props.readonly
    })
  }
})

// 🎯 点击编辑器空白区域聚焦
const handleContentClick = (e: MouseEvent) => {
  if (!editorView) return
  
  // 如果点击的是编辑器容器本身（空白区域），聚焦到编辑器末尾
  const target = e.target as HTMLElement
  if (target.classList.contains('editor-content') || target.closest('.ProseMirror')) {
    editorView.focus()
  }
}

// 暴露方法给父组件
defineExpose({
  getHTML,
  getText,
  setContent,
  focus: () => editorView?.focus(),
  blur: () => editorView?.dom.blur()
})

// 生命周期
onMounted(() => {
  initEditor()
  
  // 🎯 自动聚焦到编辑器
  setTimeout(() => {
    if (editorView) {
      editorView.focus()
      // 将光标移到文档末尾
      const { doc } = editorView.state
      const endPos = doc.content.size
      const tr = editorView.state.tr.setSelection(
        TextSelection.near(doc.resolve(endPos))
      )
      editorView.dispatch(tr)
      console.log('✅ 编辑器自动聚焦')
    }
  }, 100)
})

onUnmounted(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})
</script>

<style scoped>
.prosemirror-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  overflow: hidden;
}

.editor-menu {
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.editor-content {
  flex: 1;
  position: relative;
  overflow-y: auto;
  min-height: 400px; /* 🎯 设置最小高度 */
}

:deep(.prose-editor) {
  outline: none;
  padding: 16px;
  min-height: 100%;
  height: 100%; /* 🎯 占满容器 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #2c3e50;
  cursor: text; /* 🎯 全区域显示文本光标 */
}

:deep(.prose-editor:empty::before) {
  content: attr(data-placeholder);
  color: #adb5bd;
  pointer-events: none;
  position: absolute;
}

:deep(.prose-editor p) {
  margin: 0 0 16px 0;
}

:deep(.prose-editor h1) {
  font-size: 2em;
  font-weight: bold;
  margin: 24px 0 16px 0;
  color: #1a202c;
}

:deep(.prose-editor h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin: 20px 0 12px 0;
  color: #2d3748;
}

:deep(.prose-editor h3) {
  font-size: 1.25em;
  font-weight: bold;
  margin: 16px 0 8px 0;
  color: #4a5568;
}

:deep(.prose-editor ul, .prose-editor ol) {
  margin: 16px 0;
  padding-left: 24px;
}

:deep(.prose-editor li) {
  margin: 4px 0;
}

:deep(.prose-editor blockquote) {
  border-left: 4px solid #e2e8f0;
  margin: 16px 0;
  padding: 8px 16px;
  background: #f7fafc;
  color: #4a5568;
}

:deep(.prose-editor code) {
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9em;
}

:deep(.prose-editor strong) {
  font-weight: bold;
}

:deep(.prose-editor em) {
  font-style: italic;
}

/* 菜单栏样式 */
:deep(.ProseMirror-menubar) {
  border: none;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

:deep(.ProseMirror-menu) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

:deep(.ProseMirror-menuitem) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  background: white;
  color: #4a5568;
  font-size: 14px;
  min-width: 32px;
  height: 32px;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;
}

:deep(.ProseMirror-menuitem:hover) {
  background: #e2e8f0;
  border-color: #cbd5e0;
}

:deep(.ProseMirror-menuitem.ProseMirror-menu-active) {
  background: #3182ce;
  color: white;
  border-color: #2c5aa0;
}

:deep(.ProseMirror-menuitem[title]) {
  position: relative;
}

/* 菜单分组 */
:deep(.ProseMirror-menubar > *) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
}

/* 分隔符 */
:deep(.ProseMirror-menuseparator) {
  width: 1px;
  height: 20px;
  background: #e2e8f0;
  margin: 0 8px;
  flex-shrink: 0;
}
</style>