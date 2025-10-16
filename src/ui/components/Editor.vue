<template>
  <div class="unified-editor">
    <!-- 协作状态栏 -->
    <div class="collaboration-status" v-if="collaborationMode && !readonly">
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

    <!-- 编辑器内容区 -->
    <div 
      class="editor-content" 
      ref="editorContainer"
      @click="handleContentClick"
    ></div>

    <!-- 底部工具栏 -->
    <div class="editor-footer" v-if="!readonly">
      <div class="editor-info">
        <span class="sync-status" v-if="collaborationMode">
          {{ syncStatus }}
        </span>
      </div>
      
      <div class="editor-actions">
        <button 
          v-if="!collaborationMode"
          @click="enableCollaboration" 
          class="btn btn-outline"
        >
          <span class="icon">🤝</span>
          开启协作
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Schema, DOMParser, DOMSerializer } from 'prosemirror-model'
import { schema as basicSchema } from 'prosemirror-schema-basic'
import { addListNodes } from 'prosemirror-schema-list'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { history, undo, redo } from 'prosemirror-history'
import { menuBar } from 'prosemirror-menu'
import { buildMenuItems } from '../utils/prosemirror-menu'

// Yjs 相关导入 (仅在协作模式下使用)
import * as Y from 'yjs'
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo as yUndo, redo as yRedo } from 'y-prosemirror'
import { WebrtcProvider } from 'y-webrtc'
import { WebsocketProvider } from 'y-websocket'
import { Awareness } from 'y-protocols/awareness'

interface Props {
  modelValue?: string
  placeholder?: string
  readonly?: boolean
  contentId?: string
  userId?: string
  userName?: string
  collaborationMode?: boolean
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
  collaborationMode: false,
  collaborationConfig: () => ({
    websocketUrl: 'ws://localhost:4001/signaling',
    webrtcSignaling: ['ws://localhost:4001/signaling'],
    maxConnections: 10
  })
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [content: string]
  'collaboration-changed': [enabled: boolean]
  'collaborators-updated': [collaborators: any[]]
  'title-updated': [title: string]
}>()

const editorContainer = ref<HTMLDivElement>()
const collaborationMode = computed(() => props.collaborationMode)
const readonly = computed(() => props.readonly)


let editorView: EditorView | null = null
let schema: Schema

const collaborationEnabled = ref(false)
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('disconnected')
const collaborators = ref<any[]>([])
const syncStatus = ref('已同步')

let ydoc: Y.Doc | null = null
let provider: WebrtcProvider | WebsocketProvider | null = null
let awareness: Awareness | null = null

const initEditor = async () => {
  if (!editorContainer.value) return

  schema = new Schema({
    nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
    marks: basicSchema.spec.marks
  })

  let state: EditorState

  if (props.collaborationMode && collaborationEnabled.value) {
    await initCollaboration()
    state = createCollaborativeState()
  } else {
    state = createStandardState()
  }

  editorView = new EditorView(editorContainer.value, {
    state,
    dispatchTransaction(transaction) {
      if (!editorView) return
      
      const newState = editorView.state.apply(transaction)
      editorView.updateState(newState)
      
      if (transaction.docChanged && !props.collaborationMode) {
        const content = getDocumentContent()
        emit('update:modelValue', content)
        emit('change', content)
      }
    }
  })

  if (!props.collaborationMode && props.modelValue) {
    updateContent(props.modelValue)
  }
}

const createStandardState = () => {
  const plugins = [
    history(),
    keymap({ 'Mod-z': undo, 'Mod-y': redo }),
    keymap(baseKeymap),
    menuBar({
      floating: false,
      content: buildMenuItems(schema).fullMenu
    })
  ]

  return EditorState.create({
    schema,
    plugins
  })
}

