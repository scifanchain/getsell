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
    <div class="editor-footer" v-if="!readonly && collaborationMode">
      <div class="editor-info">
        <span class="sync-status">
          {{ syncStatus }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Schema, DOMParser, DOMSerializer, Node as ProseMirrorNode } from 'prosemirror-model'
import { schema as basicSchema } from 'prosemirror-schema-basic'
import { addListNodes } from 'prosemirror-schema-list'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { history, undo, redo } from 'prosemirror-history'
import { menuBar } from 'prosemirror-menu'
import { buildMenuItems } from '../utils/prosemirror-menu'

// Yjs 相关导入 (仅在协作模式下使用)
import * as Y from 'yjs'
import { ySyncPlugin, yCursorPlugin, yUndoPlugin, undo as yUndo, redo as yRedo, prosemirrorJSONToYXmlFragment } from 'y-prosemirror'
import { WebrtcProvider } from 'y-webrtc'
import { HocuspocusProvider } from '@hocuspocus/provider'
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
let provider: WebrtcProvider | HocuspocusProvider | null = null
let awareness: Awareness | null = null

const initEditor = async () => {
  if (!editorContainer.value) return

  schema = new Schema({
    nodes: addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block'),
    marks: basicSchema.spec.marks
  })

  let state: EditorState

  // 🔥 修复：如果 props.collaborationMode 为 true，无论 collaborationEnabled 状态如何都应该初始化协作
  if (props.collaborationMode) {
    if (!collaborationEnabled.value) {
      await initCollaboration()
    }
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
      
      if (transaction.docChanged) {
        const content = getDocumentContent()
        
        // 触发 change 事件（父组件使用）
        emit('change', content)
        
        // 非协作模式下触发 v-model 更新
        if (!props.collaborationMode) {
          emit('update:modelValue', content)
        }
      }
    }
  })

  // 初始内容已经在 createStandardState 中加载
  console.log('🚀 编辑器初始化完成')
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

  // 从 props.modelValue 加载初始内容
  let doc: ProseMirrorNode
  if (props.modelValue && props.modelValue.trim()) {
    try {
      const jsonContent = JSON.parse(props.modelValue)
      doc = ProseMirrorNode.fromJSON(schema, jsonContent)
    } catch (error) {
      console.error('❌ 解析初始内容失败:', error)
      doc = schema.nodeFromJSON({
        type: 'doc',
        content: [{ type: 'paragraph' }]
      })
    }
  } else {
    doc = schema.nodeFromJSON({
      type: 'doc',
      content: [{ type: 'paragraph' }]
    })
  }

  return EditorState.create({
    schema,
    doc,
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
    console.warn('⚠️ 协作模式需要 contentId 和 userId', {
      contentId: props.contentId,
      userId: props.userId
    })
    return
  }

  try {
    console.log('🚀 初始化协作模式', {
      contentId: props.contentId,
      userId: props.userId,
      roomName: `content-${props.contentId}`
    })

    // 创建 Yjs 文档
    ydoc = new Y.Doc()
    const yXmlFragment = ydoc.getXmlFragment('prosemirror')
    
    // 创建 Provider（Hocuspocus WebSocket 或 WebRTC）
    if (props.collaborationConfig?.websocketUrl) {
      const roomName = `content-${props.contentId}`
      console.log('📡 创建 Hocuspocus WebSocket 连接到房间:', roomName)
      provider = new HocuspocusProvider({
        url: props.collaborationConfig.websocketUrl,
        name: roomName,
        document: ydoc,
        // 可选：传递用户信息用于认证
        // token: 'your-jwt-token',
      })
    } else {
      provider = new WebrtcProvider(
        `content-${props.contentId}`,
        ydoc,
        {
          signaling: props.collaborationConfig?.webrtcSignaling || ['ws://localhost:4001/signaling']
        }
      )
    }

    // 设置用户信息和协作者监听
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

    // 监听连接状态
    try {
      (provider as any).on('status', (event: any) => {
        connectionStatus.value = event.status
        
        if (event.status === 'connected') {
          syncStatus.value = '已同步'
          
          // 连接成功后，检查服务器内容是否为空
          // 只在服务器为空时才从 SQLite 加载初始内容（避免重复）
          setTimeout(() => {
            const fragmentLength = yXmlFragment.length
            
            if (fragmentLength === 0 && props.modelValue && props.modelValue.trim()) {
              console.log('📥 从 SQLite 加载初始内容到协作文档')
              
              try {
                const jsonContent = JSON.parse(props.modelValue)
                ydoc!.transact(() => {
                  prosemirrorJSONToYXmlFragment(schema, jsonContent, yXmlFragment)
                })
                console.log('✅ 初始内容已同步到服务器')
              } catch (error) {
                console.error('❌ 加载初始内容失败:', error)
              }
            }
          }, 100) // 等待同步完成
          
        } else if (event.status === 'connecting') {
          syncStatus.value = '同步中...'
        } else {
          syncStatus.value = '同步失败'
        }
      })
    } catch (error) {
      console.warn('⚠️ 无法监听连接状态:', error)
    }

    // Hocuspocus Provider 错误和断开监听
    if (provider && provider instanceof HocuspocusProvider) {
      provider.on('connect', () => {
        console.log('✅ Hocuspocus 连接成功')
      })
      
      provider.on('disconnect', ({ event }: any) => {
        console.log('🔌 Hocuspocus 连接断开（将自动重连）:', event)
      })
      
      provider.on('status', ({ status }: any) => {
        console.log('📊 Hocuspocus 状态:', status)
      })
      
      provider.on('synced', ({ state }: any) => {
        console.log('✅ Hocuspocus 同步完成:', state)
      })
    }

    collaborationEnabled.value = true
    emit('collaboration-changed', true)
    console.log('✅ 协作模式初始化完成')
    
  } catch (error) {
    console.error('❌ 协作初始化失败:', error)
    collaborationEnabled.value = false
  }
}

