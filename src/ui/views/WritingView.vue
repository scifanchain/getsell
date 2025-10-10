<template>
  <div class="writing-view">
    <!-- 左侧边栏 -->
    <div class="sidebar">
      <!-- 作品信息 -->
      <div class="work-info" v-if="currentWork">
        <h2 class="work-title">{{ currentWork.title }}</h2>
        <div class="work-stats">
          <div class="stat-item">
            <span class="label">总字数:</span>
            <span class="value">{{ workStats.totalWords }}</span>
          </div>
          <div class="stat-item">
            <span class="label">章节数:</span>
            <span class="value">{{ chapters.length }}</span>
          </div>
          <div class="stat-item">
            <span class="label">进度:</span>
            <span class="value">{{ Math.round((currentWork.progressPercentage || 0)) }}%</span>
          </div>
        </div>
      </div>

      <!-- 章节树 -->
      <div class="chapter-section">
        <ChapterTree
          :chapters="chapters"
          :selected-chapter-id="selectedChapterId"
          @chapter-select="handleChapterSelect"
          @chapter-edit="handleChapterEdit"
          @chapter-delete="handleChapterDelete"
          @add-chapter="handleAddChapter"
          @add-sub-chapter="handleAddSubChapter"
          @chapters-reorder="handleChaptersReorder"
        />
      </div>
    </div>

    <!-- 主编辑区域 -->
    <div class="main-editor-area">
      <div v-if="selectedChapterId && currentContent" class="editor-wrapper">
        <EnhancedEditor
          :content-id="currentContent.id"
          :user-id="currentUser?.id || ''"
          :chapter-id="selectedChapterId"
          :initial-content="currentContent.content"
          :initial-title="currentContent.title"
          @content-saved="handleContentSaved"
          @content-error="handleContentError"
          @title-updated="handleTitleUpdated"
        />
      </div>
      
      <div v-else-if="selectedChapterId && !currentContent" class="create-content">
        <div class="empty-chapter">
          <h3>空白章节</h3>
          <p>这个章节还没有内容，开始写作吧！</p>
          <button class="start-writing-btn" @click="createNewContent">
            开始写作
          </button>
        </div>
      </div>
      
      <div v-else class="welcome-screen">
        <div class="welcome-content">
          <h2>欢迎使用 Gestell</h2>
          <p>选择一个章节开始写作，或者创建新的章节。</p>
          <div class="quick-actions">
            <button class="action-btn primary" @click="handleAddChapter">
              创建新章节
            </button>
            <button class="action-btn" @click="handleCreateWork">
              创建新作品
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧边栏 -->
    <div class="right-sidebar">
      <!-- 章节信息 -->
      <div v-if="selectedChapter" class="chapter-info">
        <h3>章节信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">标题:</span>
            <span class="value">{{ selectedChapter.title }}</span>
          </div>
          <div class="info-item">
            <span class="label">字数:</span>
            <span class="value">{{ selectedChapter.characterCount || 0 }}</span>
          </div>
          <div class="info-item">
            <span class="label">类型:</span>
            <span class="value">{{ getChapterTypeLabel(selectedChapter.type || 'chapter') }}</span>
          </div>
          <div class="info-item">
            <span class="label">创建:</span>
            <span class="value">{{ formatDate(selectedChapter.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 大纲/结构 -->
      <div class="outline-section">
        <h3>文档大纲</h3>
        <div class="outline-content">
          <p class="placeholder">大纲功能开发中...</p>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <h3>写作统计</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ todayStats.wordsWritten }}</div>
            <div class="stat-label">今日字数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ todayStats.timeSpent }}</div>
            <div class="stat-label">今日时长</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模态框 -->
    <ChapterEditModal
      v-if="showChapterModal"
      :chapter="editingChapter"
      :is-new="isNewChapter"
      @save="handleChapterSave"
      @close="handleChapterModalClose"
    />

    <WorkCreateModal
      v-if="showWorkModal"
      @save="handleWorkSave"
      @close="handleWorkModalClose"
    />

    <!-- 通知 -->
    <div v-if="notifications.length > 0" class="notifications">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification"
        :class="notification.type"
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import ChapterTree from '../components/ChapterTree.vue'
import EnhancedEditor from '../components/EnhancedEditor.vue'
import ChapterEditModal from '../components/ChapterEditModal.vue'
import WorkCreateModal from '../components/WorkCreateModal.vue'
import { workApi, chapterApi, contentApi } from '../services/api'
import type { Chapter } from '../types/models'

