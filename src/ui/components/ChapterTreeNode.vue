<template>
  <div 
    class="chapter-tree-node"
    :class="{
      'selected': selectedChapterId === chapter.id,
      'dragging': dragging
    }"
  >
    <div 
      class="node-content"
      @click="$emit('chapter-toggle', chapter.id)"
    >
      <div class="node-left">
        <button 
          v-if="hasChildren"
          class="expand-btn"
          @click.stop="toggleExpanded"
        >
          <span :class="{ 'expanded': isExpanded }">▶</span>
        </button>
        <span v-else class="expand-spacer"></span>
        
        <div class="node-info">
          <div class="node-title">{{ chapter.title }}</div>
          <div class="node-stats">
            <span class="word-count">{{ chapter.characterCount || 0 }}字</span>
            <span v-if="(chapter.contentCount || 0) > 0" class="content-count">
              {{ chapter.contentCount }}段
            </span>
          </div>
        </div>
      </div>
      
      <div class="node-actions">
        <button 
          class="action-btn"
          @click.stop="$emit('add-content', { chapterId: chapter.id })"
          title="添加内容"
        >
          📄
        </button>
        <button 
          v-if="(chapter.level || 1) < 3"
          class="action-btn"
          @click.stop="$emit('add-sub-chapter', chapter.id)"
          title="添加子章节"
        >
          📁
        </button>
        <button 
          class="action-btn"
          @click.stop="$emit('chapter-edit', chapter)"
          title="编辑章节"
        >
          ✏️
        </button>
        <button 
          class="action-btn delete-btn"
          @click.stop="$emit('chapter-delete', chapter.id)"
          title="删除章节"
        >
          🗑️
        </button>
      </div>
    </div>
    
    <!-- 章节内容 -->
    <div v-if="chapterContents.length > 0 && isExpanded" class="chapter-contents">
      <draggable
        v-model="sortedChapterContents"
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
            @click.stop="$emit('content-select', content.id)"
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
    
    <!-- 子章节 -->
    <div v-if="hasChildren && isExpanded" class="children">
      <draggable
        v-model="sortedChildChapters"
        :group="{ name: 'chapters', pull: true, put: true }"
        @change="handleChildChapterDragChange"
        animation="150"
        ghost-class="chapter-ghost"
        chosen-class="chapter-chosen"
        drag-class="chapter-drag"
        :sort="true"
        :force-fallback="false"
        :fallback-on-body="true"
        item-key="id"
        class="child-chapters-list"
      >
        <template #item="{ element: child }">
          <ChapterTreeNode
            :key="child.id"
            :chapter="child"
            :chapters="chapters"
            :contents="contents"
            :selected-chapter-id="selectedChapterId"
            :selected-content-id="selectedContentId"
            :dragging="dragging"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import draggable from 'vuedraggable'
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
  chapter: ChapterLocal
  chapters: ChapterLocal[]
  contents?: Content[]
  selectedChapterId?: string
  selectedContentId?: string
  dragging?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'chapter-toggle': [chapterId: string]
  'chapter-edit': [chapter: ChapterLocal]
  'chapter-delete': [chapterId: string]
  'add-sub-chapter': [parentId: string]
  'add-content': [data: { chapterId: string }]
  'content-select': [contentId: string]
  'content-edit': [content: Content]
  'content-delete': [contentId: string]
  'contents-reorder': [data: { chapterId: string; contents: Content[] }]
  'chapters-reorder': [chapters: ChapterLocal[]]
}>()

const isExpanded = ref(true) // 默认展开

// 子章节
const childChapters = computed(() => {
  return props.chapters
    .filter(ch => ch.parentId === props.chapter.id)
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
})

// 可排序的子章节 - 处理跨层级拖拽
const sortedChildChapters = computed({
  get: () => childChapters.value,
  set: (value) => {
    console.log(`ChapterTreeNode: 子章节拖拽发生 - 父章节: ${props.chapter.title}`)
    console.log('拖拽后的子章节:', value.map(c => ({ id: c.id, title: c.title, parentId: c.parentId })))
    
    // 构建新的章节列表
    const newChapters: ChapterLocal[] = []
    const currentLevel = (props.chapter.level || 0) + 1
    
    // 处理子章节
    value.forEach((chapter, index) => {
      // 更新为当前章节的子章节
      const updatedChapter = {
        ...chapter,
        parentId: props.chapter.id,
        orderIndex: index,
        level: currentLevel
      }
      newChapters.push(updatedChapter)
      
      // 递归添加该章节的所有子章节，保持原有层级结构
      const addChildrenRecursively = (parentId: string, level: number) => {
        const children = props.chapters
          .filter(ch => ch.parentId === parentId)
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        
        children.forEach(child => {
          const updatedChild = {
            ...child,
            level: level + 1
          }
          newChapters.push(updatedChild)
          
          // 递归处理子章节的子章节
          addChildrenRecursively(child.id, level + 1)
        })
      }
      
      addChildrenRecursively(chapter.id, currentLevel)
    })
    
    // 添加不在此次拖拽中的其他章节
    const processedIds = new Set(newChapters.map(ch => ch.id))
    const remainingChapters = props.chapters.filter(ch => !processedIds.has(ch.id))
    newChapters.push(...remainingChapters)
    
    console.log('重新构建的子章节数量:', newChapters.length)
    console.log('原始章节数量:', props.chapters.length)
    
    emit('chapters-reorder', newChapters)
  }
})

