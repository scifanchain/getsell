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
    
    <!-- 拖拽错误提示 -->
    <div v-if="dragErrorMessage" class="drag-error-toast">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ dragErrorMessage }}</span>
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
        :move="validateMoveDepth"
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
            @drag-error="showDragError"
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
import ChapterTreeNode from './Node.vue'
import ContentCreateModal from '../ContentCreateModal.vue'
import type { ChapterLocal, Content } from './types'

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
const dragErrorMessage = ref<string>('')
const lastInvalidMove = ref<{chapterId: string, reason: string} | null>(null)

// 显示拖拽错误消息
const showDragError = (message: string) => {
  dragErrorMessage.value = message
  setTimeout(() => {
    dragErrorMessage.value = ''
  }, 3000) // 3秒后自动清除
}

// 计算章节子树的最大深度（相对深度，从0开始）
// 返回值：0表示无子章节，1表示有一层子章节，2表示有两层子章节
const getSubTreeDepth = (chapterId: string): number => {
  const childChapters = props.chapters.filter(ch => ch.parentId === chapterId)
  if (childChapters.length === 0) {
    return 0 // 没有子章节，深度为0
  }
  
  let maxChildDepth = 0
  for (const child of childChapters) {
    const childDepth = getSubTreeDepth(child.id)
    maxChildDepth = Math.max(maxChildDepth, childDepth + 1) // +1表示当前这一层
  }
  
  return maxChildDepth
}

// 验证拖到根级别的移动是否违反层级限制
const validateMoveDepth = (evt: any): boolean => {
  if (!evt.draggedContext) {
    return true // 没有拖拽上下文，允许
  }
  
  const draggedChapter = evt.draggedContext.element as ChapterLocal
  const targetLevel = 1 // 拖到根级别，将成为 level 1
  const subTreeDepth = getSubTreeDepth(draggedChapter.id)
  const finalMaxLevel = targetLevel + subTreeDepth
  
  console.log(`[根级拖拽] "${draggedChapter.title}" (当前level=${draggedChapter.level}, 子树深度=${subTreeDepth}) → 根目录`)
  console.log(`  目标level=${targetLevel}, 最终最大level=${finalMaxLevel}`)
  
  // 三层结构: Level 1(卷), Level 2(章), Level 3(节)
  // 移到根目录后，该章节及其所有子章节的 level 都不能超过 3
  if (finalMaxLevel > 3) {
    if (subTreeDepth === 2) {
      // 该章节有2层子章节（自己是卷，下面有章和节）
      showDragError(`无法移动 "${draggedChapter.title}" 到根目录：它包含${subTreeDepth}层子章节，最多只能包含2层`)
    } else {
      showDragError(`无法移动 "${draggedChapter.title}" 到根目录：会超过3层目录限制`)
    }
    return false
  }
  
  return true
}

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
    console.log('=== ChapterTree: 根级章节拖拽发生 ===')
    console.log('拖拽后的根级章节:', value.map(c => ({ id: c.id, title: c.title, parentId: c.parentId, level: c.level })))
    
    // 验证每个章节移动到根级别是否合法
    for (const chapter of value) {
      const targetLevel = 1 // 根级别是 level 1
      const subTreeDepth = getSubTreeDepth(chapter.id)
      const finalMaxLevel = targetLevel + subTreeDepth
      
      console.log(`  验证 "${chapter.title}": 目标level=${targetLevel}, 子树深度=${subTreeDepth}, 最终最大level=${finalMaxLevel}`)
      
      if (finalMaxLevel > 3) {
        // 拒绝这次移动
        if (subTreeDepth === 2) {
          showDragError(`无法移动 "${chapter.title}" 到根目录：它包含${subTreeDepth}层子章节，最多只能包含2层`)
        } else {
          showDragError(`无法移动 "${chapter.title}" 到根目录：会超过3层目录限制`)
        }
        console.log('❌ 验证失败，阻止更新')
        return // 阻止更新
      }
    }
    
    console.log('✅ 验证通过，开始重建章节列表')
    
    // 检查是否有无效移动需要撤销
    if (lastInvalidMove.value) {
      const invalidChapter = value.find(ch => ch.id === lastInvalidMove.value?.chapterId)
      if (invalidChapter) {
        console.warn('🚫 撤销无效移动:', lastInvalidMove.value)
        showDragError(`无法移动章节 "${invalidChapter.title}"：${lastInvalidMove.value.reason}`)
        lastInvalidMove.value = null
        return
      }
    }
    
    // 构建新的章节列表
    const newChapters: ChapterLocal[] = []
    const processedIds = new Set<string>() // 记录已处理的章节ID
    
    // 递归添加章节及其所有子章节
    const addChapterWithChildren = (chapterId: string, parentId: string | undefined, orderIndex: number, level: number) => {
      if (processedIds.has(chapterId)) {
        console.warn(`章节 ${chapterId} 已处理，跳过`)
        return // 避免重复添加
      }
      
      const chapter = props.chapters.find(ch => ch.id === chapterId)
      if (!chapter) {
        console.warn(`找不到章节 ${chapterId}`)
        return
      }
      
      // 添加当前章节
      newChapters.push({
        ...chapter,
        parentId,
        orderIndex,
        level
      })
      processedIds.add(chapterId)
      
      // 递归添加子章节
      const children = props.chapters
        .filter(ch => ch.parentId === chapterId)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
      
      children.forEach((child, index) => {
        addChapterWithChildren(child.id, chapterId, index, level + 1)
      })
    }
    
    // 处理所有根级章节及其子树
    value.forEach((chapter, index) => {
      addChapterWithChildren(chapter.id, undefined, index, 1)
    })
    
    // 添加不在根级拖拽中的其他章节（那些仍然是其他章节的子章节）
    const remainingChapters = props.chapters.filter(ch => !processedIds.has(ch.id))
    if (remainingChapters.length > 0) {
      console.log('添加未处理的章节:', remainingChapters.map(ch => ch.title))
      newChapters.push(...remainingChapters)
    }
    
    console.log(`重新构建完成: ${newChapters.length} 个章节 (原始: ${props.chapters.length})`)
    console.log('根级章节:', newChapters.filter(ch => !ch.parentId).map(ch => ch.title))
    
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
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #e5e7eb;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-bottom: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tree-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.header-actions {
  display: flex;
  gap: 6px;
}

