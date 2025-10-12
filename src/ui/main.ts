import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { store } from './stores'
import { useAppStore, useUserStore } from './stores'
import './style.css'

// 创建应用
const app = createApp(App)

// 安装插件
app.use(store)
app.use(router)

// 挂载应用
app.mount('#app')

// 应用初始化
async function initializeApp() {
  const appStore = useAppStore()
  const userStore = useUserStore()
  
  try {
    console.log('🚀 开始应用初始化')
    
    // 初始化应用状态
    await appStore.initialize()
    console.log('✅ 应用状态初始化完成')
    
    // 尝试从本地存储恢复用户登录状态
    await userStore.loadUserFromStorage()
    console.log('📄 localStorage用户加载完成，当前用户:', userStore.currentUser?.id || 'null')
    
    // 如果没有登录用户，初始化并登录默认用户
    if (!userStore.currentUser) {
      console.log('📝 没有登录用户，初始化默认用户')
      try {
        // 初始化默认用户
        const defaultUser = await window.electronAPI.invoke('user:initializeDefault')
        console.log('🔍 默认用户初始化结果:', defaultUser)
        if (defaultUser) {
          userStore.currentUser = defaultUser
          userStore.isLoggedIn = true
          // 保存到本地存储
          localStorage.setItem('currentUserId', defaultUser.id)
          console.log('✅ 默认用户登录成功:', defaultUser.name, 'ID:', defaultUser.id)
        } else {
          console.warn('⚠️ 默认用户初始化返回null')
        }
      } catch (error) {
        console.warn('⚠️ 默认用户初始化失败:', error)
      }
    } else {
      console.log('✅ 从localStorage恢复用户:', userStore.currentUser.name, 'ID:', userStore.currentUser.id)
    }
    
    console.log('✅ 应用初始化完成')
  } catch (error) {
    console.error('❌ 应用初始化失败:', error)
  }
}

// 启动初始化
initializeApp()

// 开发模式下的调试信息
if (import.meta.env.DEV) {
  console.log('🚀 Gestell Vue 3 App Started')
  console.log('📦 Vue版本:', app.version)
  console.log('🛠️ 开发模式')
}