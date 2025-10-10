<template>
  <div class="chapter-tree">
    <div class="tree-header">
      <h3>章节目录</h3>
      <div class="header-actions">
        <button 
          class="add-content-btn"
          @click="handleAddRootContent"
          title="在根目录添加内容"
        >
          📄
        </button>
        <button 
          class="add-chapter-btn"
          @click="$emit('add-chapter')"
          title="添加新章节"
        >
          📁
        </button>
      </div>
    </div>
    
    <div class="tree-content">
      <!-- 根目录内容 -->
      <div v-if="rootContents.length > 0" class="root-contents">
        <draggable
          v-model="rootContents"
          :group="{ name: 'chapters', pull: true, put: true }"
          @change="handleContentDragChange"
          animation="150"
          :force-fallback="false"
          :fallback-on-body="true"
          item-key="id"
          class="content-list"
        >
          <template #item="{ element: content }">
            <div 
              class="content-item"
              :class="{ 'selected': selectedContentId === content.id }"
              @click="$emit('content-select', content.id)"
            >
              <div class="content-info">
                <span class="content-icon">📄</span>
                <span class="content-title">{{ content.title }}</span>
              </div>
              <div class="content-actions">
                <button 
                  class="action-btn"
                  @click.stop="$emit('content-edit', content)"
                  title="编辑内容"
                >
                  ✏️
                </button>
                <button 
                  class="action-btn delete-btn"
                  @click.stop="$emit('content-delete', content.id)"
                  title="删除内容"
                >
                  🗑️
                </button>
              </div>
            </div>
          </template>
        </draggable>
      </div>

      <!-- 章节列表 -->
      <draggable
        v-model="sortedChapters"
        :group="{ name: 'chapters', pull: true, put: true }"
        @change="handleDragChange"
        @start="handleDragStart"
        @end="handleDragEnd"
        animation="150"
        ghost-class="chapter-ghost"
        chosen-class="chapter-chosen"
        drag-class="chapter-drag"
        :sort="true"
        :force-fallback="false"
        :fallback-on-body="true"
        item-key="id"
        class="draggable-list"
      >
        <template #item="{ element: chapter }">
          <ChapterTreeNode 
            :chapter="chapter" 
            :chapters="chapters"
            :contents="contents"
            :selected-chapter-id="selectedChapterId"
            :selected-content-id="selectedContentId"
            :dragging="isDragging"
            @chapter-toggle="$emit('chapter-toggle', $event)"
            @chapter-edit="$emit('chapter-edit', $event)"
            @chapter-delete="$emit('chapter-delete', $event)"
            @add-sub-chapter="$emit('add-sub-chapter', $event)"
            @add-content="$emit('add-content', $event)"
            @content-select="$emit('content-select', $event)"
            @content-edit="$emit('content-edit', $event)"
            @content-delete="$emit('content-delete', $event)"
            @contents-reorder="$emit('contents-reorder', $event)"
            @chapters-reorder="$emit('chapters-reorder', $event)"
          />
        </template>
      </draggable>
    </div>
    
    <div v-if="chapters.length === 0 && rootContents.length === 0" class="empty-state">
      <p>还没有章节和内容</p>
      <div class="empty-actions">
        <button class="create-btn" @click="$emit('add-chapter')">
          创建第一个章节
        </button>
        <button class="create-btn" @click="handleAddRootContent">
          创建第一个内容
        </button>
      </div>
    </div>
    
    <!-- 内容创建弹窗 -->
    <ContentCreateModal
      :isVisible="showCreateContentModal"
      :workId="createContentWorkId"
      :chapterId="createContentChapterId"
      @close="handleCloseCreateModal"
      @create="handleCreateContent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import draggable from 'vuedraggable'
import ChapterTreeNode from './ChapterTreeNode.vue'
import ContentCreateModal from './ContentCreateModal.vue'
import type { Chapter, Content } from '../types/models'

// 定义本地章节类型，与WritingView保持一致
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

interface Props {
  chapters: ChapterLocal[]
  contents?: Content[]
  selectedChapterId?: string
  selectedContentId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'chapter-toggle': [chapterId: string]
  'chapter-edit': [chapter: ChapterLocal]
  'chapter-delete': [chapterId: string]
  'add-chapter': []
  'add-sub-chapter': [parentId: string]
  'add-content': [data: { workId?: string, chapterId?: string }]
  'content-select': [contentId: string]
  'content-edit': [content: Content]
  'content-delete': [contentId: string]
  'chapters-reorder': [chapters: ChapterLocal[]]
  'contents-reorder': [data: { chapterId?: string, contents: Content[] }]
}>()

const isDragging = ref(false)
const showCreateContentModal = ref(false)
const createContentWorkId = ref<string | undefined>()
const createContentChapterId = ref<string | undefined>()

