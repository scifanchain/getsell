<!--
  作品详情视图 - 只读展示页面
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
        <button @click="startWriting" class="btn btn-primary">
          📝 开始写作
        </button>
        <button @click="showWorkSettings = true" class="btn btn-secondary">
          设置
        </button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="work-main">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <p>加载中...</p>
      </div>
      <div v-else-if="error" class="error-state">
        <div class="error-icon">❌</div>
        <p>{{ error }}</p>
        <button @click="loadWork" class="btn btn-primary">重试</button>
      </div>
      <div v-else class="work-content">
        <!-- 章节列表 -->
        <div class="chapters-section">
          <!-- 两栏布局：左侧目录 + 右侧内容 -->
          <div class="chapters-layout">
            <!-- 左侧章节目录 -->
            <div class="chapters-sidebar">
              <div class="sidebar-header">
                <h3>章节目录</h3>
                <div class="chapters-count">{{ chapters.length }} 章</div>
              </div>
              
              <div v-if="chapters.length === 0" class="empty-chapters">
                <div class="empty-icon">📄</div>
                <p>还没有章节</p>
                <button @click="startWriting" class="btn btn-primary btn-small">开始创作</button>
              </div>
              
              <div v-else class="chapters-nav">
                <!-- 递归渲染章节树 -->
                <template v-for="(chapter, index) in chapterTree" :key="chapter.id">
                  <!-- 一级章节 -->
                  <div
                    :class="['nav-item', 'nav-level-0', { active: activeChapterId === chapter.id }]"
                    @click="scrollToChapter(chapter.id)"
                  >
                    <div class="nav-number">{{ index + 1 }}</div>
                    <div class="nav-content">
                      <div class="nav-title">{{ chapter.title }}</div>
                      <div class="nav-stats">
                        <span>{{ formatWordCount(getChapterWordCount(chapter.id)) }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 一级章节的内容列表 -->
                  <template v-for="content in getChapterContents(chapter.id)" :key="content.id">
                    <div
                      :class="['nav-item', 'nav-level-content', 'nav-content-0', { active: activeContentId === content.id }]"
                      @click="scrollToContent(content.id)"
                    >
                      <div class="nav-content-icon">📄</div>
                      <div class="nav-content">
                        <div class="nav-title">{{ content.title }}</div>
                        <div class="nav-stats">
                          <span>{{ formatWordCount(getContentWordCount(content)) }}</span>
                        </div>
                      </div>
                    </div>
                  </template>
                  
                  <!-- 二级章节 -->
                  <template v-if="chapter.children && chapter.children.length > 0">
                    <template v-for="(child2, child2Index) in chapter.children" :key="child2.id">
                      <div
                        :class="['nav-item', 'nav-level-1', { active: activeChapterId === child2.id }]"
                        @click="scrollToChapter(child2.id)"
                      >
                        <div class="nav-number">{{ index + 1 }}.{{ child2Index + 1 }}</div>
                        <div class="nav-content">
                          <div class="nav-title">{{ child2.title }}</div>
                          <div class="nav-stats">
                            <span>{{ formatWordCount(getChapterWordCount(child2.id)) }}</span>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 二级章节的内容列表 -->
                      <template v-for="content in getChapterContents(child2.id)" :key="content.id">
                        <div
                          :class="['nav-item', 'nav-level-content', 'nav-content-1', { active: activeContentId === content.id }]"
                          @click="scrollToContent(content.id)"
                        >
                          <div class="nav-content-icon">📄</div>
                          <div class="nav-content">
                            <div class="nav-title">{{ content.title }}</div>
                            <div class="nav-stats">
                              <span>{{ formatWordCount(getContentWordCount(content)) }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                      
                      <!-- 三级章节 -->
                      <template v-for="(child3, child3Index) in child2.children" v-if="child2.children && child2.children.length > 0" :key="child3.id">
                        <div
                          :class="['nav-item', 'nav-level-2', { active: activeChapterId === child3.id }]"
                          @click="scrollToChapter(child3.id)"
                        >
                          <div class="nav-number">{{ index + 1 }}.{{ child2Index + 1 }}.{{ child3Index + 1 }}</div>
                          <div class="nav-content">
                            <div class="nav-title">{{ child3.title }}</div>
                            <div class="nav-stats">
                              <span>{{ formatWordCount(getChapterWordCount(child3.id)) }}</span>
                            </div>
                          </div>
                        </div>
                        
                        <!-- 三级章节的内容列表 -->
                        <template v-for="content in getChapterContents(child3.id)" :key="content.id">
                          <div
                            :class="['nav-item', 'nav-level-content', 'nav-content-2', { active: activeContentId === content.id }]"
                            @click="scrollToContent(content.id)"
                          >
                            <div class="nav-content-icon">📄</div>
                            <div class="nav-content">
                              <div class="nav-title">{{ content.title }}</div>
                              <div class="nav-stats">
                                <span>{{ formatWordCount(getContentWordCount(content)) }}</span>
                              </div>
                            </div>
                          </div>
                        </template>
                      </template>
                    </template>
                  </template>
                </template>
              </div>
            </div>
            
            <!-- 中间章节内容 -->
            <div class="chapters-content" ref="chaptersContentRef" @scroll="handleContentScroll">
              <div v-if="chapters.length === 0" class="empty-content">
                <div class="empty-message">
                  <div class="empty-icon">✏️</div>
                  <h4>开始你的创作之旅</h4>
                  <p>这里还没有任何章节，点击开始创作来写下第一章吧！</p>
                  <button @click="startWriting" class="btn btn-primary">开始创作第一章</button>
                </div>
              </div>
              
              <div v-else class="content-sections">
                <!-- 递归渲染章节内容 -->
                <template v-for="(chapter, index) in chapterTree" :key="chapter.id">
                  <!-- 一级章节内容 -->
                  <div
                    :id="`chapter-${chapter.id}`"
                    class="chapter-section chapter-level-0"
                  >
                    <div class="chapter-header">
                      <div class="chapter-number">{{ index + 1 }}</div>
                      <div class="chapter-info">
                        <h2 class="chapter-title chapter-title-level-0">{{ chapter.title }}</h2>
                        <p v-if="chapter.subtitle" class="chapter-subtitle">{{ chapter.subtitle }}</p>
                        <div class="chapter-meta">
                          <span class="meta-item">📄 {{ getChapterContentCount(chapter.id) }} 节</span>
                          <span class="meta-item">📝 {{ formatWordCount(getChapterWordCount(chapter.id)) }}</span>
                          <span class="meta-item">🕒 {{ formatDate(chapter.updatedAt) }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- 章节内容 -->
                    <div v-if="getChapterContents(chapter.id).length > 0" class="chapter-contents">
                      <div
                        v-for="content in getChapterContents(chapter.id)"
                        :key="content.id"
                        :id="`content-${content.id}`"
                        class="content-item"
                      >
                        <div class="content-header">
                          <h6 class="content-title" @click="scrollToContent(content.id)">{{ content.title }}</h6>
                          <div class="content-meta">
                            <span>📝 {{ formatWordCount(getContentWordCount(content)) }}</span>
                            <span>🕒 {{ formatDate(content.updatedAt) }}</span>
                          </div>
                        </div>
                        <div 
                          class="content-preview"
                        >
                          <ProseMirrorRenderer :content="content.contentJson || content.content || ''" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 二级章节内容 -->
                  <template v-if="chapter.children && chapter.children.length > 0">
                    <template v-for="(child2, child2Index) in chapter.children" :key="child2.id">
                      <div
                        :id="`chapter-${child2.id}`"
                        class="chapter-section chapter-level-1"
                      >
                        <div class="chapter-header">
                          <div class="chapter-number">{{ index + 1 }}.{{ child2Index + 1 }}</div>
                          <div class="chapter-info">
                            <h3 class="chapter-title chapter-title-level-1">{{ child2.title }}</h3>
                            <p v-if="child2.subtitle" class="chapter-subtitle">{{ child2.subtitle }}</p>
                            <div class="chapter-meta">
                              <span class="meta-item">📄 {{ getChapterContentCount(child2.id) }} 节</span>
                              <span class="meta-item">📝 {{ formatWordCount(getChapterWordCount(child2.id)) }}</span>
                              <span class="meta-item">🕒 {{ formatDate(child2.updatedAt) }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- 章节内容 -->
                        <div v-if="getChapterContents(child2.id).length > 0" class="chapter-contents">
                          <div
                            v-for="content in getChapterContents(child2.id)"
                            :key="content.id"
                            :id="`content-${content.id}`"
                            class="content-item"
                          >
                            <div class="content-header">
                              <h6 class="content-title" @click="scrollToContent(content.id)">{{ content.title }}</h6>
                              <div class="content-meta">
                                <span>📝 {{ formatWordCount(getContentWordCount(content)) }}</span>
                                <span>🕒 {{ formatDate(content.updatedAt) }}</span>
                              </div>
                            </div>
                            <div 
                              class="content-preview"
                            >
                              <ProseMirrorRenderer :content="content.contentJson || content.content || ''" />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 三级章节内容 -->
                      <div
                        v-for="(child3, child3Index) in child2.children"
                        v-if="child2.children && child2.children.length > 0"
                        :key="child3.id"
                        :id="`chapter-${child3.id}`"
                        class="chapter-section chapter-level-2"
                      >
                        <div class="chapter-header">
                          <div class="chapter-number">{{ index + 1 }}.{{ child2Index + 1 }}.{{ child3Index + 1 }}</div>
                          <div class="chapter-info">
                            <h4 class="chapter-title chapter-title-level-2">{{ child3.title }}</h4>
                            <p v-if="child3.subtitle" class="chapter-subtitle">{{ child3.subtitle }}</p>
                            <div class="chapter-meta">
                              <span class="meta-item">📄 {{ getChapterContentCount(child3.id) }} 节</span>
                              <span class="meta-item">📝 {{ formatWordCount(getChapterWordCount(child3.id)) }}</span>
                              <span class="meta-item">🕒 {{ formatDate(child3.updatedAt) }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- 章节内容 -->
                        <div v-if="getChapterContents(child3.id).length > 0" class="chapter-contents">
                          <div
                            v-for="content in getChapterContents(child3.id)"
                            :key="content.id"
                            :id="`content-${content.id}`"
                            class="content-item"
                          >
                            <div class="content-header">
                              <h6 class="content-title" @click="scrollToContent(content.id)">{{ content.title }}</h6>
                              <div class="content-meta">
                                <span>📝 {{ formatWordCount(getContentWordCount(content)) }}</span>
                                <span>🕒 {{ formatDate(content.updatedAt) }}</span>
                              </div>
                            </div>
                            <div 
                              class="content-preview"
                            >
                              <ProseMirrorRenderer :content="content.contentJson || content.content || ''" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </template>
                </template>
              </div>
            </div>
            
            <!-- 右侧作品详情栏 -->
            <div class="work-details-sidebar">
              <!-- 作品详情区 -->
              <div class="work-detail-section">
                <div class="section-header">
                  <h3>作品信息</h3>
                </div>
                <div class="work-header-right">
                  <div class="work-cover">
                    <div class="cover-placeholder">📚</div>
                  </div>
                  <div class="work-basic-info">
                    <h2 class="work-title-right">{{ currentWork?.title }}</h2>
                    <div class="work-meta-right">
                      <div class="meta-item-right">
                        <span class="meta-label">类型</span>
                        <span class="meta-value">{{ getGenreText(currentWork?.genre || '') }}</span>
                      </div>
                      <div class="meta-item-right">
                        <span class="meta-label">状态</span>
                        <span class="meta-value status" :style="{ color: getStatusColor(currentWork?.status || '') }">
                          {{ getStatusText(currentWork?.status || '') }}
                        </span>
                      </div>
                      <div class="meta-item-right">
                        <span class="meta-label">字数</span>
                        <span class="meta-value">{{ formatWordCount(workStats.totalWords) }}</span>
                      </div>
                      <div class="meta-item-right">
                        <span class="meta-label">章节</span>
                        <span class="meta-value">{{ workStats.totalChapters }}章</span>
                      </div>
                      <div class="meta-item-right">
                        <span class="meta-label">创建</span>
                        <span class="meta-value">{{ formatDateShort(currentWork?.createdAt || '') }}</span>
                      </div>
                      <div class="meta-item-right">
                        <span class="meta-label">更新</span>
                        <span class="meta-value">{{ formatDateShort(currentWork?.updatedAt || '') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="work-description-wrapper">
                  <p class="work-description-right" :class="{ 'expanded': showFullDescription }">
                    {{ showFullDescription ? (currentWork?.description || '暂无描述') : getDescriptionPreview() }}
                  </p>
                  <button 
                    v-if="hasLongDescription" 
                    @click="toggleDescription"
                    class="toggle-description-btn"
                  >
                    {{ showFullDescription ? '收起' : '显示更多' }}
                  </button>
                </div>
              </div>
              
              <!-- 区块链功能区域 -->
              <div class="blockchain-section">
                <div class="section-header">
                  <h3>区块链操作</h3>
                  <span class="coming-soon">即将推出</span>
                </div>
                <div class="blockchain-placeholder">
                  <div class="placeholder-icon">🔗</div>
                  <p>区块链相关功能正在开发中...</p>
                  <div class="feature-list">
                    <div class="feature-item">• NFT铸造</div>
                    <div class="feature-item">• 版权保护</div>
                    <div class="feature-item">• 作品认证</div>
                    <div class="feature-item">• 收益分配</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                <option value="fantasy">玄幻</option>
                <option value="romance">言情</option>
                <option value="sci-fi">科幻</option>
                <option value="mystery">悬疑</option>
                <option value="historical">历史</option>
                <option value="urban">都市</option>
                <option value="martial">武侠</option>
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
import { useAuthorStore } from '../stores/author'
import ProseMirrorRenderer from '../components/ProseMirrorRenderer.vue'
import type { Work, Chapter, ChapterData, Content } from '../../shared/types'

const route = useRoute()
const router = useRouter()
const workStore = useWorkStore()

// 响应式状态
const loading = ref(false)
const error = ref<string | null>(null)
const chapters = ref<Chapter[]>([])
const contents = ref<Content[]>([])
const showWorkSettings = ref(false)
const activeChapterId = ref<string | null>(null)  // 当前激活的章节ID
const activeContentId = ref<string | null>(null)  // 当前激活的内容ID
const chaptersContentRef = ref<HTMLElement | null>(null)  // 内容区域引用
const showFullDescription = ref(false)  // 是否显示完整描述

// 作品设置表单
const workSettings = ref<Partial<Work>>({
  title: '',
  description: '',
  genre: ''
})

// 计算属性
const workId = computed(() => route.params.id as string)
const currentWork = computed(() => workStore.currentWork)

const sortedChapters = computed(() => {
  return [...chapters.value].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
})

// 定义带子章节的章节类型
type ChapterWithChildren = Chapter & { children: ChapterWithChildren[] }

// 构建章节树形结构
const chapterTree = computed(() => {
  const tree: ChapterWithChildren[] = []
  const chaptersMap = new Map<string, ChapterWithChildren>()
  
  // 先创建所有章节的映射，并添加children数组
  chapters.value.forEach(chapter => {
    chaptersMap.set(chapter.id, { ...chapter, children: [] })
  })
  
  // 构建树形结构
  chapters.value.forEach(chapter => {
    const chapterWithChildren = chaptersMap.get(chapter.id)!
    
    if (chapter.parentId && chaptersMap.has(chapter.parentId)) {
      // 是子章节，添加到父章节的children中
      const parent = chaptersMap.get(chapter.parentId)!
      parent.children.push(chapterWithChildren)
    } else {
      // 是根章节，直接添加到树中
      tree.push(chapterWithChildren)
    }
  })
  
  // 对每个层级进行排序
  const sortChapterLevel = (chapters: ChapterWithChildren[]) => {
    chapters.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
    chapters.forEach(chapter => {
      if (chapter.children.length > 0) {
        sortChapterLevel(chapter.children)
      }
    })
  }
  
  sortChapterLevel(tree)
  return tree
})

// 扁平化章节树，用于滚动定位
const flattenedChapters = computed(() => {
  const result: ChapterWithChildren[] = []
  
  const flatten = (chapters: ChapterWithChildren[]) => {
    chapters.forEach(chapter => {
      result.push(chapter)
      if (chapter.children.length > 0) {
        flatten(chapter.children)
      }
    })
  }
  
  flatten(chapterTree.value)
  return result
})

// 作品统计数据
const workStats = computed(() => {
  const totalChapters = chapters.value.length
  const totalWords = contents.value.reduce((sum, content) => {
    // 简单的字数计算，实际应该解析 ProseMirror JSON
    const text = typeof content.content === 'string' ? content.content : JSON.stringify(content.content)
    return sum + text.length
  }, 0)
  
  return {
    totalChapters,
    totalWords
  }
})

// 检查是否有长描述
const hasLongDescription = computed(() => {
  const description = currentWork.value?.description || ''
  return description.length > 100
})

// 获取描述预览
const getDescriptionPreview = () => {
  const description = currentWork.value?.description || '暂无描述'
  return description.length > 100 ? description.substring(0, 100) + '...' : description
}

// 方法
const formatDate = (dateString: string) => {
  if (!dateString) return '未知'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDateShort = (dateString: string) => {
  if (!dateString) return '未知'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

const formatWordCount = (count: number): string => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`
  }
  return `${count}字`
}

const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    writing: '连载中',
    published: '已发布',
    completed: '已完成',
    paused: '暂停',
    archived: '已归档'
  }
  return statusMap[status] || '未知'
}

const getStatusColor = (status: string): string => {
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

const getGenreText = (genre: string): string => {
  const genreMap: Record<string, string> = {
    fantasy: '玄幻',
    romance: '言情',
    'sci-fi': '科幻',
    mystery: '悬疑',
    historical: '历史',
    urban: '都市',
    martial: '武侠'
  }
  return genreMap[genre] || genre || '未分类'
}

const getChapterContentCount = (chapterId: string): number => {
  return contents.value.filter(content => content.chapterId === chapterId).length
}

const getChapterWordCount = (chapterId: string): number => {
  const chapterContents = contents.value.filter(content => content.chapterId === chapterId)
  return chapterContents.reduce((sum, content) => {
    const text = typeof content.content === 'string' ? content.content : JSON.stringify(content.content)
    return sum + text.length
  }, 0)
}

// 获取章节下的所有内容
const getChapterContents = (chapterId: string): Content[] => {
  return contents.value.filter(content => content.chapterId === chapterId)
}

// 获取内容的字数
const getContentWordCount = (content: Content): number => {
  const text = typeof content.content === 'string' ? content.content : JSON.stringify(content.content)
  return text.length
}

// 获取内容预览（前200字）
const getContentPreview = (content: Content): string => {
  let text = ''
  
  if (typeof content.content === 'string') {
    text = content.content
  } else {
    // 如果是 ProseMirror JSON，尝试提取纯文本
    try {
      const doc = content.content as any
      if (doc && doc.content) {
        const extractText = (node: any): string => {
          if (node.type === 'text') {
            return node.text || ''
          }
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join('')
          }
          return ''
        }
        text = doc.content.map(extractText).join('\n')
      } else {
        text = JSON.stringify(content.content)
      }
    } catch (e) {
      text = JSON.stringify(content.content)
    }
  }
  
  // 清理多余的空白字符
  text = text.replace(/\s+/g, ' ').trim()
  
  // 返回前150字的预览
  return text.length > 150 ? text.substring(0, 150) + '...' : text
}

// 查看完整内容
const viewFullContent = (contentId: string) => {
  const content = contents.value.find(c => c.id === contentId)
  if (content) {
    // 创建一个简单的全文查看模态框
    const fullText = getFullContentText(content)
    const modal = document.createElement('div')
    modal.className = 'full-content-modal'
    modal.innerHTML = `
      <div class="full-content-overlay" onclick="this.parentElement.remove()">
        <div class="full-content-dialog" onclick="event.stopPropagation()">
          <div class="full-content-header">
            <h3>${content.title}</h3>
            <button onclick="this.closest('.full-content-modal').remove()" class="close-btn">×</button>
          </div>
          <div class="full-content-body">
            <div class="full-content-text">${fullText.replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(modal)
  }
}

// 获取完整的内容文本
const getFullContentText = (content: Content): string => {
  if (typeof content.content === 'string') {
    return content.content
  } else {
    // 如果是 ProseMirror JSON，尝试提取纯文本
    try {
      const doc = content.content as any
      if (doc && doc.content) {
        const extractText = (node: any): string => {
          if (node.type === 'text') {
            return node.text || ''
          }
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join('')
          }
          return ''
        }
        return doc.content.map(extractText).join('\n')
      } else {
        return JSON.stringify(content.content, null, 2)
      }
    } catch (e) {
      return JSON.stringify(content.content, null, 2)
    }
  }
}

// 编辑内容
const editContent = (contentId: string) => {
  // 跳转到写作页面并选中特定内容
  router.push(`/writing/${workId.value}?content=${contentId}`)
}

// 滚动到指定章节
const scrollToChapter = (chapterId: string) => {
  const element = document.getElementById(`chapter-${chapterId}`)
  if (element && chaptersContentRef.value) {
    const container = chaptersContentRef.value
    
    // 尝试找到章节标题元素
    const titleElement = element.querySelector('.chapter-title')
    
    let targetScrollTop = 0
    
    if (titleElement) {
      // 使用精确的位置计算
      const containerRect = container.getBoundingClientRect()
      const titleRect = titleElement.getBoundingClientRect()
      
      // 计算标题元素相对于容器顶部的位置
      const titleOffsetFromContainerTop = titleRect.top - containerRect.top + container.scrollTop
      
      // 计算章节的padding-top (通过计算章节容器和标题的位置差异)
      const elementRect = element.getBoundingClientRect()
      const paddingAndHeaderSpace = titleRect.top - elementRect.top
      
      // 设置目标滚动位置，确保整个章节头部完全显示
      // 预留足够空间显示完整的章节标题、副标题和元数据
      // 减去padding和header空间，确保章节从顶部开始显示
      targetScrollTop = titleOffsetFromContainerTop - paddingAndHeaderSpace - 20
    } else {
      // 如果找不到标题元素，使用章节容器的位置
      targetScrollTop = element.offsetTop - 20
    }
    
    // 确保不会滚动到负数位置
    targetScrollTop = Math.max(0, targetScrollTop)
    
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
    
    // 立即设置激活状态
    activeChapterId.value = chapterId
    activeContentId.value = null  // 清除内容激活状态
  }
}

// 滚动到指定内容
const scrollToContent = (contentId: string) => {
  // 直接找到内容元素
  const contentElement = document.getElementById(`content-${contentId}`)
  if (contentElement && chaptersContentRef.value) {
    const container = chaptersContentRef.value
    
    // 尝试找到内容标题元素
    const titleElement = contentElement.querySelector('.content-title')
    
    let targetScrollTop = 0
    
    if (titleElement) {
      // 使用更精确的位置计算方法
      const containerRect = container.getBoundingClientRect()
      const titleRect = titleElement.getBoundingClientRect()
      
      // 计算标题元素相对于容器顶部的位置
      const titleOffsetFromContainerTop = titleRect.top - containerRect.top + container.scrollTop
      
      // 设置目标滚动位置，确保标题显示在容器顶部下方合适位置
      targetScrollTop = titleOffsetFromContainerTop - 80 // 增加更多顶部空间
    } else {
      // 如果找不到标题元素，使用内容容器的位置
      targetScrollTop = contentElement.offsetTop - 80
    }
    
    // 确保不会滚动到负数位置
    targetScrollTop = Math.max(0, targetScrollTop)
    
    // 滚动到目标位置
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
    
    // 找到对应的章节ID并设置激活状态
    const content = contents.value.find(c => c.id === contentId)
    if (content) {
      activeChapterId.value = content.chapterId
      activeContentId.value = contentId
    }
  }
}

// 处理内容区滚动，更新激活的章节（防抖处理）
let scrollTimeout: ReturnType<typeof setTimeout> | null = null
const handleContentScroll = () => {
  if (!chaptersContentRef.value) return
  
  // 清除之前的定时器
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  
  // 设置新的定时器，防抖处理
  scrollTimeout = setTimeout(() => {
    const container = chaptersContentRef.value!
    const scrollTop = container.scrollTop
    const containerHeight = container.clientHeight
    
    // 找到当前在视口中最显眼的章节
    let activeId: string | null = null
    let minDistance = Infinity
    
    for (const chapter of chapters.value) {
      const element = document.getElementById(`chapter-${chapter.id}`)
      if (element) {
        const elementTop = element.offsetTop
        const elementBottom = elementTop + element.clientHeight
        const elementCenter = elementTop + element.clientHeight / 2
        const viewportCenter = scrollTop + containerHeight / 2
        
        // 计算章节中心到视口中心的距离
        const distance = Math.abs(elementCenter - viewportCenter)
        
        // 如果章节在视口中且距离最近，设为活跃章节
        if (elementTop <= scrollTop + containerHeight && 
            elementBottom >= scrollTop && 
            distance < minDistance) {
          minDistance = distance
          activeId = chapter.id
        }
      }
    }
    
    if (activeId && activeId !== activeChapterId.value) {
      activeChapterId.value = activeId
    }
  }, 100) // 100ms 防抖延迟
}

const startWriting = () => {
  // 跳转到写作页面（WritingView）
  router.push(`/writing/${workId.value}`)
}

const toggleDescription = () => {
  showFullDescription.value = !showFullDescription.value
}

const readChapter = (chapterId: string) => {
  // TODO: 实现阅读章节功能
  console.log('阅读章节:', chapterId)
}

const editChapter = (chapterId: string) => {
  // 跳转到写作页面并选中特定章节
  router.push(`/writing/${workId.value}?chapter=${chapterId}`)
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
    // 获取当前用户 ID
    const authorStore = useAuthorStore()
    const userId = authorStore.currentAuthor?.id
    if (!userId) {
      throw new Error('用户未登录')
    }
    
    // 加载章节
    const chaptersResponse = await (window as any).gestell.chapter.list(workId.value, userId)
    console.log('章节响应:', chaptersResponse)
    
    // 处理不同的响应格式
    if (chaptersResponse?.success) {
      chapters.value = chaptersResponse.data || []
    } else {
      chapters.value = chaptersResponse?.chapters || []
    }
    
    // 加载内容
    const contentsResponse = await (window as any).gestell.content.getByWork(workId.value)
    console.log('内容响应:', contentsResponse)
    
    // 处理不同的响应格式
    if (contentsResponse?.success) {
      contents.value = contentsResponse.data || []
    } else {
      contents.value = contentsResponse?.contents || []
    }
    
    // 设置初始激活章节（第一个章节）
    if (chapters.value.length > 0) {
      const sortedChapters = [...chapters.value].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      activeChapterId.value = sortedChapters[0].id
    }
    
    console.log('加载完成:', {
      chapters: chapters.value.length,
      contents: contents.value.length,
      chaptersData: chapters.value,
      contentsData: contents.value
    })
  } catch (err: any) {
    console.error('加载章节和内容失败:', err)
    error.value = err.message || '加载章节和内容失败'
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
  background: #f8fafc;
  overflow: hidden;
}

/* 顶部工具栏 */
.work-header {
  height: 56px;
  min-height: 56px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.back-button {
  padding: 8px 16px;
  background: none;
  border: 1px solid #d1d5da;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.back-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.work-title {
  flex: 1;
  min-width: 0;
}

.work-title h1 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 主内容区 */
.work-main {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.work-content {
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 章节区域 */
.chapters-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 120px);
  overflow: hidden;
}

/* 三栏布局 */
.chapters-layout {
  display: flex;
  height: 100%;
}

/* 左侧目录栏 */
.chapters-sidebar {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
  overflow: hidden;
}

/* 中间内容区 */
.chapters-content {
  flex: 1;
  overflow-y: auto;
  background: white;
}

/* 右侧作品详情栏 */
.work-details-sidebar {
  width: 350px;
  flex-shrink: 0;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
  overflow: hidden;
}

/* 右侧栏区块组件 */
.work-detail-section,
.blockchain-section {
  flex-shrink: 0;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  overflow-y: auto;
}

.work-detail-section {
  padding: 20px;
}

.blockchain-section {
  padding: 20px;
  flex: 1;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.coming-soon {
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 8px;
}

/* 右侧作品信息样式 */
.work-header-right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.work-details-sidebar .work-cover {
  width: 80px;
  height: 100px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  margin: 0 auto;
}

.work-details-sidebar .cover-placeholder {
  opacity: 0.8;
}

.work-title-right {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
  line-height: 1.3;
  text-align: center;
}

.work-meta-right {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.meta-item-right {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 12px;
  gap: 2px;
}

.meta-item-right .meta-label {
  color: #6b7280;
  font-weight: 500;
}

.meta-item-right .meta-value {
  color: #111827;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.meta-item-right .meta-value.status {
  font-weight: 600;
}

/* 右侧描述区域 */
.work-description-right {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
  transition: all 0.3s ease;
}

.work-description-right.expanded {
  max-height: none;
}

/* 区块链功能区域 */
.blockchain-placeholder {
  text-align: center;
  padding: 24px 16px;
  color: #6b7280;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.blockchain-placeholder p {
  font-size: 14px;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.feature-list {
  text-align: left;
  max-width: 200px;
  margin: 0 auto;
}

.feature-item {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 6px;
  opacity: 0.8;
}

/* 通用描述按钮样式 */
.toggle-description-btn {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 11px;
  cursor: pointer;
  padding: 4px 0 0 0;
  margin-top: 4px;
  transition: color 0.2s;
}

.toggle-description-btn:hover {
  color: #2563eb;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  background: white;
}

.sidebar-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.chapters-count {
  font-size: 11px;
  color: #6b7280;
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 10px;
  font-weight: 500;
  border: 1px solid #e2e8f0;
}

/* 空章节状态（侧边栏版本） */
.chapters-sidebar .empty-chapters {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.chapters-sidebar .empty-chapters .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.chapters-sidebar .empty-chapters p {
  color: #6b7280;
  font-size: 14px;
  margin: 0 0 16px 0;
}

/* 章节导航列表 */
.chapters-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  border-top: 1px solid #e5e7eb;
}

/* 滚动条优化 */
.chapters-nav::-webkit-scrollbar {
  width: 4px;
}

.chapters-nav::-webkit-scrollbar-track {
  background: #f8fafc;
}

.chapters-nav::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.chapters-nav::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  margin-bottom: 1px;
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
  position: relative;
}

.nav-item:hover {
  background: #f8fafc;
  border-left-color: #d1d5db;
}

.nav-item.active {
  background: linear-gradient(90deg, #eff6ff 0%, #f0f9ff 100%);
  border-left-color: #3b82f6;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  background: #3b82f6;
  border-radius: 50%;
}

.nav-number {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 11px;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
}

.nav-item.active .nav-number {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.2);
}

.nav-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.nav-title {
  font-size: 15px;
  font-weight: 500;
  color: #374151;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.nav-item.active .nav-title {
  color: #1e40af;
  font-weight: 600;
}

.nav-stats {
  display: flex;
  gap: 4px;
  font-size: 10px;
  color: #9ca3af;
  flex-shrink: 0;
  white-space: nowrap;
}

.nav-stats span {
  background: #f3f4f6;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 500;
}

.nav-item.active .nav-stats span {
  background: #dbeafe;
  color: #2563eb;
}

/* 导航项层级样式 */
.nav-item.nav-level-0 {
  padding: 10px 16px;
  margin: 0;
  border-bottom: 1px solid #f1f5f9;
  background: white;
}

.nav-item.nav-level-1 {
  padding: 8px 16px 8px 36px;
  margin: 0;
  border-bottom: 1px solid #f8fafc;
  background: #fafbfc;
}

.nav-item.nav-level-2 {
  padding: 6px 16px 6px 52px;
  margin: 0;
  border-bottom: 1px solid #f3f4f6;
  background: #f5f6fa;
}

/* 内容项样式 */
.nav-item.nav-level-content {
  padding: 4px 16px;
  margin: 0;
  border-bottom: none;
  background: #f8fafc;
  border-left-width: 1px;
}

.nav-item.nav-content-0 {
  padding-left: 48px;
  background: #f8fafc;
}

.nav-item.nav-content-1 {
  padding-left: 68px;
  background: #f5f6fa;
}

.nav-item.nav-content-2 {
  padding-left: 84px;
  background: #f1f5f9;
}

.nav-item.nav-level-content:hover {
  background: #e2e8f0;
}

.nav-item.nav-level-content.active {
  background: linear-gradient(90deg, #fef3c7 0%, #fef9c3 100%);
  border-left-color: #f59e0b;
}

.nav-content-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #9ca3af;
  flex-shrink: 0;
}

.nav-item.nav-level-content.active .nav-content-icon {
  color: #d97706;
}

.nav-item.nav-level-content .nav-title {
  font-size: 13px;
  font-weight: 400;
  color: #6b7280;
  margin-bottom: 1px;
}

.nav-item.nav-level-content.active .nav-title {
  color: #92400e;
  font-weight: 500;
}

.nav-item.nav-level-content .nav-stats {
  font-size: 9px;
}

.nav-item.nav-level-content .nav-stats span {
  background: #e5e7eb;
  padding: 1px 4px;
}

.nav-item.nav-level-content.active .nav-stats span {
  background: #fde68a;
  color: #92400e;
}

.nav-item.nav-level-0:hover {
  background: #f8fafc;
}

.nav-item.nav-level-1:hover {
  background: #f1f5f9;
}

.nav-item.nav-level-2:hover {
  background: #e2e8f0;
}

.nav-item.nav-level-0.active {
  background: linear-gradient(90deg, #eff6ff 0%, #f0f9ff 100%);
  border-left-color: #3b82f6;
  border-left-width: 4px;
}

.nav-item.nav-level-1.active {
  background: linear-gradient(90deg, #f0f9ff 0%, #f8fafc 100%);
  border-left-color: #60a5fa;
  border-left-width: 3px;
}

.nav-item.nav-level-2.active {
  background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
  border-left-color: #93c5fd;
  border-left-width: 2px;
}

.nav-item.nav-level-1 .nav-title {
  font-size: 14px;
  font-weight: 500;
}

.nav-item.nav-level-2 .nav-title {
  font-size: 13px;
  font-weight: 400;
  color: #6b7280;
}

.nav-item.nav-level-1 .nav-number {
  width: 20px;
  height: 20px;
  font-size: 9px;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 3px;
}

.nav-item.nav-level-2 .nav-number {
  width: 18px;
  height: 18px;
  font-size: 8px;
  background: #e2e8f0;
  color: #64748b;
  border-radius: 2px;
}

.nav-item.nav-level-1.active .nav-number {
  background: #60a5fa;
  color: white;
  border-color: #60a5fa;
}

.nav-item.nav-level-2.active .nav-number {
  background: #93c5fd;
  color: white;
  border-color: #93c5fd;
}



/* 空内容状态 */
.empty-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-message {
  text-align: center;
  padding: 40px;
}

.empty-message .empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-message h4 {
  font-size: 20px;
  color: #111827;
  margin: 0 0 8px 0;
}

.empty-message p {
  color: #6b7280;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

/* 内容区章节 */
.content-sections {
  padding: 0;
}

.chapter-section {
  border-bottom: 1px solid #f3f4f6;
  padding: 32px;
}

.chapter-section:last-child {
  border-bottom: none;
}

/* 章节标题区域 */
.chapter-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.chapter-section .chapter-number {
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
  background: #eff6ff;
  padding: 8px 12px;
  border-radius: 6px;
  flex-shrink: 0;
}

.chapter-info {
  flex: 1;
  min-width: 0;
}

.chapter-section .chapter-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
  line-height: 1.3;
}

/* 内容区章节层级样式 */
.chapter-section.chapter-level-0 {
  border-bottom: 2px solid #e5e7eb;
  padding: 40px 32px;
}

.chapter-section.chapter-level-1 {
  border-bottom: 1px solid #f3f4f6;
  padding: 32px 40px;
  background: #fafbfc;
}

.chapter-section.chapter-level-2 {
  border-bottom: 1px solid #f9fafb;
  padding: 24px 48px;
  background: #f5f5f5;
}

.chapter-title-level-0 {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px 0;
}

.chapter-title-level-1 {
  font-size: 24px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 10px 0;
}

.chapter-title-level-2 {
  font-size: 20px;
  font-weight: 500;
  color: #4b5563;
  margin: 0 0 8px 0;
}

.chapter-level-1 .chapter-number {
  background: #e0e7ff;
  color: #4338ca;
}

.chapter-level-2 .chapter-number {
  background: #e5e7eb;
  color: #6b7280;
  font-size: 12px;
  padding: 6px 10px;
}

.chapter-section .chapter-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 12px 0;
  font-style: italic;
}

.chapter-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 13px;
  color: #6b7280;
  background: #f8fafc;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.chapter-section .chapter-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 章节内容 */
.chapter-section .chapter-contents {
  margin-top: 0;
  border-top: none;
  padding-top: 0;
}

.chapter-section .contents-list {
  gap: 16px;
}

.chapter-section .content-item {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
}

.chapter-section .content-item:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 空章节内容 */
.empty-chapter-content {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-chapter-content p {
  margin: 0 0 16px 0;
  font-size: 14px;
}

/* 按钮样式补充 */
.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-outline {
  background: transparent;
  color: #3b82f6;
  border-color: #3b82f6;
}

.btn-outline:hover {
  background: #eff6ff;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: 1px solid #d1d5da;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
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
  font-size: 3rem;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.error-state p {
  color: #dc2626;
  font-size: 16px;
  margin-bottom: 20px;
}

/* 按钮样式 */
.btn {
  padding: 10px 20px;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border-color: #d1d5da;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-cancel {
  background: white;
  color: #6b7280;
  border-color: #d1d5da;
}

.btn-cancel:hover {
  background: #f9fafb;
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
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #111827;
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
  font-size: 20px;
  color: #6b7280;
  line-height: 1;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.settings-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

/* 表单样式 */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5da;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* 章节内容相关样式 */
.chapter-contents {
  margin-top: 16px;
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
}

.contents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.contents-header h5 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.contents-count {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 10px;
}

.contents-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
}

.content-item:last-child {
  margin-bottom: 0;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.content-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.content-title:hover {
  background-color: #f3f4f6;
}

.content-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
}

.content-words,
.content-date {
  white-space: nowrap;
}

.content-preview {
  margin-top: 12px;
}

.content-text {
  font-size: 14px;
  line-height: 1.6;
  color: #4b5563;
  margin-bottom: 12px;
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  min-height: 50px;
  max-height: 100px;
  overflow-y: auto;
  text-align: justify;
}

/* ProseMirror 内容两端对齐 */
:deep(.ProseMirror) {
  text-align: justify;
  text-justify: inter-ideograph;
}

:deep(.ProseMirror p) {
  text-align: justify;
  text-justify: inter-ideograph;
  word-spacing: normal;
  letter-spacing: normal;
}

.content-actions {
  display: flex;
  gap: 12px;
}

.btn-text {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-text:hover {
  background: #eff6ff;
  color: #2563eb;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .work-details-sidebar {
    width: 300px;
  }
  
  .chapters-sidebar {
    width: 250px;
  }
  
  .work-detail-section {
    padding: 16px;
  }
  
  .blockchain-section {
    padding: 16px;
  }
}

@media (max-width: 1024px) {
  .work-main {
    padding: 16px;
  }
  
  .chapters-sidebar {
    width: 280px;
  }
  
  .work-details-sidebar {
    width: 280px;
  }
  
  .work-detail-section {
    padding: 12px;
  }
  
  .blockchain-section {
    padding: 12px;
  }
  
  .chapter-section {
    padding: 24px;
  }
}

@media (max-width: 768px) {
  .work-header {
    padding: 0 16px;
  }
  
  .work-title h1 {
    font-size: 18px;
  }
  
  .header-actions {
    gap: 8px;
  }
  
  /* 移动端改为垂直堆叠布局 */
  .chapters-layout {
    flex-direction: column;
  }
  
  .chapters-sidebar {
    width: 100%;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    order: 1;
  }
  
  .chapters-content {
    flex: 1;
    min-height: 300px;
    order: 2;
  }
  
  .work-details-sidebar {
    width: 100%;
    max-height: 400px;
    border-left: none;
    border-top: 1px solid #e5e7eb;
    order: 3;
  }
  
  .work-detail-section {
    padding: 16px;
  }
  
  .blockchain-section {
    padding: 16px;
  }
  
  .chapters-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 8px 12px;
    gap: 8px;
  }
  
  .nav-item {
    flex-shrink: 0;
    min-width: 180px;
    margin-bottom: 0;
    margin-right: 8px;
  }
  
  .chapter-section {
    padding: 20px;
  }
  
  .chapter-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .chapter-actions {
    order: -1;
    align-self: flex-end;
  }
}

@media (max-width: 480px) {
  .work-main {
    padding: 12px;
  }
  
  .chapters-sidebar {
    max-height: 250px;
  }
  
  .work-detail-sidebar {
    padding: 12px;
  }
  
  .work-detail-sidebar .work-cover {
    width: 50px;
    height: 70px;
    font-size: 18px;
  }
  
  .work-title-sidebar {
    font-size: 14px;
  }
  
  .work-description-sidebar {
    font-size: 12px;
    max-height: 30px;
  }
  
  .meta-item-sidebar {
    font-size: 12px;
    padding: 4px 0;
  }
  
  .nav-item {
    min-width: 140px;
    padding: 8px 12px;
  }
  
  .nav-title {
    font-size: 15px;
  }
  
  .chapter-section {
    padding: 16px;
  }
  
  .chapter-section .chapter-title {
    font-size: 20px;
  }
  
  .content-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .content-meta {
    gap: 8px;
  }
  
  .content-actions {
    gap: 8px;
  }
}

/* 全文查看模态框样式 */
:global(.full-content-modal) {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
}

:global(.full-content-overlay) {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

:global(.full-content-dialog) {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

:global(.full-content-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

:global(.full-content-header h3) {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

:global(.full-content-header .close-btn) {
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
  color: #6b7280;
  line-height: 1;
  transition: all 0.2s;
}

:global(.full-content-header .close-btn:hover) {
  background: #f3f4f6;
}

:global(.full-content-body) {
  flex: 1;
  overflow: hidden;
  padding: 24px;
}

:global(.full-content-text) {
  height: 100%;
  overflow-y: auto;
  line-height: 1.8;
  font-size: 16px;
  color: #374151;
  white-space: normal;
  text-align: justify;
  text-justify: inter-ideograph;
}
</style>
