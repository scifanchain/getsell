<template>
  <div class="home-view">
    <!-- 主体内容 -->
    <div class="main-body">
      <!-- 中间主内容区 -->
      <main class="main-content">
      <!-- 欢迎区域 -->
      <section class="welcome-banner">
        <h1 class="app-title">Gestell</h1>
        <p class="app-subtitle">专业的创作写作平台</p>
        
        <!-- 主要操作按钮 -->
        <div class="primary-actions">
          <button @click="goToWorkList" class="btn-primary">
            <span class="btn-icon">✍️</span>
            作品列表
          </button>
          <button @click="createNewWork" class="btn-secondary">
            <span class="btn-icon">➕</span>
            创建作品
          </button>
        </div>
      </section>

      <!-- 内容板块 -->
      <div class="content-sections">
        <!-- 热门作品 -->
        <section class="content-card">
          <h3 class="card-title">📈 热门作品排行</h3>
          <div class="ranking-list">
            <div class="ranking-item">
              <span class="rank">1</span>
              <span class="work-title">《星际征程》</span>
              <span class="work-stats">128.5k 字</span>
            </div>
            <div class="ranking-item">
              <span class="rank">2</span>
              <span class="work-title">《时空旅人》</span>
              <span class="work-stats">96.2k 字</span>
            </div>
            <div class="ranking-item">
              <span class="rank">3</span>
              <span class="work-title">《魔法学院》</span>
              <span class="work-stats">87.1k 字</span>
            </div>
          </div>
        </section>

        <!-- 活跃作者 -->
        <section class="content-card">
          <h3 class="card-title">✨ 活跃作者</h3>
          <div class="author-list">
            <div class="author-item">
              <div class="author-avatar">📝</div>
              <div class="author-info">
                <div class="author-name">星河散人</div>
                <div class="author-stats">本周更新 3 万字</div>
              </div>
            </div>
            <div class="author-item">
              <div class="author-avatar">🖋️</div>
              <div class="author-info">
                <div class="author-name">时光笔客</div>
                <div class="author-stats">本周更新 2.5 万字</div>
              </div>
            </div>
          </div>
        </section>

        <!-- 当前活动 -->
        <section class="content-card">
          <h3 class="card-title">🎉 当前活动</h3>
          <div class="activity-content">
            <div class="activity-item">
              <div class="activity-badge">NEW</div>
              <div class="activity-text">春季创作挑战赛开始啦！</div>
            </div>
            <div class="activity-item">
              <div class="activity-badge">HOT</div>
              <div class="activity-text">加入社区，与作者们交流创作心得</div>
            </div>
          </div>
        </section>

        <!-- 生态进展 -->
        <section class="content-card">
          <h3 class="card-title">🚀 生态进展</h3>
          <div class="progress-content">
            <div class="progress-item">
              <span class="progress-label">区块链存证</span>
              <div class="progress-bar">
                <div class="progress-fill" style="width: 85%"></div>
              </div>
              <span class="progress-text">85%</span>
            </div>
            <div class="progress-item">
              <span class="progress-label">NFT 铸造</span>
              <div class="progress-bar">
                <div class="progress-fill" style="width: 72%"></div>
              </div>
              <span class="progress-text">72%</span>
            </div>
          </div>
        </section>
      </div>

      <!-- 开发测试按钮 -->
      <div v-if="isDev" class="dev-actions">
        <button @click="goToWritingDemo" class="btn-dev">体验写作台</button>
        <button @click="goToEditorTest" class="btn-dev">测试编辑器</button>
        <button @click="goToAbout" class="btn-dev">关于</button>
      </div>
    </main>

    <!-- 右栏统计信息 -->
    <aside class="right-sidebar">
      <div class="stats-container">
        <h3 class="stats-title">📊 平台统计</h3>
        
        <div class="stat-card">
          <div class="stat-number">1,247</div>
          <div class="stat-label">总作品数</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-number">8,569</div>
          <div class="stat-label">注册用户</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-number">2.8M</div>
          <div class="stat-label">总字数</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-number">12,456</div>
          <div class="stat-label">章节数</div>
        </div>

        <div class="stat-card">
          <div class="stat-number">98.5%</div>
          <div class="stat-label">系统可用性</div>
        </div>

        <!-- 今日数据 -->
        <div class="daily-stats">
          <h4 class="daily-title">📅 今日数据</h4>
          <div class="daily-item">
            <span class="daily-label">新增作品</span>
            <span class="daily-value">+23</span>
          </div>
          <div class="daily-item">
            <span class="daily-label">新增字数</span>
            <span class="daily-value">+156k</span>
          </div>
          <div class="daily-item">
            <span class="daily-label">活跃用户</span>
            <span class="daily-value">342</span>
          </div>
        </div>
      </div>
    </aside>
    </div> <!-- main-body -->
    
    <!-- 创建作品模态框 -->
    <!-- 创建作品对话框 -->
    <WorkCreateModal
      v-if="showCreateWorkModal"
      @save="handleWorkSave"
      @close="showCreateWorkModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthorStore } from '../stores/author'
