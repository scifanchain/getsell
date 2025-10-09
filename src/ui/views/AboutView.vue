<!--
  关于页面
-->
<template>
  <div class="about-view">
    <div class="about-container">
      <div class="about-header">
        <div class="app-icon">✍️</div>
        <h1>Gestell</h1>
        <p class="version">版本 1.0.0</p>
      </div>
      
      <div class="about-content">
        <section class="description">
          <h2>关于 Gestell</h2>
          <p>
            Gestell 是一款优雅的桌面写作工具，专为作家、博主和内容创作者设计。
            它提供了简洁而强大的写作环境，让您专注于创作本身。
          </p>
        </section>
        
        <section class="features">
          <h2>主要特性</h2>
          <ul>
            <li>✨ 简洁优雅的界面设计</li>
            <li>📝 强大的富文本编辑器</li>
            <li>📁 项目和章节管理</li>
            <li>💾 本地数据存储</li>
            <li>🌙 深色/浅色主题切换</li>
            <li>⚡ 快速响应的性能</li>
          </ul>
        </section>
        
        <section class="tech-stack">
          <h2>技术栈</h2>
          <div class="tech-grid">
            <div class="tech-item">
              <strong>前端</strong>
              <p>Vue 3 + TypeScript</p>
            </div>
            <div class="tech-item">
              <strong>桌面框架</strong>
              <p>Electron</p>
            </div>
            <div class="tech-item">
              <strong>数据库</strong>
              <p>Prisma + SQLite</p>
            </div>
            <div class="tech-item">
              <strong>构建工具</strong>
              <p>Vite</p>
            </div>
          </div>
        </section>
        
        <section class="system-info" v-if="systemStats">
          <h2>系统信息</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ systemStats.users }}</div>
              <div class="stat-label">用户数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ systemStats.projects }}</div>
              <div class="stat-label">项目数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ systemStats.chapters }}</div>
              <div class="stat-label">章节数</div>
            </div>
          </div>
        </section>
        
        <section class="links">
          <h2>相关链接</h2>
          <div class="link-buttons">
            <button @click="openExternal('https://github.com')" class="link-btn">
              GitHub 仓库
            </button>
            <button @click="openExternal('https://github.com')" class="link-btn">
              问题反馈
            </button>
            <button @click="openExternal('https://github.com')" class="link-btn">
              用户文档
            </button>
          </div>
        </section>
      </div>
      
      <div class="about-footer">
        <p>&copy; 2024 Gestell. All rights reserved.</p>
        <p>Made with ❤️ for writers</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()

// 计算属性
const systemStats = computed(() => appStore.stats)

// 方法
function openExternal(url: string) {
  // 在 Electron 中打开外部链接
  if (window.electronAPI) {
    // TODO: 添加 shell.openExternal 的 API
    console.log('打开外部链接:', url)
  } else {
    window.open(url, '_blank')
  }
}

// 生命周期
onMounted(async () => {
  // 加载系统统计信息
  try {
    await appStore.loadStats()
  } catch (error) {
    console.error('加载系统信息失败:', error)
  }
})
</script>

<style scoped>
.about-view {
  height: 100vh;
  overflow-y: auto;
  background: #f9fafb;
}

.about-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.about-header {
  text-align: center;
  margin-bottom: 3rem;
}

.app-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.about-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  font-weight: 700;
  color: #1f2937;
}

.version {
  margin: 0;
  color: #6b7280;
  font-size: 1.125rem;
}

.about-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.about-content section {
  margin-bottom: 2rem;
}

.about-content section:last-child {
  margin-bottom: 0;
}

.about-content h2 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.description p {
  line-height: 1.6;
  color: #4b5563;
  margin: 0;
}

.features ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.features li {
  padding: 0.5rem 0;
  color: #4b5563;
  border-bottom: 1px solid #f3f4f6;
}

.features li:last-child {
  border-bottom: none;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.tech-item {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.tech-item strong {
  display: block;
  margin-bottom: 0.5rem;
  color: #1f2937;
}

.tech-item p {
  margin: 0;
  color: #6b7280;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
}

.link-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.link-btn {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.link-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.about-footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.about-footer p {
  margin: 0.25rem 0;
  color: #6b7280;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .about-container {
    padding: 1rem;
  }
  
  .about-content {
    padding: 1.5rem;
  }
  
  .tech-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .link-buttons {
    flex-direction: column;
  }
  
  .link-btn {
    width: 100%;
  }
}
</style>