.add-chapter-btn,
.add-content-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  color: #667eea;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.add-chapter-btn:hover,
.add-content-btn:hover {
  background: white;
  color: #4f46e5;
  transform: scale(1.05);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 8px 8px;
  background: #fafbfc;
}

.root-contents {
  margin-bottom: 8px;
}

.draggable-list {
  min-height: 60px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 160px;
  color: #6b7280;
  text-align: center;
}

.empty-state p {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #9ca3af;
}

.empty-actions {
  display: flex;
  gap: 8px;
}

.create-btn {
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

/* 内容项样式 */
.content-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.content-item:hover {
  background: #f8fafc;
  border-color: #d1d5db;
  transform: translateX(2px);
}

.content-item.selected {
  background: #fef3c7;
  border-color: #f59e0b;
  box-shadow: 0 1px 3px rgba(245, 158, 11, 0.2);
}

.content-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.content-icon {
  margin-right: 6px;
  font-size: 11px;
  opacity: 0.7;
}

.content-title {
  font-size: 11px;
  color: #4b5563;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.content-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.content-item:hover .content-actions {
  opacity: 1;
}

.action-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #6b7280;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.delete-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

/* 拖拽错误提示样式 */
.drag-error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10000;
  animation: slideInRight 0.3s ease-out;
  max-width: 300px;
}

.error-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.error-text {
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 拖拽样式 */
.chapter-ghost {
  opacity: 0.4;
  background: linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%) !important;
  border: 2px dashed #a5b4fc !important;
}

.chapter-chosen {
  background: #e0e7ff !important;
  border-color: #6366f1 !important;
  transform: scale(1.02);
}

.chapter-drag {
  opacity: 0.9;
  transform: rotate(2deg) scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

/* 滚动条样式 */
.tree-content::-webkit-scrollbar {
  width: 4px;
}

.tree-content::-webkit-scrollbar-track {
  background: transparent;
}

.tree-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.tree-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>