import WorkCreateModal from '../components/WorkCreateModal.vue'

const router = useRouter()
const authorStore = useAuthorStore()
const isDev = import.meta.env.DEV

// 导航方法
function goToWorkList() {
  router.push('/works')
}

function goToWritingDemo() {
  router.push('/writing-demo')
}

function goToAbout() {
  router.push('/about')
}

function goToEditorTest() {
  router.push('/editor-test')
}

function createNewWork() {
  showCreateWorkModal.value = true
  console.log('显示创建作品对话框')
}

const showCreateWorkModal = ref(false)

const handleWorkSave = async (workData: any) => {
  try {
    // 检查用户是否登录
    const authorId = authorStore.currentAuthor?.id
    if (!authorId) {
      alert('请先登录')
      router.push('/login')
      return
    }
    
    console.log('准备创建作品:', { authorId, workData })
    
    const response = await window.electronAPI.invoke('work:create', authorId, workData)
    
    console.log('作品创建成功:', response)
    
    // 跳转到 WritingView，传递 workId
    router.push(`/writing/${response.id}`)
    
    // 关闭对话框
    showCreateWorkModal.value = false
    
  } catch (error: any) {
    console.error('创建作品失败:', error)
    alert('创建作品失败: ' + (error.message || '未知错误'))
  }
}
</script>

<style scoped>
.home-view {
  display: flex;
  height: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  overflow: hidden;
}

/* 主要内容区域 */
.main-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 主内容区 */
.main-content {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
  background: transparent;
}

/* 欢迎横幅 */
.welcome-banner {
  text-align: center;
  margin-bottom: 48px;
  padding: 48px 0;
}

.app-title {
  font-size: 4rem;
  font-weight: 300;
  color: #1a202c;
  margin: 0 0 16px 0;
  letter-spacing: -0.02em;
}

.app-subtitle {
  font-size: 1.25rem;
  color: #4a5568;
  margin: 0 0 40px 0;
  font-weight: 400;
}

.primary-actions {
  display: flex;
  gap: 24px;
  justify-content: center;
  margin-top: 32px;
}

.btn-primary, .btn-secondary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  position: relative;
  overflow: hidden;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
}

.btn-secondary {
  background: white;
  color: #4a5568;
  border: 2px solid #e2e8f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.btn-secondary:hover {
  background: #f7fafc;
  border-color: #cbd5e0;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1.2em;
}

/* 内容板块 */
.content-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.content-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

.content-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.card-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 排行榜样式 */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.ranking-item:hover {
  background: #e2e8f0;
}

.rank {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 600;
}

.work-title {
  flex: 1;
  font-weight: 500;
  color: #2d3748;
}

.work-stats {
  font-size: 0.9rem;
  color: #718096;
}

/* 作者列表样式 */
.author-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.author-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.author-item:hover {
  background: #f8fafc;
}

.author-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #ffecd2, #fcb69f);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
}

.author-name {
  font-weight: 500;
  color: #2d3748;
}

.author-stats {
  font-size: 0.9rem;
  color: #718096;
}

/* 活动样式 */
.activity-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.activity-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.activity-text {
  color: #4a5568;
  flex: 1;
}

/* 进展样式 */
.progress-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-label {
  min-width: 80px;
  font-size: 0.9rem;
  color: #4a5568;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.9rem;
  color: #718096;
  min-width: 40px;
  text-align: right;
}

/* 右侧统计栏 */
.right-sidebar {
  width: 280px;
  background: white;
  padding: 32px 24px;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.05);
  border-left: 1px solid #e2e8f0;
}

.stats-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
  text-align: center;
}

.stat-card {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
  pointer-events: none;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
  position: relative;
  z-index: 1;
}

.daily-stats {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
}

.daily-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 16px 0;
  text-align: center;
}

.daily-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.daily-item:last-child {
  border-bottom: none;
}

.daily-label {
  font-size: 0.9rem;
  color: #4a5568;
}

.daily-value {
  font-weight: 600;
  color: #667eea;
}

/* 开发按钮 */
.dev-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-dev {
  padding: 8px 16px;
  background: #718096;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s ease;
}

.btn-dev:hover {
  background: #4a5568;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .right-sidebar {
    display: none;
  }
  
  .main-content {
    padding: 24px;
  }
  
  .content-sections {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
  
  .app-title {
    font-size: 2.5rem;
  }
  
  .primary-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
