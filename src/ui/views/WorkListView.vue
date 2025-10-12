<template>
  <div class="work-list-view">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">📚</span>
          我的作品
        </h1>
        <button @click="createNewWork" class="create-btn">
          <span class="btn-icon">➕</span>
          创建新作品
        </button>
      </div>
      
      <!-- 筛选和搜索栏 -->
      <div class="filter-bar">
        <div class="search-box">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索作品标题、类型..." 
            class="search-input"
          >
          <span class="search-icon">🔍</span>
        </div>
        
        <div class="filter-options">
          <select v-model="statusFilter" class="filter-select">
            <option value="">全部状态</option>
            <option value="draft">草稿</option>
            <option value="writing">连载中</option>
            <option value="completed">已完成</option>
            <option value="paused">暂停</option>
          </select>
          
          <select v-model="genreFilter" class="filter-select">
            <option value="">全部类型</option>
            <option value="fantasy">玄幻</option>
            <option value="romance">言情</option>
            <option value="sci-fi">科幻</option>
            <option value="mystery">悬疑</option>
            <option value="historical">历史</option>
          </select>
        </div>
      </div>
    </header>

    <!-- 作品网格 -->
    <main class="works-container">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⟳</div>
        <p>正在加载作品列表...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <button @click="fetchWorks" class="retry-btn">重试</button>
      </div>
      
      <div v-else-if="filteredWorks.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>还没有作品</h3>
        <p>创建您的第一部作品，开始精彩的创作之旅</p>
        <button @click="createNewWork" class="empty-create-btn">
          开始创作
        </button>
      </div>
      
      <div v-else>
        <!-- 精选作品卡片展示区 -->
        <section class="featured-section">
          <h2 class="section-title">
            <span class="title-icon">✨</span>
            最近更新的作品
          </h2>
          <div class="works-grid">
            <div 
              v-for="work in featuredWorks" 
              :key="work.id"
              class="work-card"
              @click="openWork(work.id)"
            >
              <!-- 作品封面 -->
              <div class="work-cover">
                <img 
                  v-if="work.coverImageUrl || work.cover_image_url" 
                  :src="work.coverImageUrl || work.cover_image_url" 
                  :alt="work.title"
                  class="cover-image"
                >
                <div v-else class="cover-placeholder">
                  <span class="cover-icon">📖</span>
                </div>
                
                <!-- 状态标签 -->
                <div class="status-badge" :class="`status-${work.status}`">
                  {{ getStatusText(work.status) }}
                </div>
              </div>
              
              <!-- 作品信息 -->
              <div class="work-info">
                <h3 class="work-title">{{ work.title }}</h3>
                <p v-if="work.subtitle" class="work-subtitle">{{ work.subtitle }}</p>
                <p class="work-description">{{ work.description || '暂无简介' }}</p>
                
                <!-- 统计信息 -->
                <div class="work-stats">
                  <div class="stat-item">
                    <span class="stat-icon">📄</span>
                    <span class="stat-text">{{ work.chapterCount || work.chapter_count || 0 }} 章</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-icon">✍️</span>
                    <span class="stat-text">{{ formatWordCount(work.totalWords || work.total_words || 0) }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-icon">📊</span>
                    <span class="stat-text">{{ work.progressPercentage || work.progress_percentage || 0 }}%</span>
                  </div>
                </div>
                
                <!-- 类型和更新时间 -->
                <div class="work-meta">
                  <span v-if="work.genre" class="work-genre">{{ getGenreText(work.genre) }}</span>
                  <span class="work-updated">{{ formatDate(work.updatedAt || work.updated_at) }}</span>
                </div>
              </div>
              
              <!-- 操作按钮 -->
              <div class="work-actions">
                <button @click.stop="editWork(work.id)" class="action-btn edit-btn" title="编辑">
                  ✏️
                </button>
                <button @click.stop="deleteWork(work.id)" class="action-btn delete-btn" title="删除">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </section>
        
        <!-- 作品数据表格 -->
        <section class="table-section">
          <h2 class="section-title">
            <span class="title-icon">📊</span>
            所有作品列表
          </h2>
          <div class="table-container">
            <div class="table-wrapper">
              <table class="works-table">
                <thead>
                  <tr>
                    <th class="col-title">作品名称</th>
                    <th class="col-genre">类型</th>
                    <th class="col-status">状态</th>
                    <th class="col-chapters">章节数</th>
                    <th class="col-words">字数</th>
                    <th class="col-progress">进度</th>
                    <th class="col-updated">更新时间</th>
                    <th class="col-actions">操作</th>
                  </tr>
                </thead>
              <tbody>
                <tr 
                  v-for="work in filteredWorks" 
                  :key="work.id"
                  class="table-row"
                  @click="openWork(work.id)"
                >
                  <td class="col-title">
                    <div class="work-title-cell">
                      <div class="work-main-info">
                        <span class="work-title-text">{{ work.title }}</span>
                        <span v-if="work.subtitle" class="work-subtitle-text">{{ work.subtitle }}</span>
                      </div>
                      <div v-if="work.description" class="work-description-text">
                        {{ work.description.length > 50 ? work.description.substring(0, 50) + '...' : work.description }}
                      </div>
                    </div>
                  </td>
                  <td class="col-genre">
                    <span class="genre-tag">{{ getGenreText(work.genre || '') }}</span>
                  </td>
                  <td class="col-status">
                    <span 
                      class="status-tag" 
                      :style="{ backgroundColor: getStatusColor(work.status) }"
                    >
                      {{ getStatusText(work.status) }}
                    </span>
                  </td>
                  <td class="col-chapters">
                    {{ work.chapterCount || work.chapter_count || 0 }}
                  </td>
                  <td class="col-words">
                    {{ formatWordCount(work.totalWords || work.total_words || 0) }}
                  </td>
                  <td class="col-progress">
                    <div class="progress-cell">
                      <div class="progress-bar">
                        <div 
                          class="progress-fill" 
                          :style="{ width: `${work.progressPercentage || work.progress_percentage || 0}%` }"
                        ></div>
                      </div>
                      <span class="progress-text">{{ work.progressPercentage || work.progress_percentage || 0 }}%</span>
                    </div>
                  </td>
                  <td class="col-updated">
                    {{ formatDate(work.updatedAt || work.updated_at) }}
                  </td>
                  <td class="col-actions">
                    <div class="table-actions">
                      <button 
                        @click.stop="editWork(work.id)" 
                        class="table-action-btn edit-btn" 
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button 
                        @click.stop="openWork(work.id)" 
                        class="table-action-btn view-btn" 
                        title="查看"
                      >
                        👁️
                      </button>
                      <button 
                        @click.stop="deleteWork(work.id)" 
                        class="table-action-btn delete-btn" 
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
                <!-- 空状态行 -->
                <tr v-if="filteredWorks.length === 0" class="empty-table-row">
                  <td colspan="8" class="empty-table-cell">
                    <div class="empty-table-content">
                      <span class="empty-table-icon">📝</span>
                      <span class="empty-table-text">暂无作品数据</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { workApi } from '../services/api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const searchQuery = ref('')
const statusFilter = ref('')
const genreFilter = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

// 真实作品数据
const works = ref<any[]>([])

// 获取当前用户ID（使用默认用户ID，如果没有登录用户）
const getCurrentUserId = () => {
  return userStore.currentUser?.id || '01K74VN2BS7BY4QXYJNYZNMMRR'
}

// 计算属性：筛选后的作品
const filteredWorks = computed(() => {
  return works.value.filter(work => {
    const matchesSearch = !searchQuery.value || 
      work.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (work.description && work.description.toLowerCase().includes(searchQuery.value.toLowerCase()))
    
    const matchesStatus = !statusFilter.value || work.status === statusFilter.value
    const matchesGenre = !genreFilter.value || work.genre === genreFilter.value
    
    return matchesSearch && matchesStatus && matchesGenre
  })
})

// 前4个作品用于卡片展示
const featuredWorks = computed(() => {
  return filteredWorks.value.slice(0, 4)
})

// 获取作品数据
async function fetchWorks() {
  try {
    loading.value = true
    error.value = null
    
    // 首先尝试获取真实数据
    try {
      const userId = getCurrentUserId()
      const response = await workApi.getUserWorks(userId, {
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      })
      
      console.log('API 响应:', response)
      
      // WorkService.getUserWorks 直接返回 WorkInfo[] 数组
      if (Array.isArray(response)) {
        works.value = response
        console.log('成功加载真实数据，作品数量:', response.length)
        return
      } 
      
      // 处理其他可能的响应格式
      if (response && typeof response === 'object') {
        let worksData = null
        
        if (response.data && Array.isArray(response.data)) {
          worksData = response.data
        } else if (response.works && Array.isArray(response.works)) {
          worksData = response.works
        } else if (response.success && response.data && Array.isArray(response.data)) {
          worksData = response.data
        }
        
        if (worksData) {
          works.value = worksData
          console.log('成功加载真实数据，作品数量:', worksData.length)
          return
        }
      }
      
      // 如果响应格式不符合预期，抛出错误以使用模拟数据
      throw new Error('响应格式不符合预期')
      
    } catch (apiError) {
      console.warn('获取真实数据失败，使用模拟数据:', apiError)
      // 使用模拟数据
      works.value = getMockWorks()
      console.log('使用模拟数据，作品数量:', works.value.length)
    }
    
  } catch (err) {
    console.error('获取作品列表失败:', err)
    error.value = err instanceof Error ? err.message : '获取作品列表失败'
    // 最后的回退：使用模拟数据
    works.value = getMockWorks()
  } finally {
    loading.value = false
  }
}

// 模拟数据（当真实数据获取失败时使用）
function getMockWorks() {
  return [
    {
      id: '1',
      title: '星际征程',
      subtitle: '人类的太空史诗',
      description: '在遥远的未来，人类踏上了征服星际的旅程。面对未知的挑战和危险，他们能否在浩瀚的宇宙中找到新的家园？',
      coverImageUrl: '',
      genre: 'sci-fi',
      status: 'writing',
      chapterCount: 24,
      totalWords: 128500,
      progressPercentage: 65,
      createdAt: '2024-09-15T10:00:00Z',
      updatedAt: '2024-10-08T15:30:00Z'
    },
    {
      id: '2',
      title: '时空旅人',
      subtitle: '',
      description: '一个意外获得时空穿越能力的普通人，在历史的长河中寻找改变命运的机会。',
      coverImageUrl: '',
      genre: 'fantasy',
      status: 'completed',
      chapterCount: 38,
      totalWords: 96200,
      progressPercentage: 100,
      createdAt: '2024-08-20T14:00:00Z',
      updatedAt: '2024-09-30T18:45:00Z'
    },
    {
      id: '3',
      title: '魔法学院',
      subtitle: '觉醒的魔法师',
      description: '在一个充满魔法的世界里，年轻的学徒们在学院中学习魔法，面对各种试炼和挑战。',
      coverImageUrl: '',
      genre: 'fantasy',
      status: 'draft',
      chapterCount: 12,
      totalWords: 87100,
      progressPercentage: 35,
      createdAt: '2024-09-25T09:00:00Z',
      updatedAt: '2024-10-05T11:20:00Z'
    },
    {
      id: '4',
      title: '都市修仙录',
      subtitle: '',
      description: '现代都市中隐藏着修仙者的世界，主角意外踏入这个神秘的领域。',
      coverImageUrl: '',
      genre: 'fantasy',
      status: 'paused',
      chapterCount: 18,
      totalWords: 76300,
      progressPercentage: 45,
      createdAt: '2024-08-10T16:00:00Z',
      updatedAt: '2024-09-20T14:15:00Z'
    },
    {
      id: '5',
      title: '机甲战争',
      subtitle: '钢铁与血肉的对决',
      description: '在遥远的殖民星球上，巨型机甲成为了战争的主宰。年轻的机师们驾驶着这些钢铁巨兽，为了自由而战。',
      coverImageUrl: '',
      genre: 'sci-fi',
      status: 'draft',
      chapterCount: 8,
      totalWords: 45600,
      progressPercentage: 20,
      createdAt: '2024-10-01T12:00:00Z',
      updatedAt: '2024-10-09T16:30:00Z'
    },
    {
      id: '6',
      title: '古剑传说',
      subtitle: '剑道之路',
      description: '一柄古剑引发的江湖风云，少年剑客的成长之路充满了挑战和机遇。',
      coverImageUrl: '',
      genre: 'fantasy',
      status: 'writing',
      chapterCount: 32,
      totalWords: 145300,
      progressPercentage: 80,
      createdAt: '2024-07-15T09:00:00Z',
      updatedAt: '2024-10-10T14:20:00Z'
    }
  ]
}

// 方法
async function createNewWork() {
  try {
    // TODO: 打开创建作品对话框
    console.log('创建新作品')
    // 创建成功后刷新列表
    await fetchWorks()
  } catch (err) {
    console.error('创建作品失败:', err)
  }
}

function openWork(workId: string) {
  router.push(`/work/${workId}`)
}

function editWork(workId: string) {
  router.push(`/writing/${workId}`)
}

async function deleteWork(workId: string) {
  try {
    if (confirm('确定要删除这部作品吗？此操作无法撤销。')) {
      const userId = getCurrentUserId()
      await workApi.delete(workId, userId)
      // 删除成功后刷新列表
      await fetchWorks()
    }
  } catch (err) {
    console.error('删除作品失败:', err)
    alert('删除作品失败，请稍后重试')
  }
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    writing: '连载中',
    published: '已发布',
    completed: '已完成',
    paused: '暂停',
    archived: '已归档'
  }
  return statusMap[status] || status
}

