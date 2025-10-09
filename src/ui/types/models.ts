/**
 * 应用数据模型类型定义
 */

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  title: string
  description?: string
  authorId: string
  createdAt: string
  updatedAt: string
  chapters?: Chapter[]
}

export interface Chapter {
  id: string
  title: string
  content?: string
  projectId: string     // 兼容旧接口
  workId?: string       // 新接口
  order: number         // 兼容旧接口
  orderIndex?: number   // 新接口
  parentId?: string     // 父章节ID
  subtitle?: string     // 副标题
  description?: string  // 描述
  type?: 'chapter' | 'volume' | 'section'  // 章节类型
  authorId?: string     // 作者ID
  characterCount?: number    // 字符数
  contentCount?: number      // 内容块数量
  childChapterCount?: number // 子章节数量
  createdAt: string
  updatedAt: string
}

export interface SystemStats {
  users: number
  projects: number
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
export interface CreateUserData {
  name: string
  email: string
}

export interface CreateProjectData {
  title: string
  description?: string
  authorId: string
}

export interface CreateChapterData {
  title: string
  content?: string
  projectId: string  // 兼容旧接口
  workId?: string    // 新接口使用 workId
  order?: number
  orderIndex?: number  // 新接口使用 orderIndex
  authorId?: string    // 作者ID
  parentId?: string    // 父章节ID
  subtitle?: string    // 副标题
  description?: string // 描述
  type?: 'chapter' | 'volume' | 'section'  // 章节类型
}

// 更新类型
export interface UpdateProjectData {
  title?: string
  description?: string
}

export interface UpdateChapterData {
  title?: string
  content?: string
  order?: number
  orderIndex?: number  // 新接口使用 orderIndex
  subtitle?: string    // 副标题
  description?: string // 描述
  type?: 'chapter' | 'volume' | 'section'  // 章节类型
}