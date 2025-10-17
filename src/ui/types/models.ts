/**
 * 应用数据模型类型定义
 */

export interface Author {
  id: string
  username: string
  displayName?: string
  email: string
  bio?: string
  avatarUrl?: string
  publicKey?: string
  walletAddress?: string
  createdAt: string
  updatedAt: string
}

export interface Work {
  id: string
  title: string
  description?: string
  authorId: string
  genre?: string
  collaborationMode?: string
  createdAt: string
  updatedAt: string
  chapters?: Chapter[]
}

export interface Chapter {
  id: string
  title: string
  content?: string
  workId: string        // 作品ID
  orderIndex: number    // 排序索引
  parentId?: string     // 父章节ID
  subtitle?: string     // 副标题
  description?: string  // 描述
  type?: 'chapter' | 'volume' | 'section'  // 章节类型
  authorId?: string     // 作者ID
  characterCount?: number    // 字符数
  contentCount?: number      // 内容块数量
  childChapterCount?: number // 子章节数量
  level: number         // 章节层级 (1-3, 最多3层)
  createdAt: string
  updatedAt: string
}

export interface Content {
  id: string
  title: string
  type: 'text' | 'dialogue' | 'scene' | 'note'
  content?: string
  workId: string
  chapterId?: string     // 可选，如果为空则为根目录内容
  orderIndex: number
  authorId?: string
  wordCount?: number
  characterCount?: number
  status?: 'draft' | 'published' | 'archived'
  version?: number
  createdAt: string
  updatedAt: string
}

export interface SystemStats {
  authors: number
  works: number
  chapters: number
  storage: {
    used: number
    total: number
  }
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 创建类型
export interface CreateAuthorData {
  username: string
  email: string
  password: string
  displayName?: string
  bio?: string
}

export interface CreateWorkData {
  title: string
  description?: string
  authorId: string
  genre?: string
  collaborationMode?: string
}

export interface CreateChapterData {
  title: string
  content?: string
  workId: string       // 作品ID
  orderIndex: number   // 排序索引
  authorId?: string    // 作者ID
  parentId?: string    // 父章节ID
  subtitle?: string    // 副标题
  description?: string // 描述
  type?: 'chapter' | 'volume' | 'section'  // 章节类型
}

// 更新类型
export interface UpdateWorkData {
  title?: string
  description?: string
  genre?: string
  collaborationMode?: string
}

export interface UpdateChapterData {
  title?: string
  content?: string
  orderIndex?: number  // 排序索引
  subtitle?: string    // 副标题
  description?: string // 描述
  type?: 'chapter' | 'volume' | 'section'  // 章节类型
}