function getGenreText(genre: string): string {
  const genreMap: Record<string, string> = {
    fantasy: '玄幻',
    romance: '言情',
    'sci-fi': '科幻',
    mystery: '悬疑',
    historical: '历史',
    urban: '都市',
    martial: '武侠'
  }
  return genreMap[genre] || genre
}

function formatWordCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`
  }
  return `${count}字`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天更新'
  } else if (diffDays === 1) {
    return '昨天更新'
  } else if (diffDays < 7) {
    return `${diffDays}天前更新`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: '#6b7280',
    writing: '#3b82f6',
    published: '#10b981',
    completed: '#059669',
    paused: '#f59e0b',
    archived: '#9ca3af'
  }
  return colorMap[status] || '#6b7280'
}

onMounted(() => {
  // 组件挂载后获取作品数据
  fetchWorks()
})
</script>

<style scoped>
.work-list-view {
  height: 100vh; /* 固定视窗高度 */
  width: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止整个页面滚动，让内部容器处理滚动 */
}

/* 页面头部 */
.page-header {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  flex-shrink: 0; /* 防止收缩 */
  z-index: 10;
}

/* 加载和错误状态 */
.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.loading-spinner {
  font-size: 2rem;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.retry-btn {
  background: #3182ce;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 16px;
  transition: background-color 0.3s ease;
}

.retry-btn:hover {
  background: #2c5aa0;
}

/* 分区标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 24px;
  color: #2d3748;
}

.section-title .title-icon {
  font-size: 1.2rem;
}

/* 精选作品区域 */
.featured-section {
  margin-bottom: 48px;
}

/* 表格区域 */
.table-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px; /* 添加底部间距 */
}

.table-container {
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow-x: auto; /* 只保留水平滚动，用于处理表格宽度 */
}

.table-wrapper {
  min-width: 700px; /* 确保表格有最小宽度，触发水平滚动 */
  width: 100%;
}

/* 表格容器水平滚动条样式 */
.table-container::-webkit-scrollbar {
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.works-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  table-layout: auto; /* 自适应布局 */
}

.works-table th {
  background: #f8fafc;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #4a5568;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
  vertical-align: middle;
}

.works-table td {
  padding: 16px 16px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top; /* 改为顶部对齐，适应多行内容 */
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.table-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.table-row:hover {
  background: #f8fafc;
}

/* 空状态表格行 */
.empty-table-row {
  background: #fafafa;
}

.empty-table-cell {
  padding: 40px 16px !important;
  text-align: center;
  border: none;
}

.empty-table-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #6b7280;
}

.empty-table-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.empty-table-text {
  font-size: 0.9rem;
  font-weight: 500;
}

/* 表格列宽度 - 自适应设计 */
.col-title { 
  width: auto; 
  min-width: 0; 
  max-width: none;
}
.col-genre { 
  width: 80px; 
  min-width: 0; 
  white-space: nowrap;
}
.col-status { 
  width: 80px; 
  min-width: 0; 
  white-space: nowrap;
}
.col-chapters { 
  width: 60px; 
  min-width: 0; 
  text-align: center; 
  white-space: nowrap;
}
.col-words { 
  width: 80px; 
  min-width: 0; 
  text-align: center; 
  white-space: nowrap;
}
.col-progress { 
  width: 120px; 
  min-width: 0; 
  white-space: nowrap;
}
.col-updated { 
  width: 120px; 
  min-width: 0; 
  white-space: nowrap;
}
.col-actions { 
  width: 120px; 
  min-width: 0; 
  text-align: center; 
  white-space: nowrap;
}

/* 作品标题单元格 */
.work-title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0; /* 允许内容收缩 */
}

.work-main-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0; /* 允许内容收缩 */
}

.work-title-text {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.95rem;
  word-wrap: break-word; /* 允许长文本换行 */
  overflow-wrap: break-word;
  hyphens: auto;
}

.work-subtitle-text {
  font-size: 0.85rem;
  color: #718096;
  word-wrap: break-word; /* 允许长文本换行 */
  overflow-wrap: break-word;
}

.work-description-text {
  font-size: 0.8rem;
  color: #a0aec0;
  line-height: 1.3;
  margin-top: 2px;
  word-wrap: break-word; /* 允许长文本换行 */
  overflow-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2; /* 最多显示2行 */
  line-clamp: 2; /* 标准属性 */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 类型标签 */
.genre-tag {
  display: inline-block;
  padding: 4px 8px;
  background: #edf2f7;
  color: #4a5568;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* 状态标签 */
.status-tag {
  display: inline-block;
  padding: 4px 8px;
  color: white;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

/* 进度单元格 */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4299e1, #3182ce);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.8rem;
  color: #4a5568;
  font-weight: 500;
  min-width: 35px;
}

/* 表格操作按钮 */
.table-actions {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.table-action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: #f7fafc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.table-action-btn:hover {
  background: #edf2f7;
  transform: translateY(-1px);
}

.table-action-btn.edit-btn:hover {
  color: #3182ce;
  background: #ebf8ff;
}

.table-action-btn.view-btn:hover {
  color: #38a169;
  background: #f0fff4;
}

.table-action-btn.delete-btn:hover {
  color: #e53e3e;
  background: #fed7d7;
}

/* 页面头部 - 保持原有样式 */

.header-content {
  width: 100%; /* 改为100%宽度 */
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box; /* 确保padding不会造成溢出 */
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 2.2rem;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.btn-icon {
  font-size: 1.1em;
}

/* 筛选栏 */
.filter-bar {
  width: 100%; /* 改为100%宽度 */
  padding: 0 32px 24px;
  display: flex;
  gap: 24px;
  align-items: center;
  box-sizing: border-box; /* 确保padding不会造成溢出 */
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #718096;
  font-size: 1.2em;
}

.filter-options {
  display: flex;
  gap: 12px;
}

.filter-select {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #667eea;
}

/* 主内容区 */
.works-container {
  flex: 1; /* 占用剩余空间 */
  overflow-y: auto; /* 垂直滚动 */
  overflow-x: hidden; /* 防止水平滚动 */
  padding: 0 32px 40px;
  box-sizing: border-box;
}

/* 主内容区滚动条样式 */
.works-container::-webkit-scrollbar {
  width: 8px;
}

.works-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.works-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.works-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #4a5568;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-size: 1.5rem;
  margin: 0 0 12px 0;
  color: #2d3748;
}

.empty-state p {
  font-size: 1.1rem;
  margin: 0 0 32px 0;
  color: #718096;
}

.empty-create-btn {
  padding: 16px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.empty-create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

/* 作品网格 */
.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.work-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.work-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

/* 作品封面 */
.work-cover {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-icon {
  font-size: 3rem;
  color: white;
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
}

.status-draft { background: #718096; }
.status-writing { background: #38a169; }
.status-completed { background: #3182ce; }
.status-paused { background: #ed8936; }

/* 作品信息 */
.work-info {
  padding: 20px;
}

.work-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

.work-subtitle {
  font-size: 1rem;
  color: #4a5568;
  margin: 0 0 12px 0;
  font-style: italic;
}

.work-description {
  font-size: 0.95rem;
  color: #718096;
  line-height: 1.5;
  margin: 0 0 16px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 统计信息 */
.work-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9rem;
  color: #4a5568;
}

.stat-icon {
  font-size: 1em;
}

/* 元信息 */
.work-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #718096;
}

.work-genre {
  background: #e2e8f0;
  color: #4a5568;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

/* 操作按钮 */
.work-actions {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.work-card:hover .work-actions {
  opacity: 1;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.action-btn:hover {
  background: white;
  transform: scale(1.1);
}

.edit-btn:hover {
  color: #3182ce;
}

.delete-btn:hover {
  color: #e53e3e;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .header-content, .filter-bar {
    padding-left: 24px;
    padding-right: 24px;
  }
  
  .works-container {
    padding-left: 24px;
    padding-right: 24px;
  }
  
  .works-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }
  
  .table-section {
    padding: 16px;
  }
  
  .works-table {
    font-size: 0.9rem; /* 在平板上稍微减小字体 */
  }
  
  .works-table th,
  .works-table td {
    padding: 8px 12px;
  }
  
  .work-title-text {
    font-size: 0.9rem;
  }
  
  .work-subtitle-text,
  .work-description-text {
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .filter-bar {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-options {
    justify-content: stretch;
  }
  
  .filter-select {
    flex: 1;
  }
  
  .works-grid {
    grid-template-columns: 1fr;
  }
  
  .header-content, .filter-bar {
    padding-left: 16px;
    padding-right: 16px;
  }
  
  .works-container {
    padding-left: 16px;
    padding-right: 16px;
  }
  
  .section-title {
    font-size: 1.3rem;
  }
  
  .table-section {
    padding: 12px;
    margin: 0 -4px;
  }
  
  .works-table {
    font-size: 0.85rem; /* 移动端小字体 */
  }
  
  .works-table th,
  .works-table td {
    padding: 6px 8px;
  }
  
  /* 移动端隐藏一些列 */
  .col-genre,
  .col-chapters,
  .col-progress {
    display: none;
  }
  
  /* 移动端列宽调整 */
  .col-title {
    width: auto;
    min-width: 0;
  }
  
  .col-status {
    width: 80px;
  }
  
  .col-words {
    width: 80px;
  }
  
  .col-updated {
    width: 100px;
  }
  
  .col-actions {
    width: 80px;
  }
  
  .table-actions {
    flex-direction: column;
    gap: 2px;
  }
  
  .table-action-btn {
    width: 24px;
    height: 24px;
    font-size: 0.8rem;
  }
  
  /* 移动端滚动条样式调整 */
  .works-container::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
}
</style>