import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { WebrtcProvider } from 'y-webrtc'
import { RepositoryContainer } from '../data/RepositoryContainer'
import { ulid } from 'ulid'
import { getCurrentTimestamp } from '../utils/timestamp'

/**
 * Yjs 协同编辑核心服务
 * 负责管理 Yjs 文档的生命周期、持久化和网络同步
 */
export interface CollaborationConfig {
  websocketUrl?: string
  webrtcSignaling?: string[]
  maxConnections?: number
  autoSave?: boolean
  saveInterval?: number
}

export interface CollaborationSession {
  documentId: string
  userId: string
  peerId: string
  permissions: 'read' | 'edit' | 'comment'
  status: 'active' | 'idle' | 'disconnected'
}

export interface YjsDocumentInfo {
  id: string
  contentId: string
  workId: string
  ydoc: Y.Doc
  isActive: boolean
  sessions: CollaborationSession[]
  lastSyncAt?: Date
}

export class YjsCollaborationService {
  private documents = new Map<string, YjsDocumentInfo>()
  private providers = new Map<string, (WebsocketProvider | WebrtcProvider)[]>()
  private config: CollaborationConfig
  private repositories: RepositoryContainer

  constructor(repositories: RepositoryContainer, config: CollaborationConfig = {}) {
    this.repositories = repositories
    this.config = {
      websocketUrl: config.websocketUrl || 'ws://localhost:4001/signaling',
      webrtcSignaling: config.webrtcSignaling || ['ws://localhost:4001/signaling'],
      maxConnections: config.maxConnections || 10,
      autoSave: config.autoSave ?? true,
      saveInterval: config.saveInterval || 5000,
      ...config
    }
  }

  /**
   * 获取或创建协同文档
   */
  async getDocument(contentId: string, userId: string): Promise<Y.Doc> {
    let docInfo = this.documents.get(contentId)
    
    if (!docInfo) {
      docInfo = await this.createDocument(contentId, userId)
    }

    // 确保用户有权限访问
    await this.ensureUserAccess(contentId, userId)

    return docInfo.ydoc
  }

  /**
   * 创建新的协同文档
   */
  private async createDocument(contentId: string, userId: string): Promise<YjsDocumentInfo> {
    // 获取内容信息
    const content = await this.repositories.contentRepository.findById(contentId)
    if (!content) {
      throw new Error(`Content ${contentId} not found`)
    }

    // 检查是否已存在协同文档记录
    let collaborativeDoc = await this.findCollaborativeDocument(contentId)
    
    const ydoc = new Y.Doc()
    const docId = collaborativeDoc?.id || ulid()

    // 如果存在已保存的 Yjs 状态，恢复它
    if (collaborativeDoc?.yjsState) {
      Y.applyUpdate(ydoc, new Uint8Array(collaborativeDoc.yjsState))
    } else if (content.contentJson) {
      // 从现有的 ProseMirror JSON 初始化
      await this.initializeFromProseMirrorJson(ydoc, content.contentJson)
    }

    // 创建协同文档记录（如果不存在）
    if (!collaborativeDoc) {
      collaborativeDoc = await this.repositories.collaborationRepository.createCollaborativeDocument({
        id: docId,
        contentId,
        workId: content.workId,
        documentType: 'content',
        yjsState: Buffer.from(Y.encodeStateAsUpdate(ydoc)),
        stateVector: Buffer.from(Y.encodeStateVector(ydoc)),
        maxConnections: this.config.maxConnections!
      })
    }

    const docInfo: YjsDocumentInfo = {
      id: docId,
      contentId,
      workId: content.workId,
      ydoc,
      isActive: true,
      sessions: [],
      lastSyncAt: collaborativeDoc?.lastSyncAt || undefined
    }

    this.documents.set(contentId, docInfo)
    this.setupDocumentEvents(docInfo)
    
    return docInfo
  }

  /**
   * 从 ProseMirror JSON 初始化 Yjs 文档
   */
  private async initializeFromProseMirrorJson(ydoc: Y.Doc, prosemirrorJson: string): Promise<void> {
    try {
      const jsonDoc = JSON.parse(prosemirrorJson)
      // 这里需要将 ProseMirror 文档转换为 Yjs 文档
      // 这个转换逻辑会在集成 y-prosemirror 时实现
      console.log('Converting ProseMirror JSON to Yjs document:', jsonDoc.type)
    } catch (error) {
      console.warn('Failed to parse ProseMirror JSON:', error)
    }
  }

  /**
   * 查找协同文档记录
   */
  private async findCollaborativeDocument(contentId: string) {
    try {
      return await this.repositories.collaborationRepository.findCollaborativeDocument(contentId)
    } catch (error) {
      console.warn('Failed to find collaborative document:', error)
      return null
    }
  }

  /**
   * 设置文档事件监听
   */
  private setupDocumentEvents(docInfo: YjsDocumentInfo): void {
    const { ydoc, id } = docInfo

    // 监听文档更新
    ydoc.on('update', (update: Uint8Array, origin: any) => {
      if (origin !== 'database') {
        this.handleDocumentUpdate(id, update, origin)
      }
    })

    // 设置自动保存
    if (this.config.autoSave) {
      this.setupAutoSave(docInfo)
    }
  }

  /**
   * 处理文档更新
   */
  private async handleDocumentUpdate(documentId: string, update: Uint8Array, origin?: any): Promise<void> {
    try {
      // 保存更新到数据库
      await this.saveUpdate(documentId, update, origin)
      
      // 更新主文档状态
      await this.updateDocumentState(documentId)
    } catch (error) {
      console.error('Failed to handle document update:', error)
    }
  }

  /**
   * 保存 Yjs 更新到数据库
   */
  private async saveUpdate(documentId: string, update: Uint8Array, origin?: any): Promise<void> {
    const updateId = ulid()
    
    await this.repositories.collaborationRepository.createYjsUpdate({
      id: updateId,
      documentId,
      updateData: Buffer.from(update),
      clock: Date.now().toString(), // 简化的逻辑时钟
      origin: typeof origin === 'string' ? origin : 'system',
      size: update.byteLength
    })
  }

  /**
   * 更新文档状态
   */
  private async updateDocumentState(documentId: string): Promise<void> {
    const docInfo = Array.from(this.documents.values())
      .find(doc => doc.id === documentId)
    
    if (!docInfo) return

    const state = Y.encodeStateAsUpdate(docInfo.ydoc)
    const stateVector = Y.encodeStateVector(docInfo.ydoc)

    await this.repositories.collaborationRepository.updateCollaborativeDocument(documentId, {
      yjsState: Buffer.from(state),
      stateVector: Buffer.from(stateVector),
      lastSyncAt: new Date()
    })
  }

  /**
   * 设置自动保存
   */
  private setupAutoSave(docInfo: YjsDocumentInfo): void {
    setInterval(() => {
      this.updateDocumentState(docInfo.id)
    }, this.config.saveInterval!)
  }

  /**
   * 确保用户有访问权限
   */
  private async ensureUserAccess(contentId: string, userId: string): Promise<void> {
    const content = await this.repositories.contentRepository.findById(contentId)
    if (!content) {
      throw new Error('Content not found')
    }

    // 检查用户是否是作者或协作者
    const work = await this.repositories.workRepository.findById(content.workId)
    if (!work) {
      throw new Error('Work not found')
    }

    const hasAccess = work.authorId === userId || 
                     (work.collaborators && work.collaborators.includes(userId))

    if (!hasAccess) {
      throw new Error('Access denied')
    }
  }

  /**
   * 启动协同会话
   */
  async startCollaborationSession(
    contentId: string, 
    userId: string, 
    peerId: string,
    permissions: 'read' | 'edit' | 'comment' = 'edit'
  ): Promise<CollaborationSession> {
    const docInfo = this.documents.get(contentId)
    if (!docInfo) {
      throw new Error('Document not found')
    }

    // 创建会话记录
    const sessionId = ulid()
    await this.repositories.collaborationRepository.createSession({
      id: sessionId,
      documentId: docInfo.id,
      userId,
      peerId,
      sessionType: 'editor',
      permissions
    })

    const session: CollaborationSession = {
      documentId: docInfo.id,
      userId,
      peerId,
      permissions,
      status: 'active'
    }

    docInfo.sessions.push(session)
    return session
  }

  /**
   * 启用网络同步 (WebRTC P2P)
   */
  enableWebRTCSync(contentId: string): void {
    const docInfo = this.documents.get(contentId)
    if (!docInfo) return

    const provider = new WebrtcProvider(contentId, docInfo.ydoc, {
      signaling: this.config.webrtcSignaling!,
      maxConns: this.config.maxConnections!,
      filterBcConns: true
    })

    // 存储 provider 引用
    if (!this.providers.has(contentId)) {
      this.providers.set(contentId, [])
    }
    this.providers.get(contentId)!.push(provider)

    // 监听连接状态
    provider.on('status', (event: any) => {
      console.log(`WebRTC status for ${contentId}:`, event.status)
    })

    provider.on('peers', (event: any) => {
      console.log(`WebRTC peers for ${contentId}:`, event.peers.length)
    })
  }

  /**
   * 启用 WebSocket 备用同步
   */
  enableWebSocketSync(contentId: string): void {
    if (!this.config.websocketUrl) return

    const docInfo = this.documents.get(contentId)
    if (!docInfo) return

    const provider = new WebsocketProvider(
      this.config.websocketUrl,
      contentId,
      docInfo.ydoc
    )

    // 存储 provider 引用
    if (!this.providers.has(contentId)) {
      this.providers.set(contentId, [])
    }
    this.providers.get(contentId)!.push(provider)

    provider.on('status', (event: any) => {
      console.log(`WebSocket status for ${contentId}:`, event.status)
    })
  }

  /**
   * 获取文档统计信息
   */
  async getDocumentStats(contentId: string): Promise<{
    activeSessions: number
    totalUpdates: number
    lastUpdate: Date | null
    documentSize: number
  }> {
    const docInfo = this.documents.get(contentId)
    if (!docInfo) {
      throw new Error('Document not found')
    }

    const stats = await this.repositories.collaborationRepository.getUpdateStats(docInfo.id)

    return {
      activeSessions: docInfo.sessions.filter(s => s.status === 'active').length,
      totalUpdates: stats._count.id || 0,
      lastUpdate: stats._max.createdAt,
      documentSize: Y.encodeStateAsUpdate(docInfo.ydoc).byteLength
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 停止所有 providers
    for (const providers of this.providers.values()) {
      providers.forEach(provider => provider.destroy())
    }
    this.providers.clear()

    // 清理文档
    this.documents.clear()
  }
}