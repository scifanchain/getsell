/**
 * API服务 - 与主进程的IPC通信封装
 * 使用新的Service层架构
 */

import type { 
  User, Project, Chapter, SystemStats,
  CreateUserData, CreateProjectData, CreateChapterData,
  UpdateProjectData, UpdateChapterData
} from '../types/models'

// 用户相关API
export const userApi = {
  // 用户登录
  async login(credentials: { username: string; password?: string; rememberMe?: boolean }) {
    return await window.electronAPI.invoke('user:login', credentials)
  },

  // 用户注册
  async register(userData: {
    username: string;
    email: string;
    displayName?: string;
    bio?: string;
    password?: string;
  }) {
    return await window.electronAPI.invoke('user:register', userData)
  },

  // 获取当前用户
  async getCurrentUser(userId: string) {
    return await window.electronAPI.invoke('user:getCurrentUser', userId)
  },

  // 更新用户资料
  async updateProfile(userId: string, updateData: {
    displayName?: string;
    email?: string;
    bio?: string;
    avatarUrl?: string;
  }) {
    return await window.electronAPI.invoke('user:updateProfile', userId, updateData)
  },

  // 初始化默认用户
  async initializeDefaultUser() {
    return await window.electronAPI.invoke('user:initializeDefault')
  },

  // 获取用户统计
  async getStats(userId: string) {
    return await window.electronAPI.invoke('user:getStats', userId)
  },

  // 兼容旧接口
  async create(userData: CreateUserData): Promise<User> {
    // 将 name 映射为 username
    const registerData = {
      username: userData.name,
      email: userData.email,
      displayName: userData.name
    }
    return await this.register(registerData)
  },

  async find(id: string): Promise<User | null> {
    return await this.getCurrentUser(id)
  },

  async findByEmail(email: string): Promise<User | null> {
    // 这个需要在后端添加新的接口
    return await window.electronAPI.invoke('user:findByEmail', email)
  }
}

// 作品相关API
export const workApi = {
  // 创建作品
  async create(authorId: string, workData: {
    title: string;
    description?: string;
    genre?: string;
    tags?: string[];
    targetWords?: number;
    collaborationMode?: 'solo' | 'collaborative';
  }) {
    return await window.electronAPI.invoke('work:create', authorId, workData)
  },

  // 获取作品详情
  async get(workId: string, userId: string) {
    return await window.electronAPI.invoke('work:get', workId, userId)
  },

  // 获取用户作品列表
  async getUserWorks(userId: string, options?: {
    status?: 'draft' | 'published' | 'archived';
    genre?: string;
    sortBy?: 'title' | 'updatedAt' | 'createdAt' | 'totalWords';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) {
    return await window.electronAPI.invoke('work:getUserWorks', userId, options)
  },

  // 更新作品
  async update(workId: string, userId: string, updateData: {
    title?: string;
    subtitle?: string;
    description?: string;
    genre?: string;
    tags?: string[];
    targetWords?: number;
    status?: 'draft' | 'published' | 'archived';
  }) {
    return await window.electronAPI.invoke('work:update', workId, userId, updateData)
  },

  // 删除作品
  async delete(workId: string, userId: string) {
    return await window.electronAPI.invoke('work:delete', workId, userId)
  },

  // 搜索作品
  async search(query: string, userId?: string) {
    return await window.electronAPI.invoke('work:search', query, userId)
  },

  // 获取作品统计
  async getStats(workId: string, userId?: string) {
    return await window.electronAPI.invoke('work:getStats', workId)
  },

  // 发布作品
  async publish(workId: string, userId: string) {
    return await window.electronAPI.invoke('work:publish', workId, userId)
  }
}

// 章节相关API
export const chapterApi = {
  async create(chapterData: CreateChapterData): Promise<Chapter> {
    const authorId = chapterData.authorId || 'user_mock_001';
    
    // 转换数据格式
    const createData = {
      ...chapterData,
      authorId: authorId
    };
    
    const result = await window.electronAPI.invoke('chapter:create', authorId, createData)
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || 'Failed to create chapter')
    }
  },

  async list(workId: string): Promise<Chapter[]> {
    const result = await window.electronAPI.invoke('chapter:list', workId)
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || 'Failed to list chapters')
    }
  },

  async find(id: string): Promise<Chapter | null> {
    const result = await window.electronAPI.invoke('chapter:get', id)
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || 'Failed to find chapter')
    }
  },

  async update(id: string, chapterData: UpdateChapterData): Promise<Chapter> {
    const result = await window.electronAPI.invoke('chapter:update', id, 'user_mock_001', chapterData)
    if (result.success) {
      return result.data
    } else {
      throw new Error(result.error || 'Failed to update chapter')
    }
  },

  async delete(id: string): Promise<void> {
    const result = await window.electronAPI.invoke('chapter:delete', id)
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete chapter')
    }
  },

  async getByWork(workId: string, userId: string): Promise<Chapter[]> {
    const result = await window.electronAPI.invoke('chapter:list', workId, userId)
    if (result.success) {
      return result.data || []
    } else {
      throw new Error(result.error || 'Failed to get chapters')
    }
  }
}

// 内容管理API
export const contentApi = {
  // 创建内容
  async create(authorId: string, contentData: {
    chapterId: string;
    content: string;
    format: 'prosemirror' | 'markdown' | 'plain';
    title?: string;
  }) {
    return await window.electronAPI.invoke('content:create', authorId, contentData)
  },

  // 获取内容
  async get(contentId: string, userId: string) {
    return await window.electronAPI.invoke('content:get', contentId, userId)
  },

  // 获取章节的所有内容
  async getByChapter(chapterId: string, userId: string) {
    return await window.electronAPI.invoke('content:getByChapter', chapterId, userId)
  },

  // 更新内容
  async update(contentId: string, userId: string, updateData: {
    content?: string;
    format?: 'prosemirror' | 'markdown' | 'plain';
    title?: string;
  }) {
    return await window.electronAPI.invoke('content:update', contentId, userId, updateData)
  },

  // 自动保存内容
  async autoSave(contentId: string, userId: string, content: string) {
    return await window.electronAPI.invoke('content:autoSave', contentId, userId, content)
  },

  // 删除内容
  async delete(contentId: string, userId: string) {
    return await window.electronAPI.invoke('content:delete', contentId, userId)
  },

  // 获取内容历史
  async getHistory(contentId: string, userId: string) {
    return await window.electronAPI.invoke('content:getHistory', contentId, userId)
  }
}

// 系统功能API
export const systemApi = {
  async getStats(): Promise<SystemStats> {
    return await window.electronAPI.invoke('system:getStats')
  },

  async generateId(): Promise<string> {
    return await window.electronAPI.invoke('system:generateId')
  },

  async getTimestamp(ulid: string): Promise<number> {
    return await window.electronAPI.invoke('system:getTimestamp', ulid)
  }
}

// 窗口控制API
export const windowApi = {
  async minimize(): Promise<void> {
    return await window.electronAPI.invoke('window:minimize')
  },

  async maximize(): Promise<void> {
    return await window.electronAPI.invoke('window:maximize')
  },

  async toggleMaximize(): Promise<void> {
    return await window.electronAPI.invoke('window:toggleMaximize')
  },

  async close(): Promise<void> {
    return await window.electronAPI.invoke('window:close')
  }
}