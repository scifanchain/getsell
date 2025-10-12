<template>
  <div class="collaborative-editor">
    <!-- 协作状态栏 -->
    <div class="collaboration-status" v-if="collaborationEnabled">
      <div class="status-indicators">
        <div class="connection-status" :class="connectionStatus">
          <span class="status-dot"></span>
          {{ getConnectionStatusText() }}
        </div>
        <div class="collaborators-count" v-if="collaborators.length > 0">
          {{ collaborators.length }} 位协作者在线
        </div>
      </div>
      <div class="collaborators-list">
        <div 
          v-for="collaborator in collaborators" 
          :key="collaborator.userId"
          class="collaborator-avatar"
          :style="{ backgroundColor: collaborator.color }"
          :title="collaborator.name"
        >
          {{ getInitials(collaborator.name) }}
        </div>
      </div>
    </div>

    <!-- 编辑器菜单 -->
    <div class="editor-menu" ref="menuContainer"></div>
    
    <!-- 编辑器内容区 -->
    <div 
      class="editor-content" 
      ref="editorContainer"
      @click="handleContentClick"
    ></div>

    <!-- 协作模式切换 -->
    <div class="editor-footer" v-if="!readonly">
      <button 
        @click="toggleCollaboration" 
        class="btn btn-collaboration"
        :class="{ active: collaborationEnabled }"
      >
        <span class="icon">🤝</span>
        {{ collaborationEnabled ? '退出协作' : '开启协作' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
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

// Yjs 相关导入
import * as Y from 'yjs'
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo as yUndo, redo as yRedo } from 'y-prosemirror'
import { WebrtcProvider } from 'y-webrtc'
import { WebsocketProvider } from 'y-websocket'
import { Awareness } from 'y-protocols/awareness'

// Props
interface Props {
  modelValue?: string
  placeholder?: string
  readonly?: boolean
  contentId?: string // 用于协同编辑的内容ID
  userId?: string    // 当前用户ID
  userName?: string  // 当前用户名
  enableCollaboration?: boolean // 是否启用协作模式
  collaborationConfig?: {
    websocketUrl?: string
    webrtcSignaling?: string[]
    maxConnections?: number
  }
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '开始写作...',
  readonly: false,
  enableCollaboration: false,
  userName: '匿名用户',
  collaborationConfig: () => ({
    websocketUrl: 'ws://localhost:4001/signaling',
    webrtcSignaling: ['ws://localhost:4001/signaling'],
    maxConnections: 10
  })
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [content: string]
  'collaboration-changed': [enabled: boolean]
  'collaborators-updated': [collaborators: Collaborator[]]
}>()

// 协作者信息类型
interface Collaborator {
  userId: string
  name: string
  color: string
  cursor?: {
    anchor: number
    head: number
  }
}

// Refs
const editorContainer = ref<HTMLDivElement>()
const menuContainer = ref<HTMLDivElement>()
const collaborationEnabled = ref(props.enableCollaboration)
const collaborators = ref<Collaborator[]>([])
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')

// Editor and Yjs instances
let editorView: EditorView | null = null
let schema: Schema
let ydoc: Y.Doc | null = null
let yxml: Y.XmlFragment | null = null
let webrtcProvider: WebrtcProvider | null = null
let websocketProvider: WebsocketProvider | null = null

// 用户颜色映射
const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

// 创建增强的 schema
const createSchema = () => {
  return new Schema({
    nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
    marks: basicSchema.spec.marks
  })
}

// 获取用户颜色
const getUserColor = (userId: string): string => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return userColors[hash % userColors.length]
}

// 响应式状态
const isWebRTCConnected = ref(false)
const isWebSocketConnected = ref(false)

// 更新连接状态
const updateConnectionStatus = (provider: 'webrtc' | 'websocket', connected: boolean) => {
  console.log(`📡 ${provider} 连接状态更新:`, connected)
  
  if (provider === 'webrtc') {
    isWebRTCConnected.value = connected
  } else if (provider === 'websocket') {
    isWebSocketConnected.value = connected
  }
  
  // 更新总连接状态
  if (isWebRTCConnected.value || isWebSocketConnected.value) {
    connectionStatus.value = 'connected'
  } else {
    connectionStatus.value = 'disconnected'
  }
}

// 获取用户名首字母
const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// 获取连接状态文本
const getConnectionStatusText = (): string => {
  switch (connectionStatus.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    case 'disconnected': return '未连接'
    default: return '未知状态'
  }
}

