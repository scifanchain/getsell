<template>
  <div id="app" class="app-container">
    <!-- 标题栏 -->
    <TitleBar />
    
    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>
    
    <!-- 状态栏 -->
    <StatusBar />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import StatusBar from './components/StatusBar.vue'
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

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>