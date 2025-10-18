<template>
  <div class="writing-view">
    <!-- 左侧边栏 -->
    <div class="sidebar">
      <!-- 章节树 -->
      <div class="chapter-section">
        <ChapterTree
          :chapters="chapters"
          :contents="contents"
          :work-id="currentWork?.id"
          :selected-chapter-id="selectedChapterId"
          @chapter-toggle="handleChapterSelect"
          @chapter-click="handleChapterSelect"
          @chapter-edit="handleChapterEdit"
          @chapter-delete="handleChapterDelete"
          @add-chapter="handleAddChapter"
          @add-sub-chapter="handleAddSubChapter"
          @add-content="handleAddContent"
          @content-select="handleContentSelect"
          @chapters-reorder="handleChaptersReorder"
          @contents-reorder="handleContentsReorder"
        />
      </div>
    </div>

    <!-- 主编辑区域 -->
    <div class="main-editor-area">
      <div v-if="currentContent" class="editor-wrapper">
        <!-- 协作模式指示器 -->
        <div class="collaboration-mode-indicator" v-if="currentWork">
          <div class="mode-badge" :class="collaborationModeClass">
            <span class="mode-icon">{{ collaborationModeIcon }}</span>
            <span class="mode-label">{{ collaborationModeLabel }}</span>
          </div>
          <div class="mode-description">{{ collaborationModeDescription }}</div>
        </div>

        <Editor
          ref="editorRef"
          :key="editorKey"
          :model-value="currentContent.content || ''"
          :content-id="currentContent.id"
          :user-id="currentAuthor?.id"
          :user-name="currentAuthor?.username"
          :placeholder="editorPlaceholder"
          :collaboration-mode="isCollaborationActive"
          :collaboration-config="collaborationConfig"
          :readonly="false"
          @update:modelValue="handleContentUpdate"
          @change="handleContentUpdate"
          @collaboration-changed="handleCollaborationChanged"
          @collaborators-updated="handleCollaboratorsUpdated"
          @title-updated="handleTitleUpdated"
        />
      </div>
      
      <div v-else-if="isLoadingContent" class="loading-content">
        <div class="loading-spinner">
          <div class="spinner"></div>
          <p>正在加载内容...</p>
        </div>
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

      <!-- 底部状态栏 -->
      <div class="editor-status-bar" v-if="currentContent">
        <div class="status-left">
          <span class="status-item save-status" :class="saveStatusClass">
            <span class="status-icon">{{ saveStatusIcon }}</span>
            <span class="status-text">{{ saveStatusText }}</span>
          </span>
          <span class="status-item word-count" v-if="currentContent">
            {{ currentContent.wordCount || 0 }} 字
          </span>
        </div>
        <div class="status-right">
          <span class="status-item" v-if="currentContent.updatedAt">
            最后更新: {{ formatRelativeTime(currentContent.updatedAt) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 右侧边栏 -->
    <div class="right-sidebar">
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthorStore } from '../stores/author'
import ChapterTree from '../components/ChapterTree/index.vue'
import Editor from '../components/Editor.vue'
import ChapterEditModal from '../components/ChapterEditModal.vue'
import WorkCreateModal from '../components/WorkCreateModal.vue'
import { workApi, chapterApi } from '../services/api'
import { contentService } from '../services/contentService'
import type { Chapter, Content } from '../types/models'
import type { WritingContent } from '../services/contentService'

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
  authorId: string
  collaborators?: string
  collaborationMode?: 'private' | 'team' | 'public'
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
const authorStore = useAuthorStore()

// Editor ref - 用于在协作模式下获取最新内容
const editorRef = ref<{ getContent: () => string } | null>(null)

// Reactive data
const currentWork = ref<Work | null>(null)
const chapters = ref<ChapterLocal[]>([])
const contents = ref<WritingContent[]>([])
const selectedChapterId = ref('')
const currentContent = ref<WritingContent | null>(null)
const workStats = ref<WorkStats>({ totalWords: 0, totalChapters: 0 })
const notifications = ref<Notification[]>([])

// Collaborative editing state
const collaborationEnabled = ref(false)
const activeCollaborators = ref<any[]>([])

// Modal states
const showChapterModal = ref(false)
const showWorkModal = ref(false)
const editingChapter = ref<EditingChapter | null>(null)
const isNewChapter = ref(false)

// Loading states
const isLoadingContent = ref(false)

// Save status
const saveStatus = ref<'empty' | 'unsaved' | 'saving' | 'saved' | 'error'>('empty')
const lastSaveTime = ref<Date | null>(null)
let saveStatusTimer: NodeJS.Timeout | null = null
let autoSaveTimer: NodeJS.Timeout | null = null
const AUTO_SAVE_INTERVAL = 30000 // 30秒自动保存一次
const hasUnsavedChanges = ref(false)

// Statistics
const todayStats = ref<TodayStats>({
  wordsWritten: 0,
  timeSpent: '0分钟'
})

// Computed properties
const currentAuthor = computed(() => {
  const author = authorStore.currentAuthor
  console.log('👤 WritingView currentAuthor:', {
    author,
    hasAuthor: !!author,
    authorId: author?.id,
    authorName: author?.username
  })
  return author
})
const selectedChapter = computed(() => {
  if (!Array.isArray(chapters.value)) return null
  return chapters.value.find(ch => ch.id === selectedChapterId.value) || null
})

const collaborationConfig = {
  // 🔥 修复：使用正确的 WebSocket URL（不需要 /signaling 路径）
  websocketUrl: import.meta.env.VITE_YJS_SERVER_URL || 'ws://localhost:4001',
  webrtcSignaling: [import.meta.env.VITE_YJS_SERVER_URL || 'ws://localhost:4001'],
  maxConnections: 10
}

// 调试：检查环境变量是否正确加载
console.log('🔍 环境变量检查:', {
  VITE_YJS_SERVER_URL: import.meta.env.VITE_YJS_SERVER_URL,
  allEnv: import.meta.env
})

// 根据作品的协作模式自动判断是否使用协作编辑器
// private: 单机模式
// team/public: 协作模式
const isCollaborationActive = computed(() => {
  if (!currentWork.value) return false
  const mode = (currentWork.value as any).collaborationMode || 'private'
  return mode === 'team' || mode === 'public'
})

// 协作模式相关的计算属性
const collaborationModeClass = computed(() => {
  if (!currentWork.value) return ''
  const mode = (currentWork.value as any).collaborationMode || 'private'
  return `mode-${mode}`
})

const collaborationModeIcon = computed(() => {
  if (!currentWork.value) return '📝'
  const mode = (currentWork.value as any).collaborationMode || 'private'
  const icons = {
    private: '📝',
    team: '👥',
    public: '🌍'
  }
  return icons[mode as 'private' | 'team' | 'public'] || '📝'
})

const collaborationModeLabel = computed(() => {
  if (!currentWork.value) return '单机模式'
  const mode = (currentWork.value as any).collaborationMode || 'private'
  const labels = {
    private: '私有创作',
    team: '团队协作',
    public: '公开协作'
  }
  return labels[mode as 'private' | 'team' | 'public'] || '私有创作'
})

const collaborationModeDescription = computed(() => {
  if (!currentWork.value) return ''
  const mode = (currentWork.value as any).collaborationMode || 'private'
  const descriptions = {
    private: '仅您可以编辑此作品',
    team: '团队成员可以协同编辑',
    public: '所有人都可以参与编辑'
  }
  return descriptions[mode as 'private' | 'team' | 'public'] || ''
})

const editorKey = computed(() => {
  const contentId = currentContent.value?.id ?? 'empty'
  const mode = isCollaborationActive.value ? 'collab' : 'solo'
  return `${contentId}-${mode}`
})

const editorPlaceholder = computed(() => {
  if (currentContent.value?.title) {
    return `继续创作「${currentContent.value.title}」...`
  }
  if (currentWork.value?.title) {
    return `开始创作《${currentWork.value.title}》`
  }
  return '开始写作...'
})

const saveStatusClass = computed(() => {
  return saveStatus.value
})

const saveStatusIcon = computed(() => {
  const icons = {
    empty: '○',
    unsaved: '○',
    saving: '⏳',
    saved: '✓',
    error: '✗'
  }
  return icons[saveStatus.value]
})

const saveStatusText = computed(() => {
  const texts = {
    empty: '没有更新内容',
    unsaved: '未保存',
    saving: '正在保存...',
    saved: '已保存',
    error: '保存失败'
  }
  return texts[saveStatus.value]
})

const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (seconds < 10) return '刚刚'
  if (seconds < 60) return `${seconds}秒前`
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return date.toLocaleDateString('zh-CN')
}

