<!--
  作品详情视图 - 三栏布局
-->
<template>
  <div class="work-view">
    <!-- 顶部工具栏 -->
    <div class="work-header">
      <button 
        @click="$router.back()" 
        class="back-button"
        title="返回"
      >
        ← 返回
      </button>
      
      <div class="work-title" v-if="currentWork">
        <h1>{{ currentWork.title }}</h1>
      </div>
      
      <div class="header-actions">
        <button @click="showCreateChapter = true" class="btn btn-primary">
          + 新建章节
        </button>
        <button @click="showWorkSettings = true" class="btn btn-secondary">
          设置
        </button>
      </div>
    </div>

    <!-- 三栏主体 -->
    <div class="work-main">
      <!-- 左侧：章节树 -->
      <div class="sidebar-left">
        <div class="sidebar-header">
          <h3>章节目录</h3>
          <div class="view-toggle">
            <button 
              :class="{ active: viewMode === 'tree' }"
              @click="viewMode = 'tree'"
              title="树形视图"
            >
              🌳
            </button>
            <button 
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
              title="列表视图"
            >
              📄
            </button>
          </div>
        </div>
        
        <div class="sidebar-content">
          <div v-if="loading" class="loading">加载中...</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else-if="chapters.length === 0" class="empty-state">
            <div class="empty-icon">📄</div>
            <p>还没有章节</p>
            <button @click="showCreateChapter = true" class="btn-small">
              创建章节
            </button>
          </div>
          <div v-else>
            <!-- 树形视图 -->
            <ChapterTree 
              v-if="viewMode === 'tree'"
              :chapters="chapters"
              :contents="contents as any"
              :work-id="workId"
              @chapter-click="handleChapterClick"
              @chapter-edit="editChapter"
              @chapter-delete="deleteChapter"
              @add-content="handleAddContent"
              @content-select="handleContentSelect"
            />
            
            <!-- 列表视图 -->
            <div v-else class="chapters-list">
              <div
                v-for="chapter in sortedChapters"
                :key="chapter.id"
                class="chapter-item"
                @click="handleChapterClick(chapter.id)"
              >
                <div class="chapter-info">
                  <div class="chapter-title">{{ chapter.title }}</div>
                  <div class="chapter-stats">
                    {{ (chapter as any).wordCount || 0 }} 字
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：内容编辑区 -->
      <div class="content-main">
        <!-- 欢迎界面 -->
        <WelcomePanel v-if="!currentContentId" />
        
        <!-- 内容编辑器 -->
        <div v-else class="editor-container">
          <div class="editor-header">
            <input 
              v-model="currentContentTitle" 
              type="text" 
              class="content-title-input"
              placeholder="内容标题"
              @blur="updateContentTitle"
            />
            <button @click="closeEditor" class="btn-close">✕</button>
          </div>
          <div class="editor-wrapper">
            <ProseMirrorEditor 
              :content="currentContentData"
              @update="handleContentUpdate"
            />
          </div>
        </div>
      </div>

      <!-- 右侧：可选的工具栏或信息面板 -->
      <!-- <div class="sidebar-right">
        右侧可以放大纲、统计信息等
      </div> -->
    </div>

    <!-- 创建章节对话框 -->
    <div v-if="showCreateChapter" class="modal-overlay" @click="showCreateChapter = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>创建新章节</h3>
          <button @click="showCreateChapter = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="createChapter">
            <div class="form-group">
              <label for="chapter-title">章节标题 *</label>
              <input
                id="chapter-title"
                v-model="newChapter.title"
                type="text"
                required
                placeholder="输入章节标题"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="chapter-subtitle">章节副标题</label>
              <input
                id="chapter-subtitle"
                v-model="newChapter.subtitle"
                type="text"
                placeholder="输入章节副标题（可选）"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="chapter-description">章节描述</label>
              <textarea
                id="chapter-description"
                v-model="newChapter.description"
                placeholder="输入章节描述（可选）"
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>
            <div class="form-actions">
              <button type="button" @click="showCreateChapter = false" class="btn btn-cancel">
                取消
              </button>
              <button type="submit" class="btn btn-primary" :disabled="!newChapter.title?.trim()">
                创建章节
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 添加内容对话框 -->
    <div v-if="showAddContentModal" class="modal-overlay" @click="showAddContentModal = false">
      <div class="modal-content modal-small" @click.stop>
        <div class="modal-header">
          <h3>添加内容</h3>
          <button @click="showAddContentModal = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="createAndOpenContent">
            <div class="form-group">
              <label for="content-title">内容标题 *</label>
              <input
                id="content-title"
                v-model="newContentTitle"
                type="text"
                required
                placeholder="输入内容标题"
                class="form-input"
                autofocus
              />
            </div>
            <div class="form-actions">
              <button type="button" @click="showAddContentModal = false" class="btn btn-cancel">
                取消
              </button>
              <button type="submit" class="btn btn-primary" :disabled="!newContentTitle.trim()">
                创建并编辑
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 作品设置对话框 -->
    <div v-if="showWorkSettings" class="modal-overlay" @click="showWorkSettings = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>作品设置</h3>
          <button @click="showWorkSettings = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="settings-section">
            <h4>基本信息</h4>
            <div class="form-group">
              <label>作品标题</label>
              <input v-model="workSettings.title" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label>作品描述</label>
              <textarea v-model="workSettings.description" class="form-textarea" rows="3"></textarea>
            </div>
            <div class="form-group">
              <label>类型</label>
              <select v-model="workSettings.genre" class="form-select">
                <option value="">请选择类型</option>
                <option value="科幻">科幻</option>
                <option value="奇幻">奇幻</option>
                <option value="都市">都市</option>
                <option value="历史">历史</option>
                <option value="悬疑">悬疑</option>
                <option value="言情">言情</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button @click="showWorkSettings = false" class="btn btn-cancel">取消</button>
            <button @click="saveWorkSettings" class="btn btn-primary">保存设置</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkStore } from '../stores/work'