// 初始化 Yjs 协同编辑
const initYjs = () => {
  if (!props.contentId || !collaborationEnabled.value) return

  // 创建 Yjs 文档
  ydoc = new Y.Doc()
  yxml = ydoc.getXmlFragment('prosemirror')

  // 如果有初始内容，设置到 Yjs 文档中
  if (props.modelValue && yxml.firstChild === null) {
    try {
      const parsed = JSON.parse(props.modelValue)
      if (parsed.type === 'doc' && parsed.content) {
        // 将 ProseMirror JSON 转换为 ProseMirror 文档然后设置到 YXmlFragment
        const doc = schema.nodeFromJSON(parsed)
        if (doc) {
          // 使用 ySyncPlugin 的 sync 功能来设置初始内容
          // 这里暂时跳过，让 Yjs 处理内容同步
        }
      }
    } catch (e) {
      console.warn('Failed to parse initial content:', e)
    }
  }

  // 设置网络提供者
  setupNetworkProviders()
}

// 提取 ProseMirror JSON 中的纯文本
const extractTextFromProseMirrorJson = (doc: any): string => {
  let text = ''
  
  const traverse = (node: any) => {
    if (node.type === 'text') {
      text += node.text || ''
    } else if (node.content) {
      node.content.forEach(traverse)
    }
    if (node.type === 'paragraph' && text && !text.endsWith('\n')) {
      text += '\n'
    }
  }
  
  if (doc.content) {
    doc.content.forEach(traverse)
  }
  
  return text.trim()
}

// 设置网络提供者
const setupNetworkProviders = async () => {
  if (!ydoc || !props.contentId) return

  const roomName = `gestell-${props.contentId}`

  try {
    console.log('🔄 开始设置网络提供者', { roomName, contentId: props.contentId })
    
    // 动态导入网络提供者（避免 SSR 问题）
    const [WebrtcProvider, WebsocketProvider, Awareness] = await Promise.all([
      import('y-webrtc').then(m => m.WebrtcProvider),
      import('y-websocket').then(m => m.WebsocketProvider),
      import('y-protocols/awareness').then(m => m.Awareness)
    ])

    console.log('✅ 网络提供者模块加载成功')

    // 创建 Awareness 实例
    const awareness = new Awareness(ydoc)
    
    // 设置用户信息
    awareness.setLocalStateField('user', {
      id: props.userId,
      name: props.userName,
      color: getUserColor(props.userId || 'anonymous')
    })

    console.log('👤 用户信息已设置', { 
      userId: props.userId, 
      userName: props.userName,
      color: getUserColor(props.userId || 'anonymous')
    })

    // WebRTC 提供者 (P2P)
    const signalingUrls = props.collaborationConfig?.webrtcSignaling || ['ws://localhost:4001/signaling']
    console.log('🔗 创建 WebRTC 提供者', { signalingUrls })
    
    webrtcProvider = new WebrtcProvider(roomName, ydoc, {
      signaling: signalingUrls,
      maxConns: props.collaborationConfig?.maxConnections || 10,
      filterBcConns: true,
      awareness
    })

    // WebSocket 提供者 (备用) - 现在使用支持 Yjs 协议的服务器
    if (props.collaborationConfig?.websocketUrl) {
      console.log('🌐 创建 WebSocket 提供者', { url: props.collaborationConfig.websocketUrl })
      
      websocketProvider = new WebsocketProvider(
        props.collaborationConfig.websocketUrl,
        roomName,
        ydoc,
        { awareness }
      )

      websocketProvider.on('status', (event: any) => {
        console.log('📡 WebSocket 状态变化:', event)
        updateConnectionStatus('websocket', event.status === 'connected')
      })
    }

    // 监听 WebRTC 连接状态
    webrtcProvider.on('status', (event: any) => {
      console.log('🔗 WebRTC 状态变化:', event)
      updateConnectionStatus('webrtc', event.status === 'connected')
    })

    // 监听协作者变化
    webrtcProvider.on('peers', () => {
      console.log('👥 协作者列表变化')
      updateCollaborators(awareness)
    })

    // 监听连接状态
    webrtcProvider.on('synced', () => {
      console.log('✅ WebRTC 同步完成')
      connectionStatus.value = 'connected'
    })

    console.log('🎉 网络提供者设置完成')

  } catch (error) {
    console.error('❌ 网络提供者设置失败:', error)
    connectionStatus.value = 'disconnected'
  }
}

// 更新协作者列表
const updateCollaborators = (awareness: any) => {
  if (!awareness) return

  const newCollaborators: Collaborator[] = []
  
  awareness.getStates().forEach((state: any, clientId: number) => {
    if (state.user && clientId !== awareness.clientID) {
      newCollaborators.push({
        userId: state.user.id || `client-${clientId}`,
        name: state.user.name || '匿名用户',
        color: state.user.color || getUserColor(state.user.id || `client-${clientId}`),
        cursor: state.cursor
      })
    }
  })

  collaborators.value = newCollaborators
  emit('collaborators-updated', newCollaborators)
}

