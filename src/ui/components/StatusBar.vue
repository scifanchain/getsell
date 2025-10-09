<template>
  <footer class="status-bar">
    <div class="status-left">
      <span class="status-item">字数: {{ wordCount }}</span>
      <span class="status-item">项目: {{ currentProject || '未选择' }}</span>
    </div>
    
    <div class="status-right">
      <span class="status-item">{{ currentTime }}</span>
      <span class="status-item" :class="{ 'text-green': dbConnected, 'text-red': !dbConnected }">
        {{ dbConnected ? '数据库已连接' : '数据库断开' }}
      </span>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const wordCount = ref(0)
const currentProject = ref<string | null>(null)
const currentTime = ref('')
const dbConnected = ref(true)

let timeInterval: number | null = null

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.status-bar {
  height: 24px;
  background: rgba(10, 10, 10, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  font-size: 12px;
  color: #888;
}

.status-left, .status-right {
  display: flex;
  gap: 16px;
}

.status-item {
  white-space: nowrap;
}

.text-green {
  color: #4caf50;
}

.text-red {
  color: #f44336;
}
</style>