const createCollaborativeState = () => {
  if (!ydoc) throw new Error('Y.Doc not initialized')
  
  const yXmlFragment = ydoc.getXmlFragment('prosemirror')
  
  const plugins = [
    ySyncPlugin(yXmlFragment),
    yCursorPlugin(awareness!),
    yUndoPlugin(),
    keymap({ 'Mod-z': yUndo, 'Mod-y': yRedo }),
    keymap(baseKeymap),
    menuBar({
      floating: false,
      content: buildMenuItems(schema).fullMenu
    })
  ]

  return EditorState.create({
    schema,
    plugins
  })
}

const initCollaboration = async () => {
  if (!props.contentId || !props.userId) {
    console.warn('协作模式需要 contentId 和 userId')
    return
  }

  try {
    ydoc = new Y.Doc()
    
    if (props.collaborationConfig?.websocketUrl) {
      provider = new WebsocketProvider(
        props.collaborationConfig.websocketUrl,
        `content-${props.contentId}`,
        ydoc
      )
    } else {
      provider = new WebrtcProvider(
        `content-${props.contentId}`,
        ydoc,
        {
          signaling: props.collaborationConfig?.webrtcSignaling || ['ws://localhost:4001/signaling']
        }
      )
    }

    awareness = provider.awareness
    awareness.setLocalStateField('user', {
      name: props.userName || `用户${props.userId}`,
      userId: props.userId,
      color: generateUserColor(props.userId)
    })

    awareness.on('change', () => {
      const states = Array.from(awareness!.getStates().values())
      collaborators.value = states
        .filter(state => state.user && state.user.userId !== props.userId)
        .map(state => state.user)
      
      emit('collaborators-updated', collaborators.value)
    })

    try {
      (provider as any).on('status', (event: any) => {
        connectionStatus.value = event.status
        if (event.status === 'connected') {
          syncStatus.value = '已同步'
        } else if (event.status === 'connecting') {
          syncStatus.value = '同步中...'
        } else {
          syncStatus.value = '同步失败'
        }
      })
    } catch (error) {
      console.warn('无法监听连接状态:', error)
    }

    collaborationEnabled.value = true
    emit('collaboration-changed', true)
    
  } catch (error) {
    console.error('协作初始化失败:', error)
    collaborationEnabled.value = false
  }
}

const cleanupCollaboration = (shouldEmit = true) => {
  if (provider) {
    provider.destroy()
    provider = null
  }
  if (ydoc) {
    ydoc.destroy()
    ydoc = null
  }
  awareness = null
  collaborationEnabled.value = false
  collaborators.value = []
  if (shouldEmit) {
    emit('collaboration-changed', false)
  }
}

const toggleCollaboration = async () => {
  if (collaborationEnabled.value) {
    cleanupCollaboration()
    await initEditor()
  } else {
    await enableCollaboration()
  }
}

const enableCollaboration = async () => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
  
  await initCollaboration()
  await initEditor()
}

const getDocumentContent = (): string => {
  if (!editorView) return ''
  
  const serializer = DOMSerializer.fromSchema(schema)
  const fragment = serializer.serializeFragment(editorView.state.doc.content)
  const div = document.createElement('div')
  div.appendChild(fragment)
  return div.innerHTML
}

const updateContent = (content: string) => {
  if (!editorView || !content || props.collaborationMode) return
  
  try {
    const parser = DOMParser.fromSchema(schema)
    const div = document.createElement('div')
    div.innerHTML = content
    const doc = parser.parse(div)
    
    const newState = EditorState.create({
      schema,
      doc,
      plugins: editorView.state.plugins
    })
    
    editorView.updateState(newState)
  } catch (error) {
    console.error('更新内容失败:', error)
  }
}

const generateUserColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return colors[Math.abs(hash) % colors.length]
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

const getConnectionStatusText = (): string => {
  switch (connectionStatus.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    case 'disconnected': return '已断开'
    default: return '未知状态'
  }
}

const handleContentClick = () => {
  if (editorView && !editorView.hasFocus()) {
    editorView.focus()
  }
}

watch(() => props.modelValue, (newValue) => {
  if (newValue !== getDocumentContent()) {
    updateContent(newValue || '')
  }
})