// 初始化编辑器
const initEditor = () => {
  if (!editorContainer.value || !menuContainer.value) return

  schema = createSchema()

  // 根据是否启用协作模式选择不同的插件
  const plugins = collaborationEnabled.value && ydoc && yxml ? 
    createCollaborativePlugins() : createStandardPlugins()

  // 创建初始文档
  let doc
  if (collaborationEnabled.value && yxml) {
    // 协作模式：从 Yjs 创建文档
    try {
      // 使用 ySyncPlugin 创建文档
      const yPlugin = ySyncPlugin(yxml)
      if (yPlugin.spec?.init && typeof yPlugin.spec.init === 'function') {
        doc = yPlugin.spec.init(schema)
      } else {
        // 备用方案：创建空文档，让 ySyncPlugin 自动同步
        doc = createDocumentFromModelValue()
      }
    } catch (error) {
      console.error('Failed to initialize collaborative document:', error)
      doc = createDocumentFromModelValue()
    }
  } else {
    // 标准模式：从 modelValue 创建文档
    doc = createDocumentFromModelValue()
  }

  // 创建编辑器状态
  const state = EditorState.create({
    doc: doc || schema.nodes.doc.createAndFill(),
    plugins
  })

  // 创建编辑器视图
  editorView = new EditorView(editorContainer.value, {
    state,
    editable: () => !props.readonly,
    dispatchTransaction(transaction) {
      if (!editorView) return

      const newState = editorView.state.apply(transaction)
      editorView.updateState(newState)

      // 在非协作模式下发出内容变化事件
      if (!collaborationEnabled.value && transaction.docChanged) {
        const content = getContent()
        emit('update:modelValue', content)
        emit('change', content)
      }
    },
    attributes: {
      class: 'prose-editor collaborative-prose',
      'data-placeholder': props.placeholder
    }
  })

  // 移动菜单
  moveMenuToContainer()
}

// 创建协作插件
const createCollaborativePlugins = () => {
  if (!ydoc || !yxml) return createStandardPlugins()

  const awareness = webrtcProvider?.awareness || websocketProvider?.awareness
  if (!awareness) return createStandardPlugins()

  return [
    ySyncPlugin(yxml),
    yCursorPlugin(awareness),
    yUndoPlugin(),
    keymap({
      'Mod-z': yUndo,
      'Mod-y': yRedo,
      'Mod-Shift-z': yRedo
    }),
    keymap(baseKeymap),
    menuBar({
      content: buildMenuItems(schema).fullMenu,
      floating: false
    })
  ]
}