// 章节数据类型定义
interface ChapterLocal {
  id: string
  title: string
  parentId?: string
  orderIndex: number
  type?: 'chapter' | 'volume' | 'section'
  characterCount?: number
  contentCount?: number
  childChapterCount?: number
  createdAt: string
  updatedAt: string
  workId: string
  authorId?: string
  level: number
}

// Types
interface Work {
  id: string
  title: string
  progressPercentage?: number
}

interface WorkStats {
  totalWords: number
  totalChapters: number
}

interface TodayStats {
  wordsWritten: number
  timeSpent: string
}

interface Notification {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface EditingChapter {
  id?: string
  workId?: string
  parentId?: string
  title: string
  type: 'chapter' | 'volume' | 'section'
}

// Composables
const router = useRouter()
const userStore = useUserStore()

// Reactive data
const currentWork = ref<Work | null>(null)
const chapters = ref<ChapterLocal[]>([])
const selectedChapterId = ref('')
const currentContent = ref<any>(null)
const workStats = ref<WorkStats>({ totalWords: 0, totalChapters: 0 })
const notifications = ref<Notification[]>([])

// Modal states
const showChapterModal = ref(false)
const showWorkModal = ref(false)
const editingChapter = ref<EditingChapter | null>(null)
const isNewChapter = ref(false)

// Statistics
const todayStats = ref<TodayStats>({
  wordsWritten: 0,
  timeSpent: '0分钟'
})

// Computed properties
const currentUser = computed(() => userStore.currentUser)
const selectedChapter = computed(() => {
  if (!Array.isArray(chapters.value)) return null
  return chapters.value.find(ch => ch.id === selectedChapterId.value) || null
})

// Lifecycle
onMounted(async () => {
  await initializeView()
})

// Watchers
watch(selectedChapterId, async (newChapterId) => {
  if (newChapterId) {
    await loadChapterContent(newChapterId)
  } else {
    currentContent.value = null
  }
})

// Methods
const convertToLocalChapter = (chapter: Chapter): ChapterLocal => {
  return {
    id: chapter.id,
    title: chapter.title,
    parentId: chapter.parentId,
    orderIndex: chapter.orderIndex || 0,
    type: chapter.type ?? 'chapter',
    characterCount: chapter.characterCount ?? 0,
    contentCount: chapter.contentCount ?? 0,
    childChapterCount: chapter.childChapterCount ?? 0,
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt,
    workId: chapter.workId || '',
    authorId: chapter.authorId,
    level: chapter.level
  }
}
const convertToApiChapter = (chapter: ChapterLocal): Chapter => {
  return {
    id: chapter.id,
    title: chapter.title,
    parentId: chapter.parentId,
    orderIndex: chapter.orderIndex,
    type: chapter.type,
    characterCount: chapter.characterCount,
    contentCount: chapter.contentCount,
    childChapterCount: chapter.childChapterCount,
    createdAt: chapter.createdAt,
    updatedAt: chapter.updatedAt,
    workId: chapter.workId || '',
    authorId: chapter.authorId,
    level: chapter.level
  }
}

const initializeView = async () => {
  try {
    const workId = router.currentRoute.value.params.workId
    if (workId && typeof workId === 'string') {
      await loadWork(workId)
    } else {
      await loadUserFirstWork()
    }
  } catch (error) {
    console.error('Initialize view failed:', error)
    showNotification('初始化失败', 'error')
  }
}

const loadWork = async (workId: string) => {
  try {
    if (!currentUser.value) {
      showNotification('用户未登录', 'error')
      return
    }

    const work = await workApi.get(workId, currentUser.value.id)
    currentWork.value = work

    const workChapters = await chapterApi.getByWork(workId, currentUser.value.id)
    chapters.value = workChapters.map(convertToLocalChapter)

    const stats = await workApi.getStats(workId, currentUser.value.id)
    workStats.value = stats

    if (chapters.value.length > 0) {
      selectedChapterId.value = chapters.value[0].id
    }
  } catch (error) {
    console.error('Load work failed:', error)
    showNotification('加载作品失败', 'error')
  }
}

const loadUserFirstWork = async () => {
  try {
    if (!currentUser.value) return

    const works = await workApi.getUserWorks(currentUser.value.id, {
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    })

    if (works.length > 0) {
      await loadWork(works[0].id)
    }
  } catch (error) {
    console.error('Load user first work failed:', error)
  }
}

const loadChapterContent = async (chapterId: string) => {
  try {
    if (!currentUser.value) return

    const contents = await contentApi.getByChapter(chapterId, currentUser.value.id)
    currentContent.value = contents.length > 0 ? contents[0] : null
  } catch (error) {
    console.error('Load chapter content failed:', error)
    showNotification('加载章节内容失败', 'error')
  }
}

const handleChapterSelect = (chapterId: string) => {
  selectedChapterId.value = chapterId
}

const handleChapterEdit = (chapter: ChapterLocal) => {
  editingChapter.value = {
    id: chapter.id,
    workId: chapter.workId,
    title: chapter.title,
    type: chapter.type || 'chapter'
  }
  isNewChapter.value = false
  showChapterModal.value = true
}

const handleChapterDelete = async (chapterId: string) => {
  if (!confirm('确定要删除这个章节吗？这个操作不可恢复。')) return

  try {
    await chapterApi.delete(chapterId)
    if (currentWork.value) {
      await loadWork(currentWork.value.id)
    }
    showNotification('章节已删除', 'success')
  } catch (error) {
    console.error('Delete chapter failed:', error)
    showNotification('删除章节失败', 'error')
  }
}

const handleAddChapter = () => {
  if (!currentWork.value) {
    showNotification('请先选择或创建作品', 'error')
    return
  }

  editingChapter.value = {
    workId: currentWork.value.id,
    title: '',
    type: 'chapter'
  }
  isNewChapter.value = true
  showChapterModal.value = true
}

const handleAddSubChapter = (parentId: string) => {
  if (!currentWork.value) {
    showNotification('请先选择或创建作品', 'error')
    return
  }

  editingChapter.value = {
    workId: currentWork.value.id,
    parentId,
    title: '',
    type: 'section'
  }
  isNewChapter.value = true
  showChapterModal.value = true
}

const handleChaptersReorder = async (reorderedChapters: ChapterLocal[]) => {
  try {
    chapters.value = reorderedChapters
    showNotification('章节顺序已更新', 'success')
  } catch (error) {
    console.error('Reorder chapters failed:', error)
    showNotification('更新章节顺序失败', 'error')
  }
}

const handleChapterSave = async (chapterData: any) => {
  try {
    if (!currentUser.value) {
      showNotification('用户未登录', 'error')
      return
    }

    if (isNewChapter.value) {
      const dataWithAuthor = {
        ...chapterData,
        authorId: currentUser.value.id
      }
      await chapterApi.create(dataWithAuthor)
    } else {
      if (!editingChapter.value?.id) {
        showNotification('没有正在编辑的章节', 'error')
        return
      }
      await chapterApi.update(editingChapter.value.id, chapterData)
    }

    if (currentWork.value) {
      await loadWork(currentWork.value.id)
    }
    showChapterModal.value = false
    showNotification('章节已保存', 'success')
  } catch (error: any) {
    console.error('Save chapter failed:', error)
    showNotification('保存章节失败: ' + error.message, 'error')
  }
}

const handleChapterModalClose = () => {
  showChapterModal.value = false
  editingChapter.value = null
}

const createNewContent = async () => {
  try {
    if (!currentUser.value) {
      showNotification('用户未登录', 'error')
      return
    }

    const newContent = await contentApi.create(currentUser.value.id, {
      chapterId: selectedChapterId.value,
      content: '',
      format: 'prosemirror',
      title: '新内容'
    })

    currentContent.value = newContent
    showNotification('已创建新内容', 'success')
  } catch (error) {
    console.error('Create content failed:', error)
    showNotification('创建内容失败', 'error')
  }
}

const handleContentSaved = (result: any) => {
  showNotification('内容已保存', 'success')
  todayStats.value.wordsWritten += result.wordCount || 0
}

const handleContentError = (error: Error) => {
  showNotification(`保存失败: ${error.message}`, 'error')
}

const handleTitleUpdated = (title: string) => {
  if (currentContent.value) {
    currentContent.value.title = title
  }
}

const handleCreateWork = () => {
  showWorkModal.value = true
}

const handleWorkSave = async (workData: any) => {
  try {
    if (!currentUser.value) {
      showNotification('用户未登录', 'error')
      return
    }

    const newWork = await workApi.create(currentUser.value.id, workData)
    await loadWork(newWork.id)
    showWorkModal.value = false
    showNotification('作品已创建', 'success')
  } catch (error) {
    console.error('Create work failed:', error)
    showNotification('创建作品失败', 'error')
  }
}

const handleWorkModalClose = () => {
  showWorkModal.value = false
}

const getChapterTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'volume': '卷',
    'chapter': '章节',
    'section': '小节'
  }
  return labels[type] || type
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const notification: Notification = {
    id: Date.now(),
    message,
    type
  }

  notifications.value.push(notification)

  setTimeout(() => {
    const index = notifications.value.findIndex(n => n.id === notification.id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }, 3000)
}
</script>