// Lifecycle
onMounted(async () => {
  await initializeView()
})

onUnmounted(() => {
  // 清理定时器
  stopAutoSave()
  if (saveStatusTimer) {
    clearTimeout(saveStatusTimer)
  }
  // 保存未保存的更改
  if (hasUnsavedChanges.value) {
    saveContentToDatabase()
  }
})

// Watchers
watch(selectedChapterId, async (newChapterId, oldChapterId) => {
  if (newChapterId) {
    await loadChapterContent(newChapterId)
  }
})

// Methods
// 实际保存到数据库的函数
const saveContentToDatabase = async () => {
  const activeContent = currentContent.value
  const author = currentAuthor.value
  
  if (!activeContent || !author || !hasUnsavedChanges.value) {
    return
  }

  saveStatus.value = 'saving'

  try {
    // 协作模式：从 Editor 获取最新内容（Yjs 管理的内容）
    if (isCollaborationActive.value && currentWork.value) {
      let contentToSave = activeContent.content
      
      if (editorRef.value && editorRef.value.getContent) {
        contentToSave = editorRef.value.getContent()
      }
      
      // 保存到数据库作为持久化备份
      await contentService.updateContent(activeContent.id, author.id, {
        content: contentToSave,
        format: 'prosemirror'
      })
      
      // 记录最后编辑位置
      await (window as any).electronAPI.invoke('author:setLastEditedContent', {
        workId: currentWork.value.id,
        chapterId: activeContent.chapterId,
        contentId: activeContent.id
      })
      
      console.log('💾 协作内容已保存到数据库')
    } 
    // 私有模式：直接保存
    else {
      await contentService.updateContent(activeContent.id, author.id, {
        content: activeContent.content,
        format: 'prosemirror'
      })
      
      // 更新时间戳
      if (currentContent.value) {
        currentContent.value.updatedAt = new Date().toISOString()
      }
      
      console.log('💾 私有内容已保存到数据库')
    }
    
    saveStatus.value = 'saved'
    lastSaveTime.value = new Date()
    hasUnsavedChanges.value = false
    
  } catch (error) {
    console.error('❌ 保存内容失败:', error)
    saveStatus.value = 'error'
    
    // 3秒后恢复为 unsaved 状态
    setTimeout(() => {
      saveStatus.value = 'unsaved'
    }, 3000)
  }
}

