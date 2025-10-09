<!--
  架构测试组件 - 用于验证新架构的功能
-->
<template>
  <div class="architecture-test">
    <h2>🧪 架构功能测试</h2>
    
    <!-- Store 状态测试 -->
    <div class="test-section">
      <h3>📦 Store 状态测试</h3>
      
      <div class="test-item">
        <h4>用户 Store</h4>
        <p>当前用户: {{ userStore.userDisplayName }}</p>
        <p>登录状态: {{ userStore.isLoggedIn ? '已登录' : '未登录' }}</p>
        <p>加载状态: {{ userStore.loading ? '加载中' : '就绪' }}</p>
        <p>错误信息: {{ userStore.error || '无' }}</p>
      </div>
      
      <div class="test-item">
        <h4>应用 Store</h4>
        <p>初始化状态: {{ appStore.isInitialized ? '完成' : '未完成' }}</p>
        <p>当前主题: {{ appStore.theme }}</p>
        <p>侧边栏状态: {{ appStore.sidebarCollapsed ? '收起' : '展开' }}</p>
        <p>当前视图: {{ appStore.currentView }}</p>
      </div>
      
      <div class="test-item">
        <h4>作品 Store</h4>
        <p>作品数量: {{ workStore.workCount }}</p>
        <p>当前作品: {{ workStore.currentWork?.title || '无' }}</p>
        <p>加载状态: {{ workStore.loading ? '加载中' : '就绪' }}</p>
      </div>
      
      <div class="test-item">
        <h4>章节 Store</h4>
        <p>章节数量: {{ chapterStore.chapterCount }}</p>
        <p>当前章节: {{ chapterStore.currentChapter?.title || '无' }}</p>
        <p>导航状态: 
          {{ chapterStore.hasPrevChapter ? '可向前' : '不可向前' }} / 
          {{ chapterStore.hasNextChapter ? '可向后' : '不可向后' }}
        </p>
      </div>
    </div>
    
    <!-- API 服务测试 -->
    <div class="test-section">
      <h3>🔌 API 服务测试</h3>
      
      <div class="test-actions">
        <button @click="testGenerateId" class="test-btn">
          测试 ID 生成
        </button>
        <button @click="testSystemStats" class="test-btn">
          测试系统统计
        </button>
        <button @click="testWindowControls" class="test-btn">
          测试窗口控制
        </button>
      </div>
      
      <div class="test-results" v-if="testResults.length > 0">
        <h4>测试结果:</h4>
        <ul>
          <li v-for="(result, index) in testResults" :key="index" :class="result.type">
            {{ result.message }}
          </li>
        </ul>
      </div>
    </div>
    
    <!-- 主题切换测试 -->
    <div class="test-section">
      <h3>🎨 主题系统测试</h3>
      
      <div class="theme-controls">
        <button @click="appStore.toggleTheme" class="test-btn">
          切换主题 (当前: {{ appStore.theme }})
        </button>
        <button @click="appStore.toggleSidebar" class="test-btn">
          切换侧边栏 (当前: {{ appStore.sidebarCollapsed ? '收起' : '展开' }})
        </button>
      </div>
    </div>
    
    <!-- 路由测试 -->
    <div class="test-section">
      <h3>🛣️ 路由系统测试</h3>
      
      <div class="route-controls">
        <button @click="$router.push('/')" class="test-btn">
          首页
        </button>
        <button @click="$router.push('/login')" class="test-btn">
          登录页
        </button>
        <button @click="$router.push('/settings')" class="test-btn">
          设置页
        </button>
        <button @click="$router.push('/about')" class="test-btn">
          关于页
        </button>
      </div>
      
      <p>当前路由: {{ $route.name }} ({{ $route.path }})</p>
    </div>
    
    <!-- 系统信息 -->
    <div class="test-section" v-if="appStore.statsDisplay">
      <h3>📊 系统信息</h3>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ appStore.statsDisplay.users }}</div>
          <div class="stat-label">用户</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ appStore.statsDisplay.projects }}</div>
          <div class="stat-label">项目</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ appStore.statsDisplay.chapters }}</div>
          <div class="stat-label">章节</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ appStore.statsDisplay.storagePercent }}%</div>
          <div class="stat-label">存储使用</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore, useAppStore, useWorkStore, useChapterStore } from '../stores'
import { systemApi, windowApi } from '../services/api'

// 引入 stores
const userStore = useUserStore()
const appStore = useAppStore()
const workStore = useWorkStore()
const chapterStore = useChapterStore()

// 测试结果
const testResults = ref<Array<{ type: 'success' | 'error', message: string }>>([])

// 测试方法
async function testGenerateId() {
  try {
    const id = await appStore.generateId()
    testResults.value.push({
      type: 'success',
      message: `✅ ID生成成功: ${id}`
    })
  } catch (error) {
    testResults.value.push({
      type: 'error',
      message: `❌ ID生成失败: ${error}`
    })
  }
}

async function testSystemStats() {
  try {
    await appStore.loadStats()
    testResults.value.push({
      type: 'success',
      message: `✅ 系统统计加载成功`
    })
  } catch (error) {
    testResults.value.push({
      type: 'error',
      message: `❌ 系统统计加载失败: ${error}`
    })
  }
}

async function testWindowControls() {
  try {
    // 测试最小化（立即恢复）
    await windowApi.minimize()
    testResults.value.push({
      type: 'success',
      message: `✅ 窗口控制测试成功`
    })
  } catch (error) {
    testResults.value.push({
      type: 'error',
      message: `❌ 窗口控制测试失败: ${error}`
    })
  }
}
</script>

<style scoped>
.architecture-test {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.architecture-test h2 {
  margin-bottom: 2rem;
  color: #1f2937;
}

.test-section {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
}

.test-section h3 {
  margin: 0 0 1rem 0;
  color: #374151;
  border-bottom: 2px solid #f3f4f6;
  padding-bottom: 0.5rem;
}

.test-item {
  background: #f9fafb;
  border-radius: 0.375rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.test-item:last-child {
  margin-bottom: 0;
}

.test-item h4 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
  font-size: 1rem;
}

.test-item p {
  margin: 0.25rem 0;
  color: #4b5563;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.test-actions,
.theme-controls,
.route-controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.test-btn {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.test-btn:hover {
  background: #2563eb;
}

.test-results {
  background: #f9fafb;
  border-radius: 0.375rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.test-results h4 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
}

.test-results ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.test-results li {
  padding: 0.25rem 0;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.test-results li.success {
  color: #059669;
}

.test-results li.error {
  color: #dc2626;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: #f9fafb;
  border-radius: 0.375rem;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e5e7eb;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 0.25rem;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
}

/* 暗色主题支持 */
:global(.dark) .architecture-test {
  background: #111827;
  color: #f9fafb;
}

:global(.dark) .test-section {
  background: #1f2937;
  border-color: #374151;
}

:global(.dark) .test-item,
:global(.dark) .test-results,
:global(.dark) .stat-card {
  background: #374151;
  border-color: #4b5563;
}

:global(.dark) .test-item h4,
:global(.dark) .test-results h4 {
  color: #f9fafb;
}

:global(.dark) .test-item p {
  color: #d1d5db;
}
</style>