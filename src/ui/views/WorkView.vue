<!--
  作品详情视图
-->
<template>
  <div class="work-view">
    <!-- 作品头部 -->
    <div class="work-header">
      <div class="header-content">
        <button 
          @click="$router.back()" 
          class="back-button"
          title="返回"
        >
          ← 返回
        </button>
        
        <div class="work-info" v-if="currentWork">
          <h1 class="work-title">{{ currentWork.title }}</h1>
          <p class="work-description" v-if="currentWork.description">
            {{ currentWork.description }}
          </p>
          <div class="work-meta">
            <span class="chapter-count">{{ chapterCount }} 章节</span>
            <span class="updated-time">
              更新于 {{ formatDate(currentWork.updatedAt) }}
            </span>
          </div>
        </div>
        
        <div class="header-actions">
          <button @click="showCreateChapter = true" class="btn btn-primary">
            + 新建章节
          </button>
          <button @click="showWorkSettings = true" class="btn btn-secondary">
            作品设置
          </button>
        </div>
      </div>
    </div>

    <!-- 章节列表 -->
    <div class="chapters-section">
      <div class="section-header">
        <h2>章节结构</h2>
        <div class="view-controls">
          <button 
            :class="['view-btn', { active: viewMode === 'list' }]"
            @click="viewMode = 'list'"
          >
            列表视图
          </button>
          <button 
            :class="['view-btn', { active: viewMode === 'tree' }]"
            @click="viewMode = 'tree'"
          >
            树形视图
          </button>
        </div>
      </div>

      <!-- 章节内容 -->
      <div class="chapters-content">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <div v-else-if="chapters.length === 0" class="empty-state">
          <div class="empty-icon">📄</div>
          <h3>还没有章节</h3>
          <p>开始创建你的第一个章节吧</p>
          <button @click="showCreateChapter = true" class="btn btn-primary">
            创建章节
          </button>
        </div>
        <div v-else>
          <!-- 列表视图 -->
          <div v-if="viewMode === 'list'" class="chapters-list">
            <div
              v-for="chapter in sortedChapters"
              :key="chapter.id"
              class="chapter-item"
              @click="openEditor(chapter.id)"
            >
              <div class="chapter-icon">📖</div>
              <div class="chapter-content">
                <h3 class="chapter-title">{{ chapter.title }}</h3>
                <p class="chapter-subtitle" v-if="chapter.subtitle">
                  {{ chapter.subtitle }}
                </p>
                <div class="chapter-stats">
                  <span>字数: {{ (chapter as any).wordCount || 0 }}</span>
                  <span>更新: {{ formatDate(chapter.updatedAt) }}</span>
                </div>
              </div>
              <div class="chapter-actions" @click.stop>
                <button @click="editChapter(chapter)" class="action-btn" title="编辑">
                  ✏️
                </button>
                <button @click="deleteChapter(chapter.id)" class="action-btn" title="删除">
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <!-- 树形视图 -->
          <div v-else class="chapters-tree">
            <ChapterTree 
              :chapters="chapters"
              @chapter-edit="editChapter"
              @chapter-delete="deleteChapter"
            />
          </div>
        </div>
      </div>
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
import type { Work, Chapter, ChapterData } from '../../shared/types'

const route = useRoute()
const router = useRouter()
const workStore = useWorkStore()
const chapterStore = useChapterStore()

// 响应式状态
const loading = ref(false)
const error = ref<string | null>(null)
const chapters = ref<Chapter[]>([])
const viewMode = ref<'list' | 'tree'>('tree')
const showCreateChapter = ref(false)
const showWorkSettings = ref(false)

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
    const response = await (window as any).gestell.chapter.list(workId.value)
    chapters.value = response.chapters || []
  } catch (err: any) {
    console.error('加载章节失败:', err)
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
    
    // 直接打开编辑器
    openEditor(response.chapter.id)
  } catch (err: any) {
    error.value = err.message || '创建章节失败'
  }
}

const openEditor = (chapterId: string) => {
  chapterStore.selectChapter(chapterId)
  console.log('WorkView: 选中后 selectedChapterId:', chapterStore.selectedChapterId)
  router.push(`/editor/${workId.value}/${chapterId}`)
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
  loadWork()
})
</script>

<style scoped>
.work-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.work-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 16px 24px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.back-button {
  padding: 8px 12px;
  background: none;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #6c757d;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.back-button:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.work-info {
  flex: 1;
}

.work-title {
  margin: 0 0 8px 0;
  color: #212529;
  font-size: 24px;
  font-weight: 600;
}

.work-description {
  margin: 0 0 12px 0;
  color: #6c757d;
  font-size: 16px;
  line-height: 1.5;
}

.work-meta {
  display: flex;
  gap: 16px;
  color: #6c757d;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.chapters-section {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  overflow-y: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;
  color: #212529;
  font-size: 20px;
  font-weight: 600;
}

.view-controls {
  display: flex;
  gap: 4px;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 2px;
}

.view-btn {
  padding: 6px 12px;
  border: none;
  background: none;
  color: #6c757d;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn:hover {
  color: #495057;
}

.view-btn.active {
  background: #ffffff;
  color: #0d6efd;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading, .error {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
}

.error {
  color: #dc3545;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  color: #495057;
  font-size: 20px;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #6c757d;
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.chapter-item:hover {
  border-color: #0d6efd;
  box-shadow: 0 2px 8px rgba(13, 110, 253, 0.1);
}

.chapter-icon {
  font-size: 24px;
  margin-right: 16px;
}

.chapter-content {
  flex: 1;
}

.chapter-title {
  margin: 0 0 4px 0;
  color: #212529;
  font-size: 16px;
  font-weight: 500;
}

.chapter-subtitle {
  margin: 0 0 8px 0;
  color: #6c757d;
  font-size: 14px;
}

.chapter-stats {
  display: flex;
  gap: 16px;
  color: #6c757d;
  font-size: 12px;
}

.chapter-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.chapter-item:hover .chapter-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px 8px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #f8f9fa;
}

.btn {
  padding: 8px 16px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #0d6efd;
  border-color: #0d6efd;
  color: white;
}

.btn-primary:hover {
  background: #0b5ed7;
  border-color: #0a58ca;
}

.btn-primary:disabled {
  background: #6c757d;
  border-color: #6c757d;
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5c636a;
  border-color: #565e64;
}

.btn-cancel {
  background: #f8f9fa;
  border-color: #dee2e6;
  color: #6c757d;
}

.btn-cancel:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

/* 模态框样式 */
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
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  color: #212529;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6c757d;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #495057;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #495057;
  font-size: 14px;
  font-weight: 500;
}

.form-input, .form-textarea, .form-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h4 {
  margin: 0 0 16px 0;
  color: #495057;
  font-size: 16px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .chapters-section {
    padding: 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .chapter-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .chapter-actions {
    opacity: 1;
    width: 100%;
    justify-content: flex-end;
    margin-top: 12px;
  }
}
</style>