// 章节内容
const chapterContents = computed(() => {
  return (props.contents || [])
    .filter(content => content.chapterId === props.chapter.id)
    .sort((a, b) => a.orderIndex - b.orderIndex)
})

// 可排序的章节内容
const sortedChapterContents = computed({
  get: () => chapterContents.value,
  set: (value) => {
    console.log(`ChapterTreeNode: 章节 ${props.chapter.title} 内容重新排序`)
    console.log('新的内容列表:', value.map(c => ({ id: c.id, title: c.title })))
    
    // 检查是否有内容类型变化，如果有则需要处理跨章节移动
    const currentContentIds = new Set(chapterContents.value.map(c => c.id))
    const newContentIds = new Set(value.map(c => c.id))
    
    // 找出新添加的内容
    const addedContents = value.filter(content => !currentContentIds.has(content.id))
    if (addedContents.length > 0) {
      console.log('添加到章节的内容:', addedContents.map(c => c.title))
      // 更新这些内容的章节归属
      const updatedContents = value.map((content, index) => ({
        ...content,
        chapterId: props.chapter.id, // 设置新的章节ID
        orderIndex: index
      }))
      
      emit('contents-reorder', { 
        chapterId: props.chapter.id, 
        contents: updatedContents 
      })
      return
    }
    
    // 正常的重新排序
    const reorderedContents = value.map((content, index) => ({
      ...content,
      orderIndex: index
    }))
    emit('contents-reorder', { 
      chapterId: props.chapter.id, 
      contents: reorderedContents 
    })
  }
})

// 是否有子章节
const hasChildren = computed(() => {
  return childChapters.value.length > 0
})

// 切换展开状态
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}

// 处理内容拖拽
const handleContentDragChange = (evt: any) => {
  console.log(`ChapterTreeNode: 章节 ${props.chapter.title} 内容拖拽变化`, evt)
  if (evt.moved) {
    const { oldIndex, newIndex } = evt.moved
    console.log(`章节 ${props.chapter.title} 中内容从位置 ${oldIndex} 移动到 ${newIndex}`)
  }
  if (evt.added) {
    console.log(`内容添加到章节 ${props.chapter.title}:`, evt.added.element.title)
    console.log('添加的内容详情:', evt.added.element)
  }
  if (evt.removed) {
    console.log(`内容从章节 ${props.chapter.title} 移除:`, evt.removed.element.title)
    console.log('移除的内容详情:', evt.removed.element)
  }
}

// 处理子章节拖拽
const handleChildChapterDragChange = (evt: any) => {
  console.log(`ChapterTreeNode: 子章节拖拽变化 - 父章节: ${props.chapter.title}`, evt)
  if (evt.moved) {
    const { oldIndex, newIndex } = evt.moved
    console.log(`章节 ${props.chapter.title} 中子章节从位置 ${oldIndex} 移动到 ${newIndex}`)
  }
  if (evt.added) {
    console.log(`添加到章节 ${props.chapter.title}:`, evt.added.element.title)
  }
  if (evt.removed) {
    console.log(`从章节 ${props.chapter.title} 移除:`, evt.removed.element.title)
  }
}
</script>

<style scoped>
.chapter-tree-node {
  margin-bottom: 2px;
}

.node-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.node-content:hover {
  background: #f8f9fa;
  border-color: #e9ecef;
}

.chapter-tree-node.selected .node-content {
  background: #e3f2fd;
  border-color: #2196f3;
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.1);
}

.node-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.expand-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 12px;
  transition: transform 0.2s;
}

.expand-btn span.expanded {
  transform: rotate(90deg);
}

.expand-spacer {
  width: 20px;
  height: 20px;
}

.node-info {
  flex: 1;
  min-width: 0;
  margin-left: 8px;
}

.node-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-stats {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.word-count,
.content-count {
  font-size: 12px;
  color: #666;
}

.node-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.node-content:hover .node-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.delete-btn:hover {
  background: #ffebee;
  color: #d32f2f;
}

.children {
  margin-left: 24px;
  border-left: 2px solid #f0f0f0;
  padding-left: 8px;
}

.child-chapters-list {
  min-height: 20px;
}

.content-list {
  min-height: 20px;
}

.chapter-contents {
  margin-left: 28px;
  margin-top: 4px;
}

.content-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.content-item:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

.content-item.selected {
  background: #fff3cd;
  border-color: #ffc107;
}

.content-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.content-icon {
  margin-right: 6px;
  font-size: 12px;
}

.content-title {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.content-item:hover .content-actions {
  opacity: 1;
}

/* 拖拽状态样式 */
.chapter-ghost {
  opacity: 0.5;
  background: #e3f2fd !important;
}

.chapter-chosen {
  background: #bbdefb !important;
}

.chapter-drag {
  opacity: 0.8;
  transform: rotate(5deg);
}

.chapter-contents {
  margin-left: 30px;
  margin-top: 8px;
  margin-bottom: 8px;
}

.content-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.content-item:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

.content-item.selected {
  background: #fff3cd;
  border-color: #ffc107;
  box-shadow: 0 1px 3px rgba(255, 193, 7, 0.2);
}

.content-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.content-icon {
  margin-right: 8px;
  font-size: 12px;
}

.content-title {
  font-size: 13px;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.content-item:hover .content-actions {
  opacity: 1;
}

/* 拖拽状态样式 */
.chapter-tree-node.dragging {
  opacity: 0.5;
}
</style>