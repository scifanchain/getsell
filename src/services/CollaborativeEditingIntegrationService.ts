import * as Y from 'yjs'
import { YjsCollaborationService } from './YjsCollaborationService'
import { EventEmitter } from 'events'

export interface CollaborationConfig {
  contentId: string
  userId: string
  userName: string
  websocketUrl?: string
  webrtcSignaling?: string[]
  maxConnections?: number
}

export interface CollaborationState {
  isConnected: boolean
  collaborators: Array<{
    userId: string
    name: string
    color: string
    lastSeen: Date
  }>
  documentVersion: number
  lastSync: Date | null
}

/**
 * 协同编辑集成服务
 * 负责协调 Yjs 网络层和本地数据持久化
 */
export class CollaborativeEditingIntegrationService extends EventEmitter {
  private yjsService: YjsCollaborationService
  private activeConnections = new Map<string, any>()
  private collaborationConfigs = new Map<string, CollaborationConfig>()
  private documentStates = new Map<string, CollaborationState>()

  constructor(yjsService: YjsCollaborationService) {
    super()
    this.yjsService = yjsService
  }

  /**
   * 初始化协同编辑会话
   */
  async initializeCollaboration(config: CollaborationConfig): Promise<{
    ydoc: Y.Doc
    yxml: Y.XmlFragment
    state: CollaborationState
  }> {
    try {
      // 获取或创建 Yjs 文档
      const ydoc = await this.yjsService.getDocument(config.contentId, config.userId)
      const yxml = ydoc.getXmlFragment('prosemirror')

      // 设置文档更新监听
      this.setupDocumentUpdateHandlers(ydoc, config.contentId, config.userId)

      // 保存配置
      this.collaborationConfigs.set(config.contentId, config)

      // 初始化协作状态
      const state: CollaborationState = {
        isConnected: false,
        collaborators: [],
        documentVersion: 1,
        lastSync: null
      }
      this.documentStates.set(config.contentId, state)

      // 启动协同会话
      const peerId = `peer-${config.userId}-${Date.now()}`
      await this.yjsService.startCollaborationSession(
        config.contentId,
        config.userId,
        peerId,
        'edit'
      )

      // 发出初始化完成事件
      this.emit('collaboration-initialized', {
        contentId: config.contentId,
        state
      })

      return { ydoc, yxml, state }

    } catch (error: any) {
      console.error('Failed to initialize collaboration:', error)
      throw new Error(`协同编辑初始化失败: ${error.message}`)
    }
  }

  /**
   * 设置文档更新处理器
   */
  private setupDocumentUpdateHandlers(ydoc: Y.Doc, contentId: string, userId: string): void {
    // 监听文档更新
    ydoc.on('update', async (update: Uint8Array, origin: any) => {
      // 只处理本地产生的更新（避免循环）
      if (origin !== 'remote') {
        try {
          // 更新文档版本
          const state = this.documentStates.get(contentId)
          if (state) {
            state.documentVersion++
            state.lastSync = new Date()
          }
          
          // 这里可以添加额外的更新处理逻辑
          this.emit('document-updated', {
            contentId,
            userId,
            updateSize: update.length
          })
        } catch (error) {
          console.error('Failed to handle document update:', error)
        }
      }
    })

    // 监听文档销毁
    ydoc.on('destroy', () => {
      this.cleanup(contentId)
    })
  }

