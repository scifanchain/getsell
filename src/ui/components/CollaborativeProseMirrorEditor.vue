<template>
  <div class="collaborative-editor">
    <!-- 标题编辑器 -->
    <div class="title-editor" v-if="!readonly">
      <input 
        v-model="localTitle"
        placeholder="章节标题"
        class="title-input"
        @blur="updateTitle"
        @keydown.enter="updateTitle"
      />
    </div>

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
  initialTitle?: string // 初始标题
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
  userName: 'unity',
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
  'title-updated': [title: string]
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
const localTitle = ref(props.initialTitle || '')

// 组件初始化日志
console.log('CollaborativeProseMirrorEditor 初始化')

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

// 处理标题更新
const updateTitle = async () => {
  if (!props.contentId) return
  if (localTitle.value === props.initialTitle) return
  if (!props.userId) return
  
  try {
    // 导入 contentApi
    const { contentApi } = await import('../services/api')
    await contentApi.update(props.contentId, props.userId, {
      title: localTitle.value
    })
    emit('title-updated', localTitle.value)
  } catch (error) {
    console.error('协同编辑器标题更新失败:', error)
  }
}

// 初始化 Yjs 协同编辑
const initYjs = async () => {
  if (!props.contentId || !collaborationEnabled.value) {
    console.log('❌ Yjs 初始化跳过:', { contentId: props.contentId, collaborationEnabled: collaborationEnabled.value })
    return
  }

  console.log('🚀 开始初始化 Yjs')
  console.log('� props.contentId:', props.contentId)
  
  // 创建 Yjs 文档
  ydoc = new Y.Doc()
  yxml = ydoc.getXmlFragment('prosemirror')
  
  console.log('📄 Yjs 文档和片段创建完成')

  // 等待网络提供者设置完成
  await setupNetworkProviders()
  
  console.log('✅ Yjs 初始化完成')
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
  if (!ydoc || !props.contentId) {
    console.log('❌ 网络提供者设置跳过:', { ydoc: !!ydoc, contentId: props.contentId })
    return
  }

  const roomName = `gestell-${props.contentId}`

  try {
    console.log('🔄 开始设置网络提供者', { roomName, contentId: props.contentId })
    console.log('🌐 使用的配置:', { 
      websocket: props.collaborationConfig?.websocketUrl,
      signaling: props.collaborationConfig?.webrtcSignaling
    })
    
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
    console.log('📝 Props 中的用户信息:', {
      userId: props.userId,
      userName: props.userName,
      hasUserId: !!props.userId,
      hasUserName: !!props.userName
    })
    
    awareness.setLocalStateField('user', {
      id: props.userId || 'anonymous',
      name: props.userName || 'unity',
      color: getUserColor(props.userId || 'anonymous')
    })

    console.log('👤 用户信息已设置到 awareness', { 
      userId: props.userId || 'anonymous', 
      userName: props.userName || 'unity',
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
      // 使用基础 URL，y-websocket 会自动添加房间名称到路径
      console.log('🌐 创建 WebSocket 提供者', { url: props.collaborationConfig.websocketUrl, roomName })
      
      websocketProvider = new WebsocketProvider(
        props.collaborationConfig.websocketUrl,
        roomName,
        ydoc,
        { awareness }
      )

      // 添加详细的事件监听
      websocketProvider.on('status', (event: any) => {
        console.log('📡 WebSocket 状态:', event.status)
        updateConnectionStatus('websocket', event.status === 'connected')
      })
      
      websocketProvider.on('connection-close', (event: any) => {
        console.warn('⚠️ WebSocket 连接关闭:', event)
      })
      
      websocketProvider.on('connection-error', (error: any) => {
        console.error('❌ WebSocket 连接错误:', error)
        connectionStatus.value = 'disconnected'
      })
      
      websocketProvider.on('sync', (isSynced: boolean) => {
        console.log('🔄 WebSocket 同步状态:', isSynced)
        if (isSynced) {
          console.log('✅ WebSocket 文档已完全同步')
        }
      })
    }

    // 监听 WebRTC 连接状态
    webrtcProvider.on('status', (event: any) => {
      console.log('🔗 WebRTC 状态:', event.status)
      updateConnectionStatus('webrtc', event.status === 'connected')
    })

    // 监听协作者变化
    webrtcProvider.on('peers', (event: any) => {
      console.log('👥 WebRTC 对等节点变化:', {
        added: event.added,
        removed: event.removed,
        peers: event.webrtcPeers
      })
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
        name: state.user.name || 'unity',
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
  if (!editorContainer.value || !menuContainer.value) {
    console.log('❌ 编辑器初始化跳过：容器不存在', { 
      editorContainer: !!editorContainer.value, 
      menuContainer: !!menuContainer.value 
    })
    return
  }

  console.log('📝 开始初始化编辑器', {
    collaborationEnabled: collaborationEnabled.value,
    hasYdoc: !!ydoc,
    hasYxml: !!yxml,
    contentId: props.contentId
  })

  schema = createSchema()

  // 根据是否启用协作模式选择不同的插件
  const plugins = collaborationEnabled.value && ydoc && yxml ? 
    createCollaborativePlugins() : createStandardPlugins()

  console.log('🔌 插件类型:', collaborationEnabled.value && ydoc && yxml ? '协作插件' : '标准插件')

  // 创建初始文档
  let doc
  if (collaborationEnabled.value && ydoc && yxml) {
    // 协作模式：从 Yjs 创建文档
    console.log('🤝 协作模式：从 Yjs 创建文档')
    
    // 始终使用 ySyncPlugin 创建文档状态
    const tempState = EditorState.create({
      schema,
      plugins: [ySyncPlugin(yxml)]
    })
    
    doc = tempState.doc
    console.log('✅ 使用 ySyncPlugin 创建文档成功')
  } else {
    // 标准模式：从 modelValue 创建文档
    console.log('📄 标准模式：从 modelValue 创建文档')
    doc = createDocumentFromModelValue()
  }

  console.log('📋 最终文档创建完成:', { 
    docType: doc?.type?.name,
    hasContent: !!doc?.content,
    contentSize: doc?.content?.size 
  })

  // 创建编辑器状态
  const state = EditorState.create({
    doc: doc || schema.nodes.doc.createAndFill() || undefined,
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

  // 协作模式：如果编辑器是空的但有本地内容，填充它
  if (collaborationEnabled.value && editorView && props.modelValue) {
    setTimeout(() => {
      if (editorView && editorView.state.doc.content.size <= 2) { // 空文档大小通常是2
        console.log('🔄 编辑器为空，尝试从modelValue填充')
        try {
          const localDoc = createDocumentFromModelValue()
          if (localDoc && localDoc.content.size > 2) {
            const tr = editorView.state.tr.replaceWith(
              0,
              editorView.state.doc.content.size,
              localDoc.content
            )
            editorView.dispatch(tr)
            console.log('✅ 成功填充本地内容到协作编辑器')
          }
        } catch (error) {
          console.error('❌ 填充内容失败:', error)
        }
      }
    }, 500) // 等待500ms确保Yjs同步完成
  }

  // 移动菜单
  moveMenuToContainer()
}

// 创建协作插件
const createCollaborativePlugins = () => {
  console.log('🔌 创建协作插件')
  
  if (!ydoc || !yxml) {
    console.log('❌ 无法创建协作插件: 缺少 Yjs 依赖', { ydoc: !!ydoc, yxml: !!yxml })
    return createStandardPlugins()
  }

  const awareness = webrtcProvider?.awareness || websocketProvider?.awareness
  if (!awareness) {
    console.log('❌ 无法创建协作插件: 缺少 awareness')
    return createStandardPlugins()
  }

  console.log('✅ 创建协作插件成功')

  // 自定义光标构建器
  const cursorBuilder = (user: any) => {
    const cursor = document.createElement('span')
    cursor.classList.add('ProseMirror-yjs-cursor')
    cursor.style.borderColor = user.color
    
    const cursorLabel = document.createElement('div')
    cursorLabel.classList.add('yjs-cursor-label')
    cursorLabel.style.backgroundColor = user.color
    cursorLabel.textContent = user.name
    cursor.appendChild(cursorLabel)
    
    return cursor
  }

  return [
    ySyncPlugin(yxml),
    yCursorPlugin(awareness, { cursorBuilder }),
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
    menuBar.style.padding = '8px 12px'
    menuBar.style.border = 'none'
    menuBar.style.borderBottom = '1px solid #e5e7eb'
    menuBar.style.backgroundColor = '#f9fafb'
    menuBar.style.maxWidth = '100%'
    menuBar.style.overflow = 'hidden'
    
    // 限制按钮尺寸
    const buttons = menuBar.querySelectorAll('.ProseMirror-menu-item')
    buttons.forEach((button: any) => {
      button.style.margin = '1px'
      button.style.padding = '4px 6px'
      button.style.fontSize = '12px'
      button.style.minWidth = 'auto'
      button.style.width = 'auto'
    })
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
  console.log('🔄 切换协作模式', { 
    contentId: props.contentId, 
    currentState: collaborationEnabled.value 
  })
  
  if (!props.contentId) {
    console.warn('❌ 无法启用协作：缺少 contentId')
    return
  }

  collaborationEnabled.value = !collaborationEnabled.value
  console.log('🔄 协作模式已切换为:', collaborationEnabled.value)
  
  emit('collaboration-changed', collaborationEnabled.value)

  // 重新初始化编辑器
  cleanup()
  
  if (collaborationEnabled.value) {
    console.log('🚀 启用协作模式，初始化 Yjs')
    await initYjs()
  } else {
    console.log('🔌 禁用协作模式')
  }
  
  // 延迟重新初始化编辑器以确保 Yjs 设置完成
  setTimeout(() => {
    initEditor()
  }, 50)
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

// 监听 initialTitle 变化
watch(() => props.initialTitle, (newTitle) => {
  if (newTitle !== undefined && newTitle !== localTitle.value) {
    localTitle.value = newTitle
  }
})

// 组件生命周期
onMounted(async () => {
  if (collaborationEnabled.value) {
    await initYjs()
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
/* 标题编辑器样式 */
.title-editor {
  padding: 16px 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #fafafa;
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

/* 协同编辑器基础样式 */
:deep(.ProseMirror) {
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  -webkit-font-variant-ligatures: none !important;
  font-variant-ligatures: none !important;
  font-feature-settings: "liga" 0 !important;
  position: relative !important;
  outline: none !important;
  line-height: 1.6 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  padding: 16px !important;
  min-height: 300px !important;
}

:deep(.ProseMirror p) {
  margin: 1em 0 !important;
}

:deep(.ProseMirror p:first-child) {
  margin-top: 0 !important;
}

:deep(.ProseMirror p:last-child) {
  margin-bottom: 0 !important;
}

:deep(.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6) {
  line-height: 1.2 !important;
  margin-top: 1em !important;
  margin-bottom: 0.5em !important;
  font-weight: bold !important;
}

:deep(.ProseMirror h1) { font-size: 2em !important; }
:deep(.ProseMirror h2) { font-size: 1.5em !important; }
:deep(.ProseMirror h3) { font-size: 1.3em !important; }
:deep(.ProseMirror h4) { font-size: 1.1em !important; }
:deep(.ProseMirror h5) { font-size: 1em !important; }
:deep(.ProseMirror h6) { font-size: 0.9em !important; }

:deep(.ProseMirror ul, .ProseMirror ol) {
  padding-left: 1.5em !important;
  margin: 1em 0 !important;
}

:deep(.ProseMirror li) {
  margin: 0.25em 0 !important;
}

:deep(.ProseMirror strong) {
  font-weight: bold !important;
}

:deep(.ProseMirror em) {
  font-style: italic !important;
}

:deep(.ProseMirror code) {
  background: #f1f5f9 !important;
  padding: 0.1em 0.3em !important;
  border-radius: 3px !important;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
}

:deep(.ProseMirror pre) {
  background: #f8fafc !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 6px !important;
  padding: 1em !important;
  margin: 1em 0 !important;
  overflow-x: auto !important;
  white-space: pre !important;
}

:deep(.ProseMirror pre code) {
  background: none !important;
  padding: 0 !important;
  font-size: 0.9em !important;
}

:deep(.ProseMirror blockquote) {
  border-left: 4px solid #d1d5db !important;
  margin: 1em 0 !important;
  padding-left: 1em !important;
  color: #6b7280 !important;
  font-style: italic !important;
}

:deep(.ProseMirror hr) {
  border: none !important;
  border-top: 2px solid #e5e7eb !important;
  margin: 2em 0 !important;
}

/* ProseMirror 选择样式 */
:deep(.ProseMirror-selectednode) {
  outline: 2px solid #68d391 !important;
}

:deep(.ProseMirror-gapcursor) {
  display: none !important;
  pointer-events: none !important;
  position: absolute !important;
}

:deep(.ProseMirror-gapcursor:after) {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  top: -2px !important;
  width: 20px !important;
  border-top: 1px solid black !important;
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite !important;
}

@keyframes ProseMirror-cursor-blink {
  to {
    visibility: hidden !important;
  }
}

:deep(.ProseMirror-focused .ProseMirror-gapcursor) {
  display: block !important;
}

/* Yjs 协作光标样式 */
:deep(.ProseMirror .collaboration-cursor__caret) {
  position: relative !important;
  margin-left: -1px !important;
  margin-right: -1px !important;
  border-left: 1px solid #0D0D0D !important;
  border-right: 1px solid #0D0D0D !important;
  word-break: normal !important;
  pointer-events: none !important;
}

:deep(.ProseMirror .collaboration-cursor__label) {
  position: absolute !important;
  top: -1.4em !important;
  left: -1px !important;
  font-size: 12px !important;
  font-style: normal !important;
  font-weight: 600 !important;
  line-height: normal !important;
  user-select: none !important;
  color: #0D0D0D !important;
  padding: 0.1rem 0.3rem !important;
  border-radius: 3px !important;
  white-space: nowrap !important;
}

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
  max-width: 100%;
  overflow-x: auto;
  min-height: auto;
  height: auto;
}

/* 工具栏按钮样式 */
:deep(.editor-menu .ProseMirror-menubar) {
  max-width: 100% !important;
  overflow-x: auto !important;
  padding: 8px !important;
  min-height: auto !important;
  height: auto !important;
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 2px !important;
}

:deep(.editor-menu .ProseMirror-menu-item) {
  margin: 1px !important;
  padding: 6px 8px !important;
  font-size: 13px !important;
  min-width: auto !important;
  width: auto !important;
  height: 32px !important;
  border-radius: 4px !important;
  border: 1px solid transparent !important;
  background: transparent !important;
  color: #374151 !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s ease !important;
}

:deep(.editor-menu .ProseMirror-menu-item:hover) {
  background: #f3f4f6 !important;
  border-color: #d1d5db !important;
}

:deep(.editor-menu .ProseMirror-menu-item.ProseMirror-menu-active) {
  background: #e0e7ff !important;
  border-color: #6366f1 !important;
  color: #4f46e5 !important;
}

/* 工具栏分隔符样式 */
:deep(.editor-menu .ProseMirror-menu-separator) {
  margin: 0 4px !important;
  border-left: 1px solid #d1d5db !important;
  height: 24px !important;
  width: 1px !important;
}

/* 下拉菜单样式 */
:deep(.editor-menu .ProseMirror-dropdown) {
  position: relative !important;
}

:deep(.editor-menu .ProseMirror-dropdown-menu) {
  background: white !important;
  border: 1px solid #d1d5db !important;
  border-radius: 6px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  z-index: 1000 !important;
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
  background: white;
  color: #1f2937;
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
  background: white !important;
  color: #1f2937 !important;
  font-size: 14px;
  line-height: 1.6;
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
  border-left: 2px solid;
  border-right: none;
  border-color: orange;
  word-break: normal;
  pointer-events: none;
  height: 1.2em;
  display: inline;
}

/* 光标标签 */
:deep(.yjs-cursor-label) {
  position: absolute;
  top: -1.6em;
  left: -1px;
  font-size: 11px;
  font-style: normal;
  font-weight: 500;
  line-height: 1.3;
  user-select: none;
  color: white;
  padding: 2px 4px;
  border-radius: 3px 3px 3px 0;
  white-space: nowrap;
  z-index: 100;
  pointer-events: none;
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