import { useChapterStore } from '../stores/chapter'
import ChapterTree from '../components/ChapterTree/index.vue'
import WelcomePanel from '../components/WelcomePanel.vue'
import ProseMirrorEditor from '../components/ProseMirrorEditor.vue'
import type { Work, Chapter, ChapterData, Content } from '../../shared/types'

const route = useRoute()
const router = useRouter()
const workStore = useWorkStore()
const chapterStore = useChapterStore()

// 响应式状态
const loading = ref(false)
const error = ref<string | null>(null)
const chapters = ref<Chapter[]>([])
const contents = ref<Content[]>([])  // 添加 contents 数据
const viewMode = ref<'list' | 'tree'>('tree')
const showCreateChapter = ref(false)
const showWorkSettings = ref(false)

// 内容编辑相关状态
const currentContentId = ref<string | null>(null)
const currentContentTitle = ref('')
const currentContentData = ref<any>(null)
const showAddContentModal = ref(false)
const newContentTitle = ref('')
const pendingChapterId = ref<string | null>(null)

// 新章节表单
const newChapter = ref<Partial<ChapterData>>({
  title: '',
  subtitle: '',
  description: '',
  workId: '',
  orderIndex: 0
})

// 作品设置表单
const workSettings = ref<Partial<Work>>({
  title: '',
  description: '',
  genre: ''
})

// 计算属性
const workId = computed(() => route.params.id as string)
const currentWork = computed(() => workStore.currentWork)
const chapterCount = computed(() => chapters.value.length)

const sortedChapters = computed(() => {
  return [...chapters.value].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
})

// 方法
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadWork = async () => {
  if (!workId.value) return
  
  loading.value = true
  error.value = null
  
  try {
    await workStore.selectWork(workId.value)
    await loadChapters()
    
    // 初始化作品设置表单
    if (currentWork.value) {
      workSettings.value = {
        title: currentWork.value.title,
        description: currentWork.value.description,
        genre: currentWork.value.genre
      }
    }
  } catch (err: any) {
    error.value = err.message || '加载作品失败'
  } finally {
    loading.value = false
  }
}

const loadChapters = async () => {
  if (!workId.value) return
  
  try {
    // 加载章节
    const chaptersResponse = await (window as any).gestell.chapter.list(workId.value)
    chapters.value = chaptersResponse.chapters || []
    
    // 加载内容
    const contentsResponse = await (window as any).gestell.content.getByWork(workId.value)
    contents.value = contentsResponse?.contents || []
    
    console.log('加载完成:', {
      chapters: chapters.value.length,
      contents: contents.value.length
    })
  } catch (err: any) {
    console.error('加载章节和内容失败:', err)
  }
}