// 启动自动保存定时器
const startAutoSave = () => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
  }
  
  autoSaveTimer = setInterval(async () => {
    if (hasUnsavedChanges.value) {
      await saveContentToDatabase()
    }
  }, AUTO_SAVE_INTERVAL)
}

// 停止自动保存定时器
const stopAutoSave = () => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}

// Collaborative editing methods
const handleContentUpdate = async (content: string) => {
  const activeContent = currentContent.value
  const author = currentAuthor.value
  
  if (!activeContent || !author) {
    return
  }

  // 直接修改对象属性，保持引用稳定
  activeContent.content = content

  const index = contents.value.findIndex(item => item.id === activeContent.id)
  if (index !== -1) {
    contents.value[index].content = content
    contents.value = [...contents.value]
  }

  // 检查内容是否为空
  const isEmpty = !content || 
                  content.trim() === '' || 
                  content === '{"type":"doc","content":[{"type":"paragraph"}]}' ||
                  content === '{"type":"doc","content":[]}'
  
  if (isEmpty) {
    hasUnsavedChanges.value = false
    saveStatus.value = 'empty'
  } else {
    hasUnsavedChanges.value = true
    
    if (saveStatus.value === 'saved' || saveStatus.value === 'empty') {
      saveStatus.value = 'unsaved'
    }
  }
}

const handleCollaborationChanged = (enabled: boolean) => {
  collaborationEnabled.value = enabled
  showNotification(
    enabled ? '协同编辑已启用' : '协同编辑已关闭',
    'info'
  )
}

