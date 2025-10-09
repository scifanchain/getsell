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
    // 初始化应用状态
    await appStore.initialize()
    
    // 尝试从本地存储恢复用户登录状态
    await userStore.loadUserFromStorage()
    
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