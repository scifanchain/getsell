/**
 * 用户活动监听器 - 自动续期登录状态
 */

import { userApi } from '../services/api'

export class UserActivityWatcher {
  private isActive = true
  private lastActivityTime = Date.now()
  private lastRefreshCheck = Date.now()
  private refreshTimer: NodeJS.Timeout | null = null
  private currentCheckInterval = 10 * 60 * 1000 // 初始10分钟
  private readonly MIN_CHECK_INTERVAL = 5 * 60 * 1000 // 最小5分钟
  private readonly MAX_CHECK_INTERVAL = 60 * 60 * 1000 // 最大1小时
  private readonly ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ]

  constructor() {
    this.startWatching()
  }

  private startWatching() {
    // 监听用户活动事件
    this.ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, this.onUserActivity.bind(this), true)
    })

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this))

    // 启动定期检查
    this.startRefreshTimer()
  }

  private onUserActivity() {
    this.lastActivityTime = Date.now()
    if (!this.isActive) {
      this.isActive = true
      console.log('🟢 用户重新活跃')
    }
    
    // 智能检查：用户活动时立即检查是否需要续期
    this.checkAndRefreshLoginIfNeeded()
  }

  private onVisibilityChange() {
    if (document.hidden) {
      this.isActive = false
      console.log('🟡 应用进入后台')
    } else {
      this.isActive = true
      this.lastActivityTime = Date.now()
      console.log('🟢 应用回到前台')
      // 回到前台时检查续期
      this.checkAndRefreshLoginIfNeeded()
    }
  }

  private startRefreshTimer() {
    this.refreshTimer = setInterval(() => {
      this.periodicCheck()
    }, this.currentCheckInterval)
  }

  private async periodicCheck() {
    // 自适应调整检查间隔
    this.adjustCheckInterval()
    
    // 执行检查
    await this.checkAndRefreshLogin()
    
    // 重启定时器以使用新的间隔
    this.restartTimer()
  }

  private adjustCheckInterval() {
    const now = Date.now()
    const timeSinceLastActivity = now - this.lastActivityTime
    
    if (timeSinceLastActivity < 10 * 60 * 1000) {
      // 10分钟内有活动：使用最小间隔
      this.currentCheckInterval = this.MIN_CHECK_INTERVAL
    } else if (timeSinceLastActivity < 60 * 60 * 1000) {
      // 1小时内有活动：使用中等间隔
      this.currentCheckInterval = 15 * 60 * 1000 // 15分钟
    } else {
      // 长时间无活动：使用最大间隔
      this.currentCheckInterval = this.MAX_CHECK_INTERVAL
    }
  }

  private restartTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = setInterval(() => {
        this.periodicCheck()
      }, this.currentCheckInterval)
    }
  }

  private async checkAndRefreshLoginIfNeeded() {
    const now = Date.now()
    // 避免频繁检查：距离上次检查至少5分钟
    const timeSinceLastCheck = now - this.lastRefreshCheck
    const minCheckInterval = 5 * 60 * 1000 // 5分钟
    
    if (timeSinceLastCheck < minCheckInterval) {
      return // 检查太频繁，跳过
    }
    
    this.lastRefreshCheck = now
    await this.checkAndRefreshLogin()
  }

  private async checkAndRefreshLogin() {
    try {
      // 检查是否需要续期
      const shouldRefreshResult = await userApi.shouldRefreshLogin()
      
      if (shouldRefreshResult.success && shouldRefreshResult.data.shouldRefresh) {
        // 只有在用户活跃时才续期
        const now = Date.now()
        const timeSinceLastActivity = now - this.lastActivityTime
        const isRecentlyActive = timeSinceLastActivity < 30 * 60 * 1000 // 30分钟内有活动
        
        if (this.isActive && isRecentlyActive) {
          console.log('🔄 自动续期登录状态 (上次活动:', Math.round(timeSinceLastActivity / 60000), '分钟前)')
          await userApi.refreshLogin()
        } else {
          console.log('⏸️ 用户不活跃，跳过续期 (上次活动:', Math.round(timeSinceLastActivity / 60000), '分钟前)')
        }
      }
    } catch (error) {
      console.error('检查登录续期失败:', error)
    }
  }

  // 手动刷新登录状态（用于重要操作时）
  async manualRefresh() {
    try {
      console.log('🔄 手动续期登录状态')
      await userApi.refreshLogin()
    } catch (error) {
      console.error('手动续期失败:', error)
    }
  }

  // 停止监听
  destroy() {
    // 移除事件监听器
    this.ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, this.onUserActivity, true)
    })
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    
    // 清除定时器
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }
}

// 创建全局实例
export const userActivityWatcher = new UserActivityWatcher()