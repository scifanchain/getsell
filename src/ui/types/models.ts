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
  projectId: string
  order: number
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
  projectId: string
  order?: number
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
}