const createChapter = async () => {
  if (!newChapter.value.title?.trim() || !workId.value) return
  
  const chapterData: ChapterData = {
    title: newChapter.value.title.trim(),
    subtitle: newChapter.value.subtitle?.trim() || undefined,
    description: newChapter.value.description?.trim() || undefined,
    workId: workId.value,
    orderIndex: chapters.value.length + 1
  }
  
  try {
    const response = await (window as any).gestell.chapter.create(chapterData)
    chapters.value.push(response.chapter)
    
    // 重置表单
    newChapter.value = { title: '', subtitle: '', description: '', workId: '', orderIndex: 0 }
    showCreateChapter.value = false
    
  } catch (err: any) {
    error.value = err.message || '创建章节失败'
  }
}

// 点击章节 - 只选中，不打开编辑器
const handleChapterClick = (chapterId: string) => {
  console.log('章节被点击:', chapterId)
  // 只选中章节，不做其他操作
}

// 添加内容
const handleAddContent = async (data: { title?: string, type?: string, workId?: string, chapterId?: string }) => {
  console.log('WorkView: handleAddContent 被调用', data)
  
  // 如果只有 chapterId（来自章节树按钮），打开旧的模态框
  if (!data.title && data.chapterId) {
    pendingChapterId.value = data.chapterId
    showAddContentModal.value = true
    newContentTitle.value = ''
    return
  }
  
  // 如果有 title（来自 ContentCreateModal），直接创建内容
  if (data.title) {
    try {
      const userId = '01K74VN2BS7BY4QXYJNYZNMMRR' // TODO: 从 userStore 获取
      
      console.log('准备创建内容，参数:', {
        userId,
        contentData: {
          workId: workId.value,
          chapterId: data.chapterId,
          title: data.title,
          content: JSON.stringify({ type: 'doc', content: [] }),
          format: 'prosemirror'
        }
      })
      
      const response = await (window as any).gestell.content.create(userId, {
        workId: workId.value,
        chapterId: data.chapterId, // 可以是 undefined（根目录）
        title: data.title,
        content: JSON.stringify({ type: 'doc', content: [] }),
        format: 'prosemirror' as const
      })
      
      console.log('内容创建成功:', response)
      
      // 打开编辑器
      // response 直接就是 ContentInfo 对象
      currentContentId.value = response.id
      currentContentTitle.value = response.title
      currentContentData.value = JSON.parse(response.content)
      
      // 刷新章节树数据
      await loadChapters()
      
    } catch (err: any) {
      console.error('创建内容失败:', err)
      error.value = err.message || '创建内容失败'
    }
  }
}

// 创建内容并打开编辑器
const createAndOpenContent = async () => {
  if (!newContentTitle.value.trim() || !pendingChapterId.value) return
  
  try {
    // 获取当前用户ID（假设从userStore获取）
    const userId = '01K74VN2BS7BY4QXYJNYZNMMRR' // TODO: 从 userStore 获取
    
    const response = await (window as any).gestell.content.create(userId, {
      title: newContentTitle.value.trim(),
      chapterId: pendingChapterId.value,
      workId: workId.value,
      contentJson: { type: 'doc', content: [] },
      orderIndex: 0
    })
    
    console.log('内容创建成功:', response)
    
    // 打开编辑器
    // response 直接就是 ContentInfo 对象
    currentContentId.value = response.id
    currentContentTitle.value = response.title
    currentContentData.value = response.contentJson || { type: 'doc', content: [] }
    
    // 关闭模态框
    showAddContentModal.value = false
    newContentTitle.value = ''
    pendingChapterId.value = null
    
  } catch (err: any) {
    console.error('创建内容失败:', err)
    error.value = err.message || '创建内容失败'
  }
}

// 选择内容
const handleContentSelect = async (contentId: string) => {
  try {
    const response = await (window as any).gestell.content.getById(contentId)
    console.log('加载内容:', response)
    // response 直接就是 ContentInfo 对象
    currentContentId.value = response.id
    currentContentTitle.value = response.title
    currentContentData.value = response.contentJson || { type: 'doc', content: [] }
  } catch (err: any) {
    console.error('加载内容失败:', err)
    error.value = err.message || '加载内容失败'
  }
}

// 更新内容标题
const updateContentTitle = async () => {
  if (!currentContentId.value || !currentContentTitle.value.trim()) return
  
  try {
    const userId = '01K74VN2BS7BY4QXYJNYZNMMRR' // TODO: 从 userStore 获取
    await (window as any).gestell.content.update(currentContentId.value, userId, {
      title: currentContentTitle.value.trim()
    })
  } catch (err: any) {
    console.error('更新标题失败:', err)
    error.value = err.message || '更新标题失败'
  }
}