const handleCollaboratorsUpdated = (collaborators: any[]) => {
  activeCollaborators.value = collaborators
  if (collaborators.length > 0) {
    showNotification(`${collaborators.length} 位协作者在线`, 'info')
  }
}
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
    if (!currentAuthor.value || !currentAuthor.value.id) {
      console.error('❌ 用户信息异常:', { 
        hasAuthor: !!currentAuthor.value,
        authorId: currentAuthor.value?.id
      })
      showNotification('用户信息异常，请重新登录', 'error')
      return
    }

    const work = await workApi.get(workId, currentAuthor.value.id)
    currentWork.value = work

    const workChapters = await chapterApi.getByWork(workId, currentAuthor.value.id)
    chapters.value = workChapters.map(convertToLocalChapter)
    
  // 加载内容数据
  const contentList = await contentService.fetchByWork(workId, currentAuthor.value.id)
  contents.value = [...contentList].sort((a, b) => a.orderIndex - b.orderIndex)

    const stats = await workApi.getStats(workId, currentAuthor.value.id)
    workStats.value = stats

    if (chapters.value.length > 0) {
      selectedChapterId.value = chapters.value[0].id
    }
    
    // 尝试自动加载最后编辑的内容
    await tryLoadLastEditedContent(workId)
    
    console.log('加载作品完成:', {
      work: work.title,
      chapters: chapters.value.length,
      contents: contents.value.length
    })
  } catch (error) {
    console.error('Load work failed:', error)
    showNotification('加载作品失败', 'error')
  }
}