const cleanupCollaboration = (shouldEmit = true) => {
  console.log('🧹 清理协作资源', {
    hasProvider: !!provider,
    hasYdoc: !!ydoc,
    contentId: props.contentId
  })
  
  if (provider) {
    console.log('🔌 销毁 WebSocket Provider，房间:', `content-${props.contentId}`)
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
  console.log('✅ 协作资源清理完成')
}

const getDocumentContent = (): string => {
  if (!editorView) return ''
  
  // 将 ProseMirror 文档序列化为 JSON 格式
  const json = editorView.state.doc.toJSON()
  return JSON.stringify(json)
}

const updateContent = (content: string) => {
  if (!editorView || props.collaborationMode) return
  
  try {
    let doc: ProseMirrorNode
    
    // 如果内容为空或仅有空格，创建空文档
    if (!content || !content.trim()) {
      console.log('📄 内容为空，创建空文档')
      doc = schema.nodeFromJSON({
        type: 'doc',
        content: [{
          type: 'paragraph'
        }]
      })
    } else {
      console.log('📄 解析 JSON 内容，长度:', content.length)
      // 解析 JSON 格式内容
      const jsonContent = JSON.parse(content)
      doc = ProseMirrorNode.fromJSON(schema, jsonContent)
      console.log('✅ JSON 解析成功')
    }
    
    const newState = EditorState.create({
      schema,
      doc,
      plugins: editorView.state.plugins
    })
    
    editorView.updateState(newState)
    console.log('✅ 编辑器状态已更新')
  } catch (error) {
    console.error('❌ 更新内容失败:', error)
    console.error('内容预览:', content?.substring(0, 200))
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

watch(() => props.collaborationMode, async (newMode, oldMode) => {
  console.log('👀 [Editor] collaborationMode 变化:', { 
    oldMode, 
    newMode,
    collaborationEnabled: collaborationEnabled.value 
  })
  
  if (newMode && !collaborationEnabled.value) {
    console.log('🔄 [Editor] 启用协作模式...')
    // 销毁当前编辑器
    if (editorView) {
      editorView.destroy()
      editorView = null
    }
    // 初始化协作
    await initCollaboration()
    // 重新创建编辑器
    await initEditor()
  } else if (!newMode && collaborationEnabled.value) {
    console.log('🔄 [Editor] 禁用协作模式...')
    cleanupCollaboration()
    await initEditor()
  }
})

onMounted(() => {
  console.log('🎬 [Editor] 组件挂载, props:', {
    contentId: props.contentId,
    userId: props.userId,
    collaborationMode: props.collaborationMode
  })
  initEditor()
})

onUnmounted(() => {
  console.log('💀 [Editor] 组件卸载, contentId:', props.contentId)
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
/* ============================================
   编辑器容器 - 主布局
   ============================================ */
.unified-editor {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
}

/* ============================================
   协作状态栏
   ============================================ */
.collaboration-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  z-index: 10;
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
  color: #10b981;
}

.connection-status.connecting {
  color: #f59e0b;
}

.connection-status.disconnected {
  color: #ef4444;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.collaborators-count {
  color: #6b7280;
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
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* ============================================
   ProseMirror 菜单项按钮样式 - 全局
   ============================================ */
:global(.unified-editor .ProseMirror-menubar .ProseMirror-menu-group) {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px;
  margin: 0 8px 0 0 !important;
  padding: 0 !important;
}

:global(.unified-editor .ProseMirror-menubar .ProseMirror-menuitem) {
  display: inline-flex !important;
  margin: 0 !important;
  padding: 0 !important;
  position: static !important;
}

/* 菜单项按钮样式 - 注意是 div，不是 button */
:global(.unified-editor .ProseMirror-menuitem > div) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px;
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  margin: 0 !important;
  border: 1px solid #d1d5db !important;
  border-radius: 6px;
  background: linear-gradient(to bottom, #ffffff, #f9fafb);
  color: #1f2937;
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  position: static !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  user-select: none;
}

:global(.unified-editor .ProseMirror-menuitem > div:hover) {
  background: linear-gradient(to bottom, #3b82f6, #2563eb);
  border-color: #2563eb !important;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
}

:global(.unified-editor .ProseMirror-menuitem > div:active) {
  transform: translateY(0);
  background: linear-gradient(to bottom, #2563eb, #1d4ed8);
  box-shadow: 0 1px 3px rgba(37, 99, 235, 0.4) inset;
}

:global(.unified-editor .ProseMirror-menu-active > div) {
  background: linear-gradient(to bottom, #3b82f6, #2563eb) !important;
  border-color: #1d4ed8 !important;
  color: white;
  box-shadow: 0 1px 4px rgba(29, 78, 216, 0.4);
}

:global(.unified-editor .ProseMirror-menu-disabled > div) {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* ============================================
   编辑器内容区域
   ============================================ */
.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: #f9fafb;
  min-height: 0;
  z-index: 1;
  box-sizing: border-box;
}

/* ============================================
   ProseMirror 菜单栏包装器 - 全局样式
   ============================================ */
:global(.unified-editor .ProseMirror-menubar-wrapper) {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background: #ffffff;
  overflow: hidden;
  box-sizing: border-box;
}

:global(.unified-editor .ProseMirror-menubar) {
  flex-shrink: 0;
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 6px;
  margin: 0 !important;
  padding: 8px 16px !important;
  border: none !important;
  border-bottom: 1px solid #e5e7eb !important;
  background: #e9eaf0 !important;
  position: relative !important;
  z-index: 20 !important;
  box-sizing: border-box;
}

/* ProseMirror 编辑区 - menuBar插件会自动创建wrapper */
:global(.unified-editor .ProseMirror) {
  flex: 1 !important;
  position: relative !important;
  display: block !important;
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  min-height: 0 !important;
  height: auto !important;
  padding: 40px 20px !important;
  margin: 0 auto !important;
  background: #dfe7e3 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  outline: none !important;
  font-size: 16px !important;
  line-height: 1.75 !important;
  color: #1f2937 !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  box-sizing: border-box !important;
}

/* 滚动条样式 */
:global(.unified-editor .ProseMirror)::-webkit-scrollbar {
  width: 12px;
}

:global(.unified-editor .ProseMirror)::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-left: 1px solid #e5e7eb;
}

:global(.unified-editor .ProseMirror)::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 6px;
  border: 3px solid #f3f4f6;
  transition: background 0.2s ease;
}

:global(.unified-editor .ProseMirror)::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.editor-content :deep(.ProseMirror-focused) {
  box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.editor-content :deep(.ProseMirror p) {
  margin: 0 0 1em 0;
  min-height: 1em;
}

.editor-content :deep(.ProseMirror p:last-child) {
  margin-bottom: 0;
}

.editor-content :deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: 700;
  margin: 0.67em 0;
  line-height: 1.2;
}

.editor-content :deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0.83em 0;
  line-height: 1.3;
}

.editor-content :deep(.ProseMirror h3) {
  font-size: 1.17em;
  font-weight: 600;
  margin: 1em 0;
  line-height: 1.4;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.editor-content :deep(.ProseMirror li) {
  margin: 0.25em 0;
}

.editor-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid #d1d5db;
  padding-left: 1em;
  margin: 1em 0;
  color: #6b7280;
  font-style: italic;
}

.editor-content :deep(.ProseMirror code) {
  background: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.editor-content :deep(.ProseMirror pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

.editor-content :deep(.ProseMirror pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

/* ============================================
   底部工具栏
   ============================================ */
.editor-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  font-size: 13px;
  z-index: 10;
}

.editor-info {
  color: #6b7280;
}

.sync-status {
  font-weight: 500;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

/* ============================================
   按钮样式
   ============================================ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  white-space: nowrap;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn:active {
  transform: translateY(0);
}

.btn-outline {
  background: white;
  color: #3b82f6;
  border-color: #3b82f6;
}

.btn-outline:hover {
  background: #3b82f6;
  color: white;
}

.icon {
  font-size: 14px;
  line-height: 1;
}
</style>