watch(() => props.collaborationMode, async (newMode) => {
  if (newMode && !collaborationEnabled.value) {
    await enableCollaboration()
  } else if (!newMode && collaborationEnabled.value) {
    cleanupCollaboration()
    await initEditor()
  }
})

onMounted(() => {
  initEditor()
})

onUnmounted(() => {
  if (editorView) {
    editorView.destroy()
  }
  cleanupCollaboration(false)
})


defineExpose({
  focus: () => editorView?.focus(),
  getContent: getDocumentContent,
  updateContent
})
</script>

<style scoped>
.unified-editor {
  border: 1px solid #d9dde3;
  border-radius: 8px;
  background: #f2f4f7;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 协作状态栏样式 */
.collaboration-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 13px;
  flex-shrink: 0;
}

.status-indicators {
  display: flex;
  align-items: center;
  gap: 16px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.connection-status.connected {
  color: #28a745;
}

.connection-status.connecting {
  color: #ffc107;
}

.connection-status.disconnected {
  color: #dc3545;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.collaborators-count {
  color: #6c757d;
}

.collaborators-list {
  display: flex;
  gap: 6px;
}

.collaborator-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.collaboration-controls {
  display: flex;
  gap: 8px;
}

/* 编辑器菜单样式（作用于 ProseMirror 原生节点） */
:global(.ProseMirror-menubar-wrapper) {
  flex-shrink: 0;
  height: 40px;
  background: #eceff3;
  border-bottom: 1px solid #d9dde3;
  display: flex;
  align-items: center;
  padding: 0 18px;
  box-sizing: border-box;
}

:global(.ProseMirror-menubar) {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 15px;
  height: 100%;
  width: 100%;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
}

:global(.ProseMirror-menubar .ProseMirror-menu-group) {
  display: inline-flex !important;
  align-items: center !important;
  gap: 15px;
}

:global(.ProseMirror-menubar .ProseMirror-menu-group:last-child) {
  margin-right: 0;
}

:global(.ProseMirror-menubar .ProseMirror-menuitem) {
  display: inline-flex !important;
  align-items: center !important;
}

:global(.ProseMirror-menubar button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #2d3748;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

:global(.ProseMirror-menubar button:hover) {
  background: #e4f0ff;
  border-color: rgba(99, 102, 241, 0.3);
}

:global(.ProseMirror-menubar button:active) {
  transform: none;
}

:global(.ProseMirror-menubar button:focus-visible) {
  outline: 2px solid rgba(99, 102, 241, 0.65);
  outline-offset: 2px;
}

:global(.ProseMirror-menu-active button) {
  background: #fff4c2;
  border-color: rgba(234, 179, 8, 0.4);
}

.editor-content {
  flex: 1;
  min-height: 300px;
  padding: 20px 24px;
  background: #f7f9fc;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 0;
}

.editor-content::-webkit-scrollbar {
  width: 8px;
}

.editor-content::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 999px;
}

.editor-content :deep(.ProseMirror) {
  max-width: 840px;
  margin: 0 auto;
  padding: 28px 36px 48px;
  background: #fcfcfd;
  border-radius: 12px;
  box-shadow: none;
  outline: none;
  line-height: 1.65;
  font-size: 15px;
  color: #1f2937;
  white-space: pre-wrap;
  transition: box-shadow 0.2s ease;
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}

.editor-content :deep(.ProseMirror-focused) {
  box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.35);
}

.editor-content :deep(.ProseMirror p) {
  margin: 0 0 14px 0;
}

.editor-content :deep(.ProseMirror p:last-child) {
  margin-bottom: 0;
}

/* 底部工具栏样式 */
.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  font-size: 13px;
  flex-shrink: 0;
}

.editor-info {
  color: #6c757d;
}

.sync-status {
  font-weight: 500;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-collaboration {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.btn-collaboration:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-collaboration.active {
  background: #28a745;
  border-color: #28a745;
}

.btn-outline {
  background: transparent;
  color: #007bff;
  border-color: #007bff;
}

.btn-outline:hover {
  background: #007bff;
  color: white;
}

.icon {
  font-size: 14px;
}
</style>