const loadUserFirstWork = async () => {
  try {
    if (!currentAuthor.value || !currentAuthor.value.id) {
      console.error('❌ 用户信息异常，无法加载作品')
      return
    }

    const works = await workApi.getUserWorks(currentAuthor.value.id, {
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
    if (!currentAuthor.value || !currentAuthor.value.id) {
      console.error('❌ 用户信息异常，无法加载内容')
      return
    }

    console.log('开始加载章节内容:', chapterId)
    
    const contentList = await contentService.fetchByChapter(chapterId, currentAuthor.value.id)
    console.log('加载到的内容数量:', contentList.length)
    
    if (contentList.length > 0) {
      // 按最后编辑时间排序，加载最新编辑的内容
      const sortedByEditTime = [...contentList].sort((a, b) => {
        const timeA = new Date(a.lastEditedAt || a.updatedAt || a.createdAt).getTime()
        const timeB = new Date(b.lastEditedAt || b.updatedAt || b.createdAt).getTime()
        return timeB - timeA // 降序，最新的在前
      })
      
      const latestContent = sortedByEditTime[0]
      currentContent.value = latestContent
      if (latestContent) {
        console.log('已加载最新编辑的内容:', {
          id: latestContent.id,
          title: latestContent.title || '无标题',
          lastEditedAt: latestContent.lastEditedAt,
          totalContents: contentList.length
        })
        // 启动自动保存
        startAutoSave()
      }
      
      if (contentList.length > 1) {
        console.log(`该章节有 ${contentList.length} 个内容片段，已加载最新编辑的版本`)
      }
    } else {
      // 如果没有内容，设置为 null，界面会显示"开始写作"按钮
      currentContent.value = null
      console.log('该章节暂无内容，等待用户创建')
      // 停止自动保存
      stopAutoSave()
    }
  } catch (error) {
    console.error('Load chapter content failed:', error)
    showNotification('加载章节内容失败', 'error')
    currentContent.value = null
  }
}

// 处理内容选择 - 用户在 ChapterTree 中点击某个内容
const handleContentSelect = async (contentId: string) => {
  try {
    if (!currentAuthor.value || !currentAuthor.value.id) {
      console.error('❌ 用户信息异常')
      showNotification('用户信息异常，请重新登录', 'error')
      return
    }

    // 如果选择的是不同的内容，临时清空以触发 editorKey 变化
    const isDifferentContent = currentContent.value?.id !== contentId
    if (isDifferentContent && currentContent.value) {
      currentContent.value = null
      await nextTick()
    }
    
    isLoadingContent.value = true
    
    const content = await contentService.fetchContent(contentId, currentAuthor.value.id)
    if (!content) {
      showNotification('未找到该内容', 'error')
      isLoadingContent.value = false
      return
    }
    
    currentContent.value = content
    
    console.log('✅ 已加载内容:', content.title || '无标题')
    
    // 根据内容是否为空设置初始保存状态
    hasUnsavedChanges.value = false
    if (!content.content || content.content.trim() === '' || content.content === '{"type":"doc","content":[{"type":"paragraph"}]}') {
      saveStatus.value = 'empty'
    } else {
      saveStatus.value = 'saved'
    }
    
    // 使用 nextTick 确保响应式更新完成后再更新章节ID
    await nextTick()
    
    // 然后更新选中的章节ID
    if (content.chapterId) {
      if (selectedChapterId.value !== content.chapterId) {
        selectedChapterId.value = content.chapterId
      }
    } else {
      // 如果是根级别内容（chapterId 为 null），清空 selectedChapterId
      if (selectedChapterId.value) {
        selectedChapterId.value = ''
      }
    }
    
    // 记录最后访问的内容
    if (currentWork.value) {
      try {
        await (window as any).electronAPI.invoke('author:setLastEditedContent', {
          workId: currentWork.value.id,
          chapterId: content.chapterId,
          contentId: content.id
        })
      } catch (error) {
        console.error('记录最后访问内容失败:', error)
      }
    }
    
    // 启动自动保存定时器
    startAutoSave()
    
  } catch (error: any) {
    console.error('❌ Load content failed:', error)
    showNotification(`加载内容失败: ${error.message || '未知错误'}`, 'error')
  } finally {
    isLoadingContent.value = false
  }
}

// 尝试自动加载最后编辑的内容
const tryLoadLastEditedContent = async (workId: string) => {
  try {
    // 通过 IPC 获取最后编辑的内容
    const response = await (window as any).electronAPI.invoke('author:getLastEditedContent')
    if (!response.success || !response.data) {
      console.log('没有找到最后编辑的内容记录')
      return
    }

    const lastEditedContent = response.data
    console.log('找到最后编辑的内容:', lastEditedContent)

    // 检查是否是当前作品的内容
    if (lastEditedContent.workId !== workId) {
      console.log('最后编辑的内容不属于当前作品，忽略')
      return
    }

    // 检查内容是否过期（7天）
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    if ((now - lastEditedContent.timestamp) > sevenDays) {
      console.log('最后编辑的内容已过期，清除记录')
      await (window as any).electronAPI.invoke('author:clearLastEditedContent')
      return
    }

    // 检查内容是否仍然存在
    const contentExists = contents.value.some(content => content.id === lastEditedContent.contentId)
    if (!contentExists) {
      console.log('最后编辑的内容已不存在，清除记录')
      await (window as any).electronAPI.invoke('author:clearLastEditedContent')
      return
    }

    // 自动选择并加载该内容
    console.log('自动加载最后编辑的内容:', lastEditedContent.contentId)
    await handleContentSelect(lastEditedContent.contentId)
    
    showNotification('已自动加载上次编辑的内容', 'info')
  } catch (error) {
    console.error('尝试加载最后编辑内容失败:', error)
    // 不显示错误提示，静默失败
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
    if (!currentAuthor.value || !currentAuthor.value.id) {
      console.error('❌ 用户信息异常')
      alert('用户信息异常，无法删除章节。请重新登录。')
      return
    }
    await chapterApi.delete(chapterId, currentAuthor.value.id)
    if (currentWork.value) {
      await loadWork(currentWork.value.id)
    }
    showNotification('章节已删除', 'success')
  } catch (error: any) {
    console.error('Delete chapter failed:', error)
    // 使用弹框提示业务逻辑错误
    if (error.message) {
      alert(error.message)
    } else {
      alert('删除章节失败: 未知错误')
    }
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
  console.log('📝 handleAddChapter - 设置 editingChapter:', {
    editingChapter: editingChapter.value,
    currentWorkId: currentWork.value.id
  })
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
  console.log('📝 handleAddSubChapter - 设置 editingChapter:', {
    editingChapter: editingChapter.value,
    currentWorkId: currentWork.value.id,
    parentId
  })
  isNewChapter.value = true
  showChapterModal.value = true
}

const handleAddContent = async (data: { title?: string, type?: string, workId?: string, chapterId?: string }) => {
  console.log('WritingView: handleAddContent 被调用', {
    data,
    hasTitle: !!data.title,
    dataWorkId: data.workId,
    dataChapterId: data.chapterId
  })
  
  // 如果有 title，说明是从 ContentCreateModal 来的，直接创建内容
  if (data.title) {
    try {
      const userId = currentAuthor.value?.id
      if (!userId) {
        showNotification('请先登录', 'error')
        return
      }
      
      // 优先使用传递的 workId，否则使用当前作品的 id
      const workId = data.workId || currentWork.value?.id
      if (!workId) {
        showNotification('请先选择或创建作品', 'error')
        return
      }

      // 检查用户是否有权限修改此作品
      if (currentWork.value && currentWork.value.authorId !== userId) {
        const collaborators = currentWork.value.collaborators?.split(',') || []
        if (!collaborators.includes(userId)) {
          showNotification('您没有权限在此作品中创建内容', 'error')
          return
        }
      }
      
      console.log('准备创建内容:', {
        userId,
        workId,
        chapterId: data.chapterId,
        title: data.title
      })

      const emptyDoc = JSON.stringify({ type: 'doc', content: [] })
      const newContent = await contentService.createContent({
        authorId: userId,
        workId,
        chapterId: data.chapterId,
        title: data.title,
        content: emptyDoc,
        format: 'prosemirror'
      })

      console.log('内容创建成功:', newContent)

      // 更新本地内容列表并保持响应式
      contents.value = [...contents.value, newContent].sort((a, b) => a.orderIndex - b.orderIndex)

      if (currentWork.value) {
        try {
          const stats = await workApi.getStats(currentWork.value.id, userId)
          workStats.value = stats
        } catch (statsError) {
          console.error('刷新作品统计失败:', statsError)
        }
      }

      // 自动加载新创建的内容到编辑器
      currentContent.value = newContent

      // 如果章节ID不同，更新选中的章节
      if (data.chapterId && selectedChapterId.value !== data.chapterId) {
        selectedChapterId.value = data.chapterId
      }

      showNotification('内容创建成功', 'success')
      
    } catch (err: any) {
      console.error('创建内容失败:', err)
      showNotification('创建内容失败: ' + (err.message || '未知错误'), 'error')
    }
  }
}

const handleChaptersReorder = async (reorderedChapters: ChapterLocal[]) => {
  try {
    console.log('章节重排序事件接收到:', reorderedChapters.length, '个章节')
    console.log('原有章节数量:', chapters.value.length)
    console.log('重排序后的章节:', reorderedChapters.map(c => ({ id: c.id, title: c.title, parentId: c.parentId, level: c.level, orderIndex: c.orderIndex })))
    
    // 检查数据完整性
    const originalIds = new Set(chapters.value.map(c => c.id))
    const newIds = new Set(reorderedChapters.map(c => c.id))
    
    // 确保没有丢失章节
    const missingIds = [...originalIds].filter(id => !newIds.has(id))
    const addedIds = [...newIds].filter(id => !originalIds.has(id))
    
    if (missingIds.length > 0) {
      console.warn('丢失的章节ID:', missingIds)
      // 找回丢失的章节
      const missingChapters = chapters.value.filter(c => missingIds.includes(c.id))
      reorderedChapters.push(...missingChapters)
      console.log('已恢复丢失的章节:', missingChapters.map(c => c.title))
    }
    
    if (addedIds.length > 0) {
      console.log('新增的章节ID:', addedIds)
    }
    
    // 先更新本地状态
    chapters.value.splice(0, chapters.value.length, ...reorderedChapters)
    
    console.log('更新后的章节状态:', chapters.value.length, '个章节')
    console.log('章节层级结构:', chapters.value.map(c => ({ id: c.id, title: c.title, parentId: c.parentId, level: c.level, orderIndex: c.orderIndex })))
    
    // 保存到数据库
    if (reorderedChapters.length > 0) {
      const chapterOrders = reorderedChapters.map(chapter => ({
        id: chapter.id,
        parentId: chapter.parentId,
        orderIndex: chapter.orderIndex,
        level: chapter.level
      }))
      
      console.log('开始保存章节顺序到数据库...')
      await chapterApi.reorderChapters(currentAuthor.value!.id, chapterOrders)
      console.log('✅ 章节顺序已保存到数据库')
      showNotification('章节顺序已更新', 'success')
    }
  } catch (error) {
    console.error('Reorder chapters failed:', error)
    showNotification('更新章节顺序失败', 'error')
    // 重新加载章节以恢复正确状态
    if (currentWork.value) {
      await loadWork(currentWork.value.id)
    }
  }
}

// 处理内容重排序
const handleContentsReorder = async (data: { chapterId?: string; contents: Content[] }) => {
  try {
    console.log('内容重排序事件接收到:', data.contents.length, '个内容')
    console.log('章节ID:', data.chapterId || '根目录')
    console.log('重排序后的内容:', data.contents.map(c => ({ id: c.id, title: c.title, chapterId: c.chapterId, orderIndex: c.orderIndex })))
    
    // 保存到数据库
    if (data.contents.length > 0) {
      const contentOrders = data.contents.map(content => ({
        id: content.id,
        chapterId: content.chapterId,
        orderIndex: content.orderIndex
      }))
      
      console.log('开始保存内容顺序到数据库...')
      await contentService.reorderContents(currentAuthor.value!.id, contentOrders)
      console.log('✅ 内容顺序已保存到数据库')
      
      // 更新本地状态
      const updatedContents = contents.value.map(existingContent => {
        const newOrder = contentOrders.find(c => c.id === existingContent.id)
        if (!newOrder) {
          return existingContent
        }
        return {
          ...existingContent,
          chapterId: newOrder.chapterId,
          orderIndex: newOrder.orderIndex
        }
      })
      
      contents.value = [...updatedContents].sort((a, b) => a.orderIndex - b.orderIndex)
      
      console.log('✅ 本地状态已更新')
      showNotification('内容顺序已更新', 'success')
    }
  } catch (error) {
    console.error('Reorder contents failed:', error)
    showNotification('更新内容顺序失败', 'error')
  }
}

const handleChapterSave = async (chapterData: any) => {
  try {
    if (!currentAuthor.value || !currentAuthor.value.id) {
      console.error('❌ 用户信息异常:', { 
        hasAuthor: !!currentAuthor.value,
        authorId: currentAuthor.value?.id,
        author: currentAuthor.value
      })
      alert('用户信息异常，无法保存章节。请重新登录。')
      return
    }

    // 检查用户是否有权限修改此作品
    if (currentWork.value && currentWork.value.authorId !== currentAuthor.value.id) {
      // 检查是否是协作者
      const collaborators = currentWork.value.collaborators?.split(',') || []
      if (!collaborators.includes(currentAuthor.value.id)) {
        alert('您没有权限在此作品中创建章节')
        return
      }
    }

    if (isNewChapter.value) {
      const dataWithAuthor = {
        ...chapterData,
        authorId: currentAuthor.value.id
      }
      console.log('📝 创建章节，数据:', {
        dataWithAuthor,
        hasWorkId: !!dataWithAuthor.workId,
        workId: dataWithAuthor.workId,
        currentWork: currentWork.value?.id,
        chapterData
      })
      
      // 确保 workId 存在
      if (!dataWithAuthor.workId) {
        console.error('❌ workId 缺失！')
        alert('作品信息缺失，无法创建章节')
        return
      }
      
      await chapterApi.create(dataWithAuthor)
    } else {
      if (!editingChapter.value?.id) {
        alert('没有正在编辑的章节')
        return
      }
      await chapterApi.update(editingChapter.value.id, currentAuthor.value.id, chapterData)
    }

    if (currentWork.value) {
      await loadWork(currentWork.value.id)
    }
    showChapterModal.value = false
    showNotification('章节已保存', 'success')
  } catch (error: any) {
    console.error('Save chapter failed:', error)
    // 使用弹框提示业务逻辑错误
    if (error.message) {
      alert(error.message)
    } else {
      alert('保存章节失败: 未知错误')
    }
  }
}

const handleChapterModalClose = () => {
  showChapterModal.value = false
  editingChapter.value = null
}

const createNewContent = async () => {
  try {
    if (!currentAuthor.value || !currentAuthor.value.id) {
      console.error('❌ 用户信息异常:', { 
        hasAuthor: !!currentAuthor.value,
        authorId: currentAuthor.value?.id,
        author: currentAuthor.value
      })
      showNotification('用户信息异常，请重新登录', 'error')
      return
    }

    if (!selectedChapterId.value) {
      showNotification('请先选择章节', 'error')
      return
    }

    if (!currentWork.value) {
      showNotification('作品信息缺失', 'error')
      return
    }

    console.log('创建新内容:', {
      workId: currentWork.value.id,
      chapterId: selectedChapterId.value,
      userId: currentAuthor.value.id
    })

    // 创建空的 ProseMirror 文档
    const emptyProseMirrorDoc = JSON.stringify({
      type: 'doc',
      content: []
    })

    // 生成内容标题
    let contentTitle = '新内容'
    if (selectedChapter.value) {
      // 如果是在章节下创建，获取该章节下已有内容的数量
      const existingContents = contents.value.filter(content => content.chapterId === selectedChapter.value?.id) || []
      const contentIndex = existingContents.length + 1
      contentTitle = `${selectedChapter.value.title} - 第${contentIndex}节`
    } else {
      // 如果是根目录，使用作品标题
      const rootContents = contents.value.filter(content => !content.chapterId) || []
      contentTitle = `${currentWork.value.title} - 内容${rootContents.length + 1}`
    }

    const newContent = await contentService.createContent({
      authorId: currentAuthor.value.id,
      workId: currentWork.value.id,
      chapterId: selectedChapterId.value,
      content: emptyProseMirrorDoc,
      format: 'prosemirror',
      title: contentTitle
    })

    console.log('内容创建成功:', newContent)
    currentContent.value = newContent
    
    // 新创建的内容为空，设置状态为 empty
    hasUnsavedChanges.value = false
    saveStatus.value = 'empty'
    console.log('📄 新建空内容，状态设为: empty')

    // 将新内容加入本地列表
  contents.value = [...contents.value, newContent].sort((a, b) => a.orderIndex - b.orderIndex)

    // 启动自动保存
    startAutoSave()

    // 刷新作品统计信息
    if (currentWork.value) {
      try {
        const stats = await workApi.getStats(currentWork.value.id, currentAuthor.value.id)
        workStats.value = stats
      } catch (statsError) {
        console.error('刷新作品统计失败:', statsError)
      }
    }
    
    showNotification('已创建新内容，开始写作吧！', 'success')
  } catch (error: any) {
    console.error('Create content failed:', error)
    showNotification(`创建内容失败: ${error.message || '未知错误'}`, 'error')
  }
}

const handleTitleUpdated = (title: string) => {
  const activeContent = currentContent.value
  if (activeContent) {
    // 更新当前内容的标题
    activeContent.title = title
    
    // 同时更新 contents 数组中对应的内容项，确保章节树实时刷新
    const contentIndex = contents.value.findIndex(content => content.id === activeContent.id)
    if (contentIndex !== -1) {
      contents.value[contentIndex] = {
        ...contents.value[contentIndex],
        title: title
      }
      
      // 强制触发响应式更新
      contents.value = [...contents.value]
    }
  }
}

const handleCreateWork = () => {
  showWorkModal.value = true
}

const handleWorkSave = async (workData: any) => {
  try {
    if (!currentAuthor.value || !currentAuthor.value.id) {
      console.error('❌ 用户信息异常')
      showNotification('用户信息异常，请重新登录', 'error')
      return
    }

    const newWork = await workApi.create(currentAuthor.value.id, workData)
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
  height: 100%;
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  grid-template-rows: 1fr;
  gap: 0;
  background: #f5f6fa;
  overflow: hidden;
}

.sidebar {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #e8eaed;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
  height: 100%;
}

.work-info {
  padding: 24px 20px;
  border-bottom: 1px solid #e8eaed;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex-shrink: 0;
}

.work-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.work-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.stat-item .label {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.stat-item .value {
  font-weight: 700;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
}

.chapter-section {
  flex: 1;
  overflow: hidden;
}

.main-editor-area {
  background: #ffffff;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.03);
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

/* 协作模式指示器 */
.collaboration-mode-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-bottom: 1px solid #e8eaed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}

.mode-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.mode-badge.mode-private {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.mode-badge.mode-team {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
}

.mode-badge.mode-public {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(79, 172, 254, 0.3);
}

.mode-icon {
  font-size: 16px;
  line-height: 1;
}

.mode-label {
  letter-spacing: 0.3px;
}

.mode-description {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

.create-content,
.loading-content,
.welcome-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  flex-direction: column;
}

.loading-spinner {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner p {
  color: #666;
  font-size: 14px;
  margin: 0;
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
  padding: 14px 28px;
  border: 2px solid transparent;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.3s ease;
  margin: 0 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.action-btn.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.start-writing-btn:hover,
.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.action-btn.primary:hover {
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.right-sidebar {
  background: #ffffff;
  padding: 24px 20px;
  overflow-y: auto;
  border-left: 1px solid #e8eaed;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.02);
  height: 100%;
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
  padding: 18px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 12px;
  text-align: center;
  border: 1px solid #e8eaed;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
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

/* 编辑器底部状态栏 */
.editor-status-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e8eaed;
  font-size: 13px;
  color: #6b7280;
  z-index: 10;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.save-status {
  font-weight: 500;
  transition: color 0.3s ease;
}

.save-status.empty {
  color: #9ca3af;
}

.save-status.unsaved {
  color: #f59e0b;
}

.save-status.saving {
  color: #3b82f6;
}

.save-status.saved {
  color: #10b981;
}

.save-status.error {
  color: #ef4444;
}

.status-icon {
  font-size: 14px;
  display: inline-flex;
  align-items: center;
}

.word-count {
  color: #6b7280;
  font-variant-numeric: tabular-nums;
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