// 根目录内容（没有 chapterId 的内容）
const rootContents = computed({
  get: () => {
    return (props.contents || [])
      .filter(content => !content.chapterId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  },
  set: (value) => {
    console.log('ChapterTree: 根级内容重新排序')
    console.log('新的根级内容列表:', value.map(c => ({ id: c.id, title: c.title, chapterId: c.chapterId })))
    
    // 检查是否有内容从其他章节移动到根目录
    const currentRootContentIds = new Set((props.contents || [])
      .filter(content => !content.chapterId)
      .map(c => c.id))
    const newRootContentIds = new Set(value.map(c => c.id))
    
    // 找出新添加到根目录的内容
    const addedToRoot = value.filter(content => !currentRootContentIds.has(content.id))
    if (addedToRoot.length > 0) {
      console.log('新添加到根目录的内容:', addedToRoot.map(c => c.title))
    }
    
    // 更新所有内容的章节归属为undefined（根目录）
    const updatedContents = value.map((content, index) => ({
      ...content,
      chapterId: undefined, // 设置为根级内容
      orderIndex: index
    }))
    
    emit('contents-reorder', { 
      chapterId: undefined, 
      contents: updatedContents
    })
  }
})

// 排序后的章节列表
const sortedChapters = computed({
  get: () => {
    return [...props.chapters]
      .filter(chapter => !chapter.parentId) // 只显示根级章节
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  },
  set: (value) => {
    console.log('ChapterTree: 根级章节拖拽发生')
    console.log('拖拽后的根级章节:', value.map(c => ({ id: c.id, title: c.title, parentId: c.parentId })))
    
    // 获取当前所有章节的映射
    const allChaptersMap = new Map(props.chapters.map(ch => [ch.id, ch]))
    
    // 构建新的章节列表
    const newChapters: ChapterLocal[] = []
    
    // 处理根级章节
    value.forEach((chapter, index) => {
      // 更新为根级章节
      const updatedChapter = {
        ...chapter,
        parentId: undefined,
        orderIndex: index,
        level: 0
      }
      newChapters.push(updatedChapter)
      
      // 递归添加该章节的所有子章节，保持原有层级结构
      const addChildrenRecursively = (parentId: string, currentLevel: number) => {
        const children = props.chapters
          .filter(ch => ch.parentId === parentId)
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        
        children.forEach(child => {
          const updatedChild = {
            ...child,
            level: currentLevel + 1
          }
          newChapters.push(updatedChild)
          
          // 递归处理子章节的子章节
          addChildrenRecursively(child.id, currentLevel + 1)
        })
      }
      
      addChildrenRecursively(chapter.id, 0)
    })
    
    // 添加不在根级拖拽中的其他章节（那些仍然是其他章节的子章节）
    const processedIds = new Set(newChapters.map(ch => ch.id))
    const remainingChapters = props.chapters.filter(ch => !processedIds.has(ch.id))
    newChapters.push(...remainingChapters)
    
    console.log('重新构建的章节数量:', newChapters.length)
    console.log('原始章节数量:', props.chapters.length)
    
    emit('chapters-reorder', newChapters)
  }
})

// 拖拽事件处理
const handleDragStart = (evt: any) => {
  isDragging.value = true
  console.log('ChapterTree: 开始拖拽', evt)
}

const handleDragEnd = (evt: any) => {
  isDragging.value = false
  console.log('ChapterTree: 拖拽结束', evt)
}

const handleDragChange = (evt: any) => {
  console.log('ChapterTree: 拖拽变化事件', evt)
  if (evt.moved) {
    const { oldIndex, newIndex } = evt.moved
    console.log(`根级章节从位置 ${oldIndex} 移动到 ${newIndex}`)
  }
  if (evt.added) {
    console.log('添加到根级章节:', evt.added.element.title)
  }
  if (evt.removed) {
    console.log('从根级章节移除:', evt.removed.element.title)
  }
}

const handleContentDragChange = (evt: any) => {
  console.log('ChapterTree: 根级内容拖拽变化', evt)
  if (evt.moved) {
    const { oldIndex, newIndex } = evt.moved
    console.log(`根目录内容从位置 ${oldIndex} 移动到 ${newIndex}`)
  }
  if (evt.added) {
    console.log('内容添加到根目录:', evt.added.element.title)
    console.log('添加的内容详情:', evt.added.element)
  }
  if (evt.removed) {
    console.log('内容从根目录移除:', evt.removed.element.title)
    console.log('移除的内容详情:', evt.removed.element)
  }
}

const handleAddRootContent = () => {
  createContentWorkId.value = undefined
  createContentChapterId.value = undefined
  showCreateContentModal.value = true
}

const handleCloseCreateModal = () => {
  showCreateContentModal.value = false
  createContentWorkId.value = undefined
  createContentChapterId.value = undefined
}

const handleCreateContent = (data: { title: string; type: string; workId?: string; chapterId?: string }) => {
  emit('add-content', data)
  handleCloseCreateModal()
}
</script>

<style scoped>
.chapter-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  border-radius: 8px;
  overflow: hidden;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e1e5e9;
}

.tree-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.add-chapter-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #007bff;
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s;
}

.add-chapter-btn:hover {
  background: #0056b3;
  transform: scale(1.05);
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.draggable-list {
  min-height: 100px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #666;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 14px;
}

.create-first-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.create-first-btn:hover {
  background: #0056b3;
}

/* 拖拽样式 */
.chapter-ghost {
  opacity: 0.5;
  background: #e3f2fd;
}

.chapter-chosen {
  opacity: 0.8;
}

.chapter-drag {
  transform: rotate(5deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 滚动条样式 */
.tree-content::-webkit-scrollbar {
  width: 6px;
}

.tree-content::-webkit-scrollbar-track {
  background: transparent;
}

.tree-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.tree-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>