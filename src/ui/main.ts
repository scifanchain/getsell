import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAppStore } from './stores/app'
import { useUserStore } from './stores/user'
import './style.css'

// 导入用户活动监听器（自动续期功能）
import './utils/UserActivityWatcher'

// 应用初始化
async function initializeApp() {
  // 创建 Pinia 实例和临时应用实例以便在初始化中使用 stores
  const pinia = createPinia()
  const tempApp = createApp({})
  tempApp.use(pinia)
  
  const appStore = useAppStore()
  const userStore = useUserStore()
  
  try {
    console.log('🚀 开始应用初始化')
    
    // 首先尝试从本地存储恢复用户登录状态
    await userStore.loadUserFromStorage()
    console.log('📄 localStorage用户加载完成，当前用户:', userStore.currentUser?.id || '未登录')
    
    // 然后初始化应用状态
    await appStore.initialize()
    console.log('✅ 应用状态初始化完成')
    
    // 如果没有登录用户，用户可以浏览数据，需要创建内容时会提示登录
    if (!userStore.currentUser) {
      console.log('📝 当前未登录，浏览模式（查看数据不需要登录，创建内容时会提示登录）')
    } else {
      console.log('✅ 用户已登录:', userStore.currentUser.displayName, 'ID:', userStore.currentUser.id)
    }
    
    console.log('✅ 应用初始化完成')
  } catch (error) {
    console.error('❌ 应用初始化失败:', error)
  }
  
  return pinia
}

// 启动初始化并挂载应用
initializeApp().then((pinia) => {
  // 挂载 Vue 应用
  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.mount('#app')
  
  console.log('✅ Vue 应用已挂载')
  
  // 开发模式下的调试信息
  if (import.meta.env.DEV) {
    console.log('🚀 Gestell Vue 3 App Started')
    console.log('🛠️ 开发模式')
  }
}).catch(error => {
  console.error('❌ 应用启动失败:', error)
  
  // 即使初始化失败也要挂载应用，否则用户看不到任何界面
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
})