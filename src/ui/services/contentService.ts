import { contentApi } from './api'
import type { Content } from '../types/models'

export type ContentFormat = 'prosemirror' | 'markdown' | 'plain'

export interface WritingContent {
  id: string
  title: string
  workId: string
  chapterId?: string
  orderIndex: number
  content: string
  format: ContentFormat
  type: Content['type']
  authorId?: string
  wordCount?: number
  characterCount?: number
  status?: 'draft' | 'published' | 'archived'
  version?: number
  lastEditedAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateWritingContentPayload {
  authorId: string
  workId: string
  chapterId?: string
  title?: string
  content: string
  format?: ContentFormat
}

export interface UpdateWritingContentPayload {
  title?: string
  content?: string
  chapterId?: string
  orderIndex?: number
  format?: ContentFormat
}

const normalizeContent = (raw: any): WritingContent => {
  if (!raw) {
    throw new Error('无法解析内容数据')
  }

  const format: ContentFormat =
    raw.format || raw.type || 'prosemirror'

  const allowedTypes: Array<Content['type']> = ['text', 'dialogue', 'scene', 'note']
  const normalizedType = typeof raw.type === 'string' && (allowedTypes as string[]).includes(raw.type)
    ? (raw.type as Content['type'])
    : 'text'

  return {
    id: raw.id,
    title: raw.title ?? '未命名内容',
    workId: raw.workId,
    chapterId: raw.chapterId ?? undefined,
    orderIndex: raw.orderIndex ?? 0,
    content: raw.content ?? raw.contentJson ?? raw.contentHtml ?? '',
    format,
    type: normalizedType,
    authorId: raw.authorId,
    wordCount: raw.wordCount,
    characterCount: raw.characterCount,
    status: raw.status,
    version: raw.version ?? raw.versionNumber,
    lastEditedAt: raw.lastEditedAt,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(Number(raw.createdAt || Date.now())).toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(Number(raw.updatedAt || Date.now())).toISOString()
  }
}

export const contentService = {
  async fetchByWork(workId: string, userId?: string): Promise<WritingContent[]> {
    const result = await contentApi.getByWork(workId, userId)
    const contents = Array.isArray(result?.contents) ? result.contents : result
    if (!Array.isArray(contents)) {
      return []
    }
    return contents.map(normalizeContent)
  },

  async fetchByChapter(chapterId: string, userId: string): Promise<WritingContent[]> {
    const contents = await contentApi.getByChapter(chapterId, userId)
    if (!Array.isArray(contents)) {
      return []
    }
    return contents.map(normalizeContent)
  },

  async fetchContent(contentId: string, userId: string): Promise<WritingContent | null> {
    const content = await contentApi.get(contentId, userId)
    if (!content) {
      return null
    }
    return normalizeContent(content)
  },

  async createContent(payload: CreateWritingContentPayload): Promise<WritingContent> {
    const { authorId, workId, chapterId, content, title, format = 'prosemirror' } = payload
    const response = await contentApi.create(authorId, {
      workId,
      chapterId,
      content,
      format,
      title
    })
    return normalizeContent(response)
  },

  async updateContent(contentId: string, userId: string, payload: UpdateWritingContentPayload): Promise<WritingContent> {
    const response = await contentApi.update(contentId, userId, payload)
    return normalizeContent(response)
  },

  async deleteContent(contentId: string, userId: string): Promise<void> {
    await contentApi.delete(contentId, userId)
  },

  async reorderContents(userId: string, items: Array<{ id: string; chapterId?: string; orderIndex: number }>): Promise<void> {
    if (!items.length) return
    await contentApi.reorderContents(userId, items)
  }
}