// 更新内容
const handleContentUpdate = async (content: any) => {
  if (!currentContentId.value) return
  
  try {
    const userId = '01K74VN2BS7BY4QXYJNYZNMMRR' // TODO: 从 userStore 获取
    await (window as any).gestell.content.update(currentContentId.value, userId, {
      contentJson: content
    })
    currentContentData.value = content
  } catch (err: any) {
    console.error('保存内容失败:', err)
    error.value = err.message || '保存内容失败'
  }
}

// 关闭编辑器
const closeEditor = () => {
  currentContentId.value = null
  currentContentTitle.value = ''
  currentContentData.value = null
}

const editChapter = (chapter: Chapter) => {
  // TODO: 实现章节编辑
  console.log('编辑章节:', chapter)
}

const deleteChapter = async (chapterId: string) => {
  if (!confirm('确定要删除这个章节吗？此操作不可撤销。')) return
  
  try {
    // TODO: 实现删除章节的 API
    console.log('删除章节:', chapterId)
  } catch (err: any) {
    error.value = err.message || '删除章节失败'
  }
}

const saveWorkSettings = async () => {
  if (!workId.value || !workSettings.value.title?.trim()) return
  
  try {
    // TODO: 实现更新作品设置的 API
    console.log('保存作品设置:', workSettings.value)
    showWorkSettings.value = false
  } catch (err: any) {
    error.value = err.message || '保存设置失败'
  }
}

// 监听路由变化
watch(() => route.params.id, () => {
  loadWork()
})

// 生命周期
onMounted(() => {
  console.log('WorkView onMounted, route.params:', route.params)
  console.log('WorkView onMounted, workId:', workId.value)
  loadWork()
})
</script>

<style scoped>
.work-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
}

/* 顶部工具栏 */
.work-header {
  height: 56px;
  min-height: 56px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e1e4e8;
  gap: 16px;
}

.back-button {
  padding: 6px 12px;
  background: none;
  border: 1px solid #d1d5da;
  border-radius: 6px;
  color: #24292e;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
}

.back-button:hover {
  background: #e1e4e8;
}

.work-title {
  flex: 1;
  min-width: 0;
}

.work-title h1 {
  font-size: 18px;
  font-weight: 600;
  color: #24292e;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* 三栏主体 */
.work-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧边栏 */
.sidebar-left {
  width: 300px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
  border-right: 1px solid #e1e4e8;
}

.sidebar-header {
  height: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #e1e4e8;
}

.sidebar-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #24292e;
  margin: 0;
}

.view-toggle {
  display: flex;
  gap: 4px;
}

.view-toggle button {
  padding: 4px 8px;
  border: 1px solid #d1d5da;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.view-toggle button.active {
  background: #0366d6;
  border-color: #0366d6;
  color: white;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* 中间内容区 */
.content-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  overflow: hidden;
}

.editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  height: 60px;
  min-height: 60px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #e1e4e8;
  gap: 16px;
}

.content-title-input {
  flex: 1;
  font-size: 24px;
  font-weight: 600;
  border: none;
  outline: none;
  padding: 8px 0;
  background: transparent;
}

.content-title-input::placeholder {
  color: #959da5;
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 20px;
  color: #586069;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #e1e4e8;
}

.editor-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* 章节列表 */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chapter-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.chapter-item:hover {
  background: #f3f4f6;
}

.chapter-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chapter-title {
  font-size: 14px;
  color: #24292e;
  font-weight: 500;
}

.chapter-stats {
  font-size: 12px;
  color: #586069;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  color: #586069;
  margin: 8px 0 16px;
}

/* 按钮样式 */
.btn {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary {
  background: #0366d6;
  color: white;
  border-color: #0366d6;
}

.btn-primary:hover {
  background: #0256c7;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #24292e;
  border-color: #d1d5da;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.btn-cancel {
  background: white;
  color: #586069;
  border-color: #d1d5da;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
}

/* 加载和错误状态 */
.loading, .error {
  text-align: center;
  padding: 24px;
  color: #586069;
}

.error {
  color: #d73a49;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.modal-small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e1e4e8;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #24292e;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 24px;
  color: #586069;
  line-height: 1;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

/* 表单样式 */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #24292e;
  margin-bottom: 8px;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5da;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #0366d6;
  box-shadow: 0 0 0 3px rgba(3, 102, 214, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar-left {
    width: 250px;
    min-width: 250px;
  }
  
  .work-title h1 {
    font-size: 16px;
  }
}
</style>
