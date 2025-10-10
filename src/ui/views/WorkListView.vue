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
      <div v-if="filteredWorks.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>还没有作品</h3>
        <p>创建您的第一部作品，开始精彩的创作之旅</p>
        <button @click="createNewWork" class="empty-create-btn">
          开始创作
        </button>
      </div>
      
      <div v-else class="works-grid">
        <div 
          v-for="work in filteredWorks" 
          :key="work.id"
          class="work-card"
          @click="openWork(work.id)"
        >
          <!-- 作品封面 -->
          <div class="work-cover">
            <img 
              v-if="work.cover_image_url" 
              :src="work.cover_image_url" 
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
                <span class="stat-text">{{ work.chapter_count || 0 }} 章</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">✍️</span>
                <span class="stat-text">{{ formatWordCount(work.total_words || 0) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">📊</span>
                <span class="stat-text">{{ work.progress_percentage || 0 }}%</span>
              </div>
            </div>
            
            <!-- 类型和更新时间 -->
            <div class="work-meta">
              <span v-if="work.genre" class="work-genre">{{ getGenreText(work.genre) }}</span>
              <span class="work-updated">{{ formatDate(work.updated_at) }}</span>
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
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const statusFilter = ref('')
const genreFilter = ref('')

// 模拟作品数据
const works = ref([
  {
    id: '1',
    title: '星际征程',
    subtitle: '人类的太空史诗',
    description: '在遥远的未来，人类踏上了征服星际的旅程。面对未知的挑战和危险，他们能否在浩瀚的宇宙中找到新的家园？',
    cover_image_url: '',
    genre: 'sci-fi',
    status: 'writing',
    chapter_count: 24,
    total_words: 128500,
    progress_percentage: 65,
    created_at: '2024-09-15T10:00:00Z',
    updated_at: '2024-10-08T15:30:00Z'
  },
  {
    id: '2',
    title: '时空旅人',
    subtitle: '',
    description: '一个意外获得时空穿越能力的普通人，在历史的长河中寻找改变命运的机会。',
    cover_image_url: '',
    genre: 'fantasy',
    status: 'completed',
    chapter_count: 38,
    total_words: 96200,
    progress_percentage: 100,
    created_at: '2024-08-20T14:00:00Z',
    updated_at: '2024-09-30T18:45:00Z'
  },
  {
    id: '3',
    title: '魔法学院',
    subtitle: '觉醒的魔法师',
    description: '在一个充满魔法的世界里，年轻的学徒们在学院中学习魔法，面对各种试炼和挑战。',
    cover_image_url: '',
    genre: 'fantasy',
    status: 'draft',
    chapter_count: 12,
    total_words: 87100,
    progress_percentage: 35,
    created_at: '2024-09-25T09:00:00Z',
    updated_at: '2024-10-05T11:20:00Z'
  },
  {
    id: '4',
    title: '都市修仙录',
    subtitle: '',
    description: '现代都市中隐藏着修仙者的世界，主角意外踏入这个神秘的领域。',
    cover_image_url: '',
    genre: 'fantasy',
    status: 'paused',
    chapter_count: 18,
    total_words: 76300,
    progress_percentage: 45,
    created_at: '2024-08-10T16:00:00Z',
    updated_at: '2024-09-20T14:15:00Z'
  }
])

// 计算属性：筛选后的作品
const filteredWorks = computed(() => {
  return works.value.filter(work => {
    const matchesSearch = !searchQuery.value || 
      work.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      work.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesStatus = !statusFilter.value || work.status === statusFilter.value
    const matchesGenre = !genreFilter.value || work.genre === genreFilter.value
    
    return matchesSearch && matchesStatus && matchesGenre
  })
})

// 方法
function createNewWork() {
  // TODO: 实现创建新作品
  console.log('创建新作品')
}

function openWork(workId: string) {
  router.push(`/work/${workId}`)
}

function editWork(workId: string) {
  router.push(`/writing/${workId}`)
}

function deleteWork(workId: string) {
  // TODO: 实现删除作品
  console.log('删除作品:', workId)
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    writing: '连载中',
    completed: '已完成',
    paused: '暂停'
  }
  return statusMap[status] || status
}

function getGenreText(genre: string): string {
  const genreMap: Record<string, string> = {
    fantasy: '玄幻',
    romance: '言情',
    'sci-fi': '科幻',
    mystery: '悬疑',
    historical: '历史'
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

onMounted(() => {
  // 组件挂载后的初始化逻辑
})
</script>

<style scoped>
.work-list-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* 页面头部 */
.page-header {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px 24px;
  display: flex;
  gap: 24px;
  align-items: center;
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px 40px;
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
  .header-content, .filter-bar, .works-container {
    padding-left: 24px;
    padding-right: 24px;
  }
  
  .works-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
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
  
  .header-content, .filter-bar, .works-container {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>