// 创建标准插件
const createStandardPlugins = () => {
  return [
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
}

// 从 modelValue 创建文档
const createDocumentFromModelValue = () => {
  if (!schema) {
    schema = createSchema() // 确保 schema 已初始化
  }
  
  if (!props.modelValue) {
    return schema.nodes.doc.createAndFill()
  }

  try {
    const parsed = JSON.parse(props.modelValue)
    if (parsed.type === 'doc') {
      return schema.nodeFromJSON(parsed)
    }
    throw new Error('Not a ProseMirror doc')
  } catch (e) {
    try {
      const htmlDoc = new window.DOMParser().parseFromString(props.modelValue, 'text/html')
      return DOMParser.fromSchema(schema).parse(htmlDoc.body)
    } catch (htmlError) {
      console.warn('Failed to parse content, using empty document')
      return schema.nodes.doc.createAndFill()
    }
  }
}

// 移动菜单到指定容器
const moveMenuToContainer = () => {
  if (!editorContainer.value || !menuContainer.value) return

  const menuElement = editorContainer.value.querySelector('.ProseMirror-menubar')
  if (menuElement) {
    menuContainer.value.innerHTML = ''
    menuContainer.value.appendChild(menuElement)
    
    const menuBar = menuElement as HTMLElement
    menuBar.style.display = 'flex'
    menuBar.style.flexWrap = 'wrap'
    menuBar.style.alignItems = 'center'
    menuBar.style.gap = '4px'
    menuBar.style.padding = '8px'
    menuBar.style.border = 'none'
    menuBar.style.borderBottom = '1px solid #e5e7eb'
    menuBar.style.backgroundColor = '#f9fafb'
  }
}

// 获取编辑器内容
const getContent = (): string => {
  if (!editorView) return ''

  try {
    const doc = editorView.state.doc
    return JSON.stringify(doc.toJSON())
  } catch (e) {
    console.error('Failed to serialize document:', e)
    return ''
  }
}

// 切换协作模式
const toggleCollaboration = async () => {
  if (!props.contentId) {
    console.warn('Cannot enable collaboration without contentId')
    return
  }

  collaborationEnabled.value = !collaborationEnabled.value
  emit('collaboration-changed', collaborationEnabled.value)

  // 重新初始化编辑器
  cleanup()
  
  if (collaborationEnabled.value) {
    initYjs()
  }
  
  // 延迟重新初始化编辑器以确保 Yjs 设置完成
  setTimeout(() => {
    initEditor()
  }, 100)
}

// 处理内容点击
const handleContentClick = () => {
  if (editorView && !props.readonly) {
    editorView.focus()
  }
}

// 清理资源
const cleanup = () => {
  if (webrtcProvider) {
    webrtcProvider.destroy()
    webrtcProvider = null
  }
  
  if (websocketProvider) {
    websocketProvider.destroy()
    websocketProvider = null
  }
  
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
  
  if (ydoc) {
    ydoc.destroy()
    ydoc = null
    yxml = null
  }

  collaborators.value = []
  connectionStatus.value = 'disconnected'
}

// 监听 props 变化
watch(() => props.modelValue, (newValue) => {
  if (!collaborationEnabled.value && editorView && newValue !== getContent()) {
    // 在非协作模式下更新内容
    const doc = createDocumentFromModelValue()
    if (doc) {
      const state = EditorState.create({
        doc,
        plugins: editorView.state.plugins
      })
      editorView.updateState(state)
    }
  }
})

watch(() => props.readonly, (newReadonly) => {
  if (editorView) {
    editorView.setProps({ editable: () => !newReadonly })
  }
})

// 组件生命周期
onMounted(() => {
  if (collaborationEnabled.value) {
    initYjs()
  }
  initEditor()
})

onUnmounted(() => {
  cleanup()
})

// 暴露给父组件的方法
defineExpose({
  getContent,
  focus: () => editorView?.focus(),
  toggleCollaboration,
  isCollaborationEnabled: () => collaborationEnabled.value,
  getCollaborators: () => collaborators.value
})
</script>

<style scoped>
.collaborative-editor {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.collaboration-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
}

.status-indicators {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.connection-status.connected {
  color: #059669;
}

.connection-status.connecting {
  color: #d97706;
}

.connection-status.disconnected {
  color: #dc2626;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.collaborators-count {
  color: #6b7280;
}

.collaborators-list {
  display: flex;
  gap: 4px;
}

.collaborator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: 600;
  border: 2px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.editor-menu {
  border-bottom: 1px solid #e5e7eb;
}

.editor-content {
  min-height: 300px;
}

.editor-footer {
  padding: 8px 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.btn-collaboration {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-collaboration:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-collaboration.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.btn-collaboration .icon {
  font-size: 14px;
}

/* ProseMirror 样式增强 */
:deep(.prose-editor) {
  padding: 16px;
  outline: none;
  min-height: 300px;
}

/* ProseMirror 必需的基础样式 */
:deep(.prose-editor .ProseMirror) {
  white-space: pre-wrap;
  word-wrap: break-word;
  -webkit-user-modify: read-write-plaintext-only;
  -moz-user-modify: read-write;
  outline: none;
  font-variant-ligatures: none;
  font-feature-settings: "liga" 0; /* the above doesn't seem to work in Edge */
}

:deep(.prose-editor .ProseMirror pre) {
  white-space: pre-wrap;
}

:deep(.prose-editor .ProseMirror li) {
  position: relative;
}

:deep(.prose-editor .ProseMirror-hideselection *::selection) {
  background: transparent;
}

:deep(.prose-editor .ProseMirror-hideselection *::-moz-selection) {
  background: transparent;
}

:deep(.prose-editor .ProseMirror-selectednode) {
  outline: 2px solid #8cf;
}

:deep(.prose-editor p) {
  margin: 0 0 1em 0;
  text-align: justify;
  text-justify: inter-ideograph;
  word-spacing: normal;
  letter-spacing: normal;
  hyphens: auto;
}

:deep(.prose-editor p:last-child) {
  margin-bottom: 0;
}

/* 协作光标样式 */
:deep(.ProseMirror-yjs-cursor) {
  position: relative;
  margin-left: -1px;
  margin-right: -1px;
  border-left: 1px solid;
  border-right: 1px solid;
  word-break: normal;
  pointer-events: none;
}

:deep(.ProseMirror-yjs-cursor:after) {
  content: '';
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  height: 20px;
  background: currentColor;
  z-index: 10;
}

/* 占位符样式 */
:deep(.prose-editor[data-placeholder]:before) {
  content: attr(data-placeholder);
  color: #9ca3af;
  position: absolute;
  pointer-events: none;
}

:deep(.prose-editor:focus[data-placeholder]:before) {
  display: none;
}
</style>