<style scoped>
.writing-view {
  height: 100vh;
  display: grid;
  grid-template-columns: 300px 1fr 250px;
  grid-template-rows: 1fr;
  gap: 1px;
  background: #e1e5e9;
}

.sidebar {
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.work-info {
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.work-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.work-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.stat-item .label {
  color: #666;
}

.stat-item .value {
  font-weight: 500;
  color: #333;
}

.chapter-section {
  flex: 1;
  overflow: hidden;
}

.main-editor-area {
  background: white;
  overflow: hidden;
}

.editor-wrapper {
  height: 100%;
}

.create-content,
.welcome-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-chapter,
.welcome-content {
  text-align: center;
  max-width: 400px;
}

.empty-chapter h3,
.welcome-content h2 {
  margin: 0 0 12px 0;
  color: #333;
}

.empty-chapter p,
.welcome-content p {
  margin: 0 0 24px 0;
  color: #666;
  line-height: 1.5;
}

.start-writing-btn,
.action-btn {
  padding: 12px 24px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  margin: 0 8px;
}

.action-btn.primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.start-writing-btn:hover,
.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.right-sidebar {
  background: white;
  padding: 20px;
  overflow-y: auto;
}

.chapter-info h3,
.outline-section h3,
.stats-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item .value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.outline-content {
  margin-bottom: 32px;
}

.placeholder {
  color: #999;
  font-style: italic;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #007bff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

.notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.notification {
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.notification.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.notification.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.notification.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .writing-view {
    grid-template-columns: 250px 1fr 200px;
  }
}

@media (max-width: 768px) {
  .writing-view {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
  
  .right-sidebar {
    display: none;
  }
}
</style>