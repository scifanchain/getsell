/**
 * API服务 - 与主进程的IPC通信封装
 */

import type { 
  User, Project, Chapter, SystemStats,
  CreateUserData, CreateProjectData, CreateChapterData,
  UpdateProjectData, UpdateChapterData
} from '../types/models'

// 用户相关API
export const userApi = {
  async create(userData: CreateUserData): Promise<User> {
    return await window.electronAPI.user.create(userData)
  },

  async find(id: string): Promise<User | null> {
    return await window.electronAPI.user.find(id)
  },

  async findByEmail(email: string): Promise<User | null> {
    return await window.electronAPI.user.findByEmail(email)
  }
}

// 项目相关API
export const projectApi = {
  async create(projectData: CreateProjectData): Promise<Project> {
    return await window.electronAPI.project.create(projectData)
  },

  async list(authorId: string): Promise<Project[]> {
    return await window.electronAPI.project.list(authorId)
  },

  async find(id: string): Promise<Project | null> {
    return await window.electronAPI.project.find(id)
  },

  async update(id: string, projectData: UpdateProjectData): Promise<Project> {
    return await window.electronAPI.project.update(id, projectData)
  },

  async delete(id: string): Promise<void> {
    return await window.electronAPI.project.delete(id)
  }
}

// 章节相关API
export const chapterApi = {
  async create(chapterData: CreateChapterData): Promise<Chapter> {
    return await window.electronAPI.chapter.create(chapterData)
  },

  async list(projectId: string): Promise<Chapter[]> {
    return await window.electronAPI.chapter.list(projectId)
  },

  async find(id: string): Promise<Chapter | null> {
    return await window.electronAPI.chapter.find(id)
  },

  async update(id: string, chapterData: UpdateChapterData): Promise<Chapter> {
    return await window.electronAPI.chapter.update(id, chapterData)
  },

  async delete(id: string): Promise<void> {
    return await window.electronAPI.chapter.delete(id)
  }
}

// 系统相关API
export const systemApi = {
  async getStats(): Promise<SystemStats> {
    return await window.electronAPI.system.getStats()
  },

  async generateId(): Promise<string> {
    return await window.electronAPI.system.generateId()
  },

  async getTimestamp(ulid: string): Promise<number> {
    return await window.electronAPI.system.getTimestamp(ulid)
  }
}

// 窗口控制API
export const windowApi = {
  async minimize(): Promise<void> {
    return await window.electronAPI.window.minimize()
  },

  async maximize(): Promise<void> {
    return await window.electronAPI.window.maximize()
  },

  async toggleMaximize(): Promise<void> {
    return await window.electronAPI.window.toggleMaximize()
  },

  async close(): Promise<void> {
    return await window.electronAPI.window.close()
  }
}