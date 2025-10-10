<template>
  <footer class="status-bar">
    <div class="status-left">
      <span class="status-item">字数: {{ wordCount }}</span>
      <span class="status-item">项目: {{ currentProject || '未选择' }}</span>
      <!-- 编辑器保存状态 -->
      <span v-if="editorStore.editorStatus.currentContentId" 
            class="status-item save-status" 
            :class="editorStore.saveStatusClass">
        {{ editorStore.saveStatusText }}
      </span>
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
import { useEditorStore } from '../stores/editor'

const editorStore = useEditorStore()

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

.save-status {
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.status-saving {
  background: rgba(255, 193, 7, 0.2);
  color: #ff6f00;
}

.status-unsaved {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.status-saved {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}
</style>