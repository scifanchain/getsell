/**
 * 作者配置存储 - 使用 Node.js fs 为 Electron 应用提供持久化存储
 */

import { app } from 'electron'
import { promises as fs } from 'fs'
import * as path from 'path'

interface AuthorConfig {
  // 当前登录作者ID
  currentAuthorId?: string
  // 记住登录状态
  rememberLogin?: boolean
  // 上次登录时间
  lastLoginTime?: number
  // 自动登录设置
  autoLogin?: boolean
  // 最后编辑的内容信息
  lastEditedContent?: {
    workId: string
    chapterId?: string
    contentId: string
    timestamp: number
  }
  // 作者偏好设置
  preferences?: {
    theme?: string
    language?: string
    autoSave?: boolean
    autoSaveInterval?: number
  }
}

class AuthorConfigStore {
  private configPath: string
  private config: AuthorConfig = {}

  constructor() {
    // 获取用户数据目录
    const userDataPath = app.getPath('userData')
    this.configPath = path.join(userDataPath, 'author-config.json')
    
    // 设置默认配置
    this.config = {
      rememberLogin: true,
      autoLogin: false,
      preferences: {
        theme: 'light',
        language: 'zh-CN',
        autoSave: true,
        autoSaveInterval: 30000 // 30秒
      }
    }
  }

  // 加载配置文件
  async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      const savedConfig = JSON.parse(data)
      this.config = { ...this.config, ...savedConfig }
    } catch (error) {
      // 配置文件不存在或损坏，使用默认配置
      console.log('使用默认作者配置')
    }
  }

  // 保存配置文件
  async saveConfig(): Promise<void> {
    try {
      const dir = path.dirname(this.configPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      console.error('保存作者配置失败:', error)
    }
  }

  // 获取当前作者ID
  getCurrentAuthorId(): string | undefined {
    return this.config.currentAuthorId
  }

  // 设置当前作者ID
  async setCurrentAuthorId(authorId: string | undefined): Promise<void> {
    if (authorId) {
      this.config.currentAuthorId = authorId
      this.config.lastLoginTime = Date.now()
    } else {
      delete this.config.currentAuthorId
      delete this.config.lastLoginTime
    }
    await this.saveConfig()
  }

  // 检查是否记住登录状态
  shouldRememberLogin(): boolean {
    return this.config.rememberLogin ?? true
  }

  // 设置记住登录状态
  async setRememberLogin(remember: boolean): Promise<void> {
    this.config.rememberLogin = remember
    await this.saveConfig()
  }

  // 检查是否启用自动登录
  shouldAutoLogin(): boolean {
    return this.config.autoLogin ?? false
  }

  // 设置自动登录
  async setAutoLogin(auto: boolean): Promise<void> {
    this.config.autoLogin = auto
    await this.saveConfig()
  }

  // 获取上次登录时间
  getLastLoginTime(): number | undefined {
    return this.config.lastLoginTime
  }

  // 刷新登录时间（用于自动续期）
  async refreshLoginTime(): Promise<void> {
    if (this.config.currentAuthorId) {
      this.config.lastLoginTime = Date.now()
      await this.saveConfig()
    }
  }

  // 检查登录是否过期 (30天)
  isLoginExpired(): boolean {
    const lastLogin = this.getLastLoginTime()
    if (!lastLogin) return true
    
    const now = Date.now()
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    return (now - lastLogin) > thirtyDays
  }

  // 检查是否需要续期（超过6小时没有活动则续期）
  shouldRefreshLogin(): boolean {
    const lastLogin = this.getLastLoginTime()
    if (!lastLogin) return false
    
    const now = Date.now()
    const sixHours = 6 * 60 * 60 * 1000
    return (now - lastLogin) > sixHours
  }

  // 获取作者偏好设置
  getPreferences() {
    return this.config.preferences ?? {}
  }

  // 设置作者偏好
  async setPreference<K extends keyof AuthorConfig['preferences']>(
    key: K, 
    value: AuthorConfig['preferences'][K]
  ): Promise<void> {
    const preferences = this.getPreferences()
    this.config.preferences = { ...preferences, [key]: value }
    await this.saveConfig()
  }

  // 记录最后编辑的内容
  async setLastEditedContent(workId: string, chapterId: string | undefined, contentId: string): Promise<void> {
    this.config.lastEditedContent = {
      workId,
      chapterId,
      contentId,
      timestamp: Date.now()
    }
    await this.saveConfig()
  }

  // 获取最后编辑的内容
  getLastEditedContent() {
    return this.config.lastEditedContent
  }

  // 清除最后编辑的内容记录
  async clearLastEditedContent(): Promise<void> {
    delete this.config.lastEditedContent
    await this.saveConfig()
  }

  // 检查最后编辑的内容是否过期（7天）
  isLastEditedContentExpired(): boolean {
    const lastEdited = this.getLastEditedContent()
    if (!lastEdited) return true
    
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    return (now - lastEdited.timestamp) > sevenDays
  }

  // 清除所有作者数据
  async clearAuthorData(): Promise<void> {
    delete this.config.currentAuthorId
    delete this.config.lastLoginTime
    delete this.config.lastEditedContent
    this.config.rememberLogin = true // 保持默认设置
    this.config.autoLogin = false
    await this.saveConfig()
  }

  // 获取所有配置（调试用）
  getAllConfig(): AuthorConfig {
    return { ...this.config }
  }

  // 重置为默认配置
  async reset(): Promise<void> {
    this.config = {
      rememberLogin: true,
      autoLogin: false,
      preferences: {
        theme: 'light',
        language: 'zh-CN',
        autoSave: true,
        autoSaveInterval: 30000
      }
    }
    await this.saveConfig()
  }
}

// 导出单例实例
export const authorConfigStore = new AuthorConfigStore()
export type { AuthorConfig }