  /**
   * 连接网络提供者
   */
  async connectNetworkProviders(config: CollaborationConfig, ydoc: Y.Doc): Promise<{
    webrtcProvider?: any
    hocuspocusProvider?: any
    awareness?: any
  }> {
    try {
      const roomName = `gestell-${config.contentId}`
      const providers: any = {}

      // 动态导入网络提供者（避免 SSR 问题）
      const [WebrtcProvider, HocuspocusProvider, Awareness] = await Promise.all([
        import('y-webrtc').then(m => m.WebrtcProvider),
        import('@hocuspocus/provider').then(m => m.HocuspocusProvider),
        import('y-protocols/awareness').then(m => m.Awareness)
      ])

      // 创建 Awareness 实例
      const awareness = new Awareness(ydoc)
      
      // 设置用户信息
      awareness.setLocalStateField('user', {
        id: config.userId,
        name: config.userName,
        color: this.generateUserColor(config.userId)
      })

      // WebRTC 提供者
      if (config.webrtcSignaling) {
        providers.webrtcProvider = new WebrtcProvider(roomName, ydoc, {
          signaling: config.webrtcSignaling,
          maxConns: config.maxConnections || 10,
          filterBcConns: true,
          awareness
        })

        // 监听连接状态
        providers.webrtcProvider.on('status', (event: any) => {
          this.updateConnectionStatus(config.contentId, event.status === 'connected')
        })

        // 监听协作者变化
        providers.webrtcProvider.on('peers', () => {
          this.updateCollaborators(config.contentId, awareness)
        })
      }

      // Hocuspocus 提供者（生产环境推荐）
      if (config.websocketUrl) {
        providers.hocuspocusProvider = new HocuspocusProvider({
          url: config.websocketUrl,
          name: roomName,
          document: ydoc,
        })

        providers.hocuspocusProvider.on('status', ({ status }: any) => {
          this.updateConnectionStatus(config.contentId, status === 'connected')
        })
      }

      providers.awareness = awareness

      // 保存连接
      this.activeConnections.set(config.contentId, providers)

      return providers

    } catch (error: any) {
      console.error('Failed to connect network providers:', error)
      throw new Error(`网络连接失败: ${error.message}`)
    }
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(contentId: string, isConnected: boolean): void {
    const state = this.documentStates.get(contentId)
    if (state) {
      state.isConnected = isConnected
      state.lastSync = isConnected ? new Date() : state.lastSync
      this.emit('connection-status-changed', { contentId, isConnected, state })
    }
  }

  /**
   * 更新协作者列表
   */
  private updateCollaborators(contentId: string, awareness: any): void {
    const state = this.documentStates.get(contentId)
    if (!state) return

    const collaborators: any[] = []
    
    awareness.getStates().forEach((awarenessState: any, clientId: number) => {
      if (awarenessState.user && clientId !== awareness.clientID) {
        collaborators.push({
          userId: awarenessState.user.id,
          name: awarenessState.user.name,
          color: awarenessState.user.color,
          lastSeen: new Date()
        })
      }
    })

    state.collaborators = collaborators
    this.emit('collaborators-updated', { contentId, collaborators, state })
  }

  /**
   * 生成用户颜色
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  /**
   * 断开协同编辑
   */
  async disconnectCollaboration(contentId: string): Promise<void> {
    try {
      const connections = this.activeConnections.get(contentId)
      if (connections) {
        // 断开网络提供者
        if (connections.webrtcProvider) {
          connections.webrtcProvider.destroy()
        }
        if (connections.hocuspocusProvider) {
          connections.hocuspocusProvider.destroy()
        }
      }

      // 清理状态
      this.cleanup(contentId)

      this.emit('collaboration-disconnected', { contentId })

    } catch (error: any) {
      console.error('Failed to disconnect collaboration:', error)
      throw new Error(`断开协同编辑失败: ${error.message}`)
    }
  }

  /**
   * 获取协作状态
   */
  getCollaborationState(contentId: string): CollaborationState | null {
    return this.documentStates.get(contentId) || null
  }

  /**
   * 获取活跃的协同会话列表
   */
  getActiveCollaborations(): Array<{ contentId: string; state: CollaborationState }> {
    const active: Array<{ contentId: string; state: CollaborationState }> = []
    
    this.documentStates.forEach((state, contentId) => {
      if (state.isConnected || state.collaborators.length > 0) {
        active.push({ contentId, state })
      }
    })

    return active
  }

  /**
   * 强制同步文档
   */
  async forceSync(contentId: string): Promise<void> {
    const connections = this.activeConnections.get(contentId)
    if (connections?.hocuspocusProvider) {
      // 强制 Hocuspocus 重新连接
      connections.hocuspocusProvider.disconnect()
      connections.hocuspocusProvider.connect()
    }
  }

  /**
   * 清理资源
   */
  private cleanup(contentId: string): void {
    this.activeConnections.delete(contentId)
    this.collaborationConfigs.delete(contentId)
    this.documentStates.delete(contentId)
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    // 断开所有连接
    this.activeConnections.forEach((connections, contentId) => {
      this.disconnectCollaboration(contentId).catch(console.error)
    })

    // 清理所有状态
    this.activeConnections.clear()
    this.collaborationConfigs.clear()
    this.documentStates.clear()

    // 移除所有事件监听器
    this.removeAllListeners()
  }
}