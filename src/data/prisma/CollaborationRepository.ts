import { PrismaClient } from '../../generated/prisma'
import { getCurrentTimestamp } from '../../utils/timestamp'

export interface ICollaborationRepository {
  // CollaborativeDocument 相关方法
  findCollaborativeDocument(contentId: string): Promise<any | null>
  createCollaborativeDocument(data: any): Promise<any>
  updateCollaborativeDocument(id: string, data: any): Promise<any>
  
  // YjsUpdate 相关方法
  createYjsUpdate(data: any): Promise<any>
  getYjsUpdates(documentId: string): Promise<any[]>
  getUpdateStats(documentId: string): Promise<any>
  
  // CollaborativeSession 相关方法
  createSession(data: any): Promise<any>
  updateSession(id: string, data: any): Promise<any>
  getActiveSessions(documentId: string): Promise<any[]>
  endSession(id: string): Promise<void>
}

export class PrismaCollaborationRepository implements ICollaborationRepository {
  constructor(private prisma: PrismaClient) {}

  async findCollaborativeDocument(contentId: string) {
    return await this.prisma.collaborativeDocument.findUnique({
      where: { contentId },
      include: {
        sessions: true,
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })
  }

  async createCollaborativeDocument(data: {
    id: string
    contentId: string
    workId: string
    documentType?: string
    yjsState?: Buffer
    stateVector?: Buffer
    maxConnections?: number
  }) {
    return await this.prisma.collaborativeDocument.create({
      data: {
        ...data,
        documentType: data.documentType || 'content',
        maxConnections: data.maxConnections || 10,
        isActive: true,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
      }
    })
  }

  async updateCollaborativeDocument(id: string, data: {
    yjsState?: Buffer
    stateVector?: Buffer
    lastSyncAt?: Date
    isActive?: boolean
  }) {
    return await this.prisma.collaborativeDocument.update({
      where: { id },
      data: {
        ...data,
        updatedAt: getCurrentTimestamp()
      }
    })
  }

  async createYjsUpdate(data: {
    id: string
    documentId: string
    updateData: Buffer
    clock: string
    origin?: string
    size: number
  }) {
    return await this.prisma.yjsUpdate.create({
      data: {
        ...data,
        applied: true,
        createdAt: getCurrentTimestamp()
      }
    })
  }

  async getYjsUpdates(documentId: string) {
    return await this.prisma.yjsUpdate.findMany({
      where: { documentId },
      orderBy: { createdAt: 'asc' }
    })
  }

  async getUpdateStats(documentId: string) {
    return await this.prisma.yjsUpdate.aggregate({
      where: { documentId },
      _count: { id: true },
      _max: { createdAt: true },
      _sum: { size: true }
    })
  }

  async createSession(data: {
    id: string
    documentId: string
    userId: string
    peerId: string
    sessionType?: string
    permissions?: string
  }) {
    return await this.prisma.collaborativeSession.create({
      data: {
        ...data,
        sessionType: data.sessionType || 'editor',
        status: 'active',
        permissions: data.permissions || 'edit',
        lastHeartbeat: new Date(),
        connectedAt: new Date()
      }
    })
  }

  async updateSession(id: string, data: {
    status?: string
    cursorPosition?: string
    selection?: string
    awareness?: string
    lastHeartbeat?: Date
  }) {
    return await this.prisma.collaborativeSession.update({
      where: { id },
      data
    })
  }

  async getActiveSessions(documentId: string) {
    return await this.prisma.collaborativeSession.findMany({
      where: {
        documentId,
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    })
  }

  async endSession(id: string) {
    await this.prisma.collaborativeSession.update({
      where: { id },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date()
      }
    })
  }

  async cleanupInactiveSessions(timeoutMinutes: number = 30) {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000)
    
    await this.prisma.collaborativeSession.updateMany({
      where: {
        lastHeartbeat: {
          lt: cutoffTime
        },
        status: 'active'
      },
      data: {
        status: 'disconnected',
        disconnectedAt: new Date()
      }
    })
  }
}