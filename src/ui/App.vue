<template>
  <div id="app" class="app-container">
    <!-- 标题栏 -->
    <TitleBar />
    
    <!-- 主体区域 -->
    <div class="app-body">
      <!-- 全局左侧导航 -->
      <GlobalSidebar />
      
      <!-- 主内容区 -->
      <main class="main-content">
        <router-view />
      </main>
    </div>
    
    <!-- 状态栏 -->
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import StatusBar from './components/StatusBar.vue'
import GlobalSidebar from './components/GlobalSidebar.vue'
import { useAppStore } from './stores/app'

const appStore = useAppStore()

onMounted(async () => {
  // 初始化应用
  await appStore.initialize()
  console.log('🚀 Gestell Vue App 初始化完成')
})
</script>

<style>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  color: #e0e0e0;
  overflow: hidden;
}

.app-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>