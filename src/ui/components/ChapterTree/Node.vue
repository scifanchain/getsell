<template>
  <div class="chapter-tree-node">
    <div 
      class="chapter-node" 
      :class="{ 
        'selected': props.selectedChapterId === chapter.id,
        'has-children': hasChildren,
        'expanded': isExpanded 
      }"
      @click="$emit('chapter-click', chapter.id)"
    >
      <div class="chapter-content">
        <span 
          v-if="hasChildren" 
          class="expand-toggle"
          :class="{ 'expanded': isExpanded }"
          @click.stop="handleToggle"
        >
          ▶
        </span>
        <span v-else class="expand-spacer"></span>
        
        <span class="chapter-icon">
          {{ isExpanded ? '📂' : '📁' }}
          <span v-if="hasChildren" class="children-count">{{ childChapters.length }}</span>
          <span v-if="chapterContents.length > 0" class="content-count">{{ chapterContents.length }}</span>
        </span>
        <span class="chapter-title">{{ chapter.title }}</span>
      </div>
      
      <div class="chapter-actions">
        <button 
          @click.stop="$emit('chapter-edit', chapter)"
          class="action-button"
          title="编辑章节"
        >
          ✏️
        </button>
        <button 
          v-if="chapter.level < 3"
          @click.stop="$emit('add-sub-chapter', chapter.id)"
          class="action-button"
          title="添加子章节"
        >
          ➕
        </button>
        <button 
          @click.stop="$emit('add-content', { chapterId: chapter.id })"
          class="action-button"
          title="添加内容"
        >
          �
        </button>
        <button 
          @click.stop="$emit('chapter-delete', chapter.id)"
          class="action-button delete"
          title="删除章节"
        >
          🗑️
        </button>
      </div>
    </div>
    
    <!-- 章节内容 -->
    <div v-if="isExpanded" class="contents-section">
      <draggable
        v-model="sortedChapterContents"
        :group="{ name: 'chapter-contents', pull: true, put: ['contents', 'chapter-contents'] }"
        @change="handleContentDragChange"
        animation="150"
      >
        <template #item="{ element: content }">
          <div 
            class="content-item"
            :class="{ 'selected': props.selectedContentId === content.id }"
            @click="$emit('content-select', content.id)"
          >
            <span class="content-icon">📄</span>
            <span class="content-title">{{ content.title }}</span>
            <div class="content-actions">
              <button 
                @click.stop="$emit('content-edit', content)"
                class="action-button small"
                title="编辑内容"
              >
                ✏️
              </button>
              <button 
                @click.stop="$emit('content-delete', content.id)"
                class="action-button small delete"
                title="删除内容"
              >
                🗑️
              </button>
            </div>
          </div>
        </template>
      </draggable>
    </div>
    
    <!-- 子章节 - Level < 3 的章节可以包含子章节 -->
    <div v-if="isExpanded && chapter.level < 3" class="children-section">
      <draggable
        v-model="sortedChildChapters"
        :group="{ name: 'chapters', pull: true, put: true }"
        :move="checkMove"
        @change="handleChildChapterDragChange"
        @start="handleDragStart"
        @end="handleDragEnd"
        animation="150"
        item-key="id"
        class="children-drop-zone"
      >
        <template #item="{ element: child }">
          <Node
            :key="child.id"
            :chapter="child"
            :chapters="chapters"
            :contents="contents"
            :selected-chapter-id="props.selectedChapterId"
            :selected-content-id="props.selectedContentId"
            :dragging="dragging"
            @chapter-toggle="$emit('chapter-toggle', $event)"
            @chapter-click="$emit('chapter-click', $event)"
            @chapter-edit="$emit('chapter-edit', $event)"
            @chapter-delete="$emit('chapter-delete', $event)"
            @add-sub-chapter="$emit('add-sub-chapter', $event)"
            @add-content="$emit('add-content', $event)"
            @content-select="$emit('content-select', $event)"
            @content-edit="$emit('content-edit', $event)"
            @content-delete="$emit('content-delete', $event)"
            @contents-reorder="$emit('contents-reorder', $event)"
            @chapters-reorder="$emit('chapters-reorder', $event)"
            @drag-error="$emit('drag-error', $event)"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import draggable from 'vuedraggable'
import type { ChapterLocal, Content } from './types'

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
  'chapter-click': [chapterId: string]
  'chapter-edit': [chapter: ChapterLocal]
  'chapter-delete': [chapterId: string]
  'add-sub-chapter': [parentId: string]
  'add-content': [data: { chapterId: string }]
  'content-select': [contentId: string]
  'content-edit': [content: Content]
  'content-delete': [contentId: string]
  'contents-reorder': [data: { chapterId: string; contents: Content[] }]
  'chapters-reorder': [chapters: ChapterLocal[]]
  'drag-error': [message: string]
}>()

const isExpanded = ref(true)
const draggedChapterId = ref<string | null>(null)

// 显示拖拽错误消息
const showDragError = (message: string) => {
  emit('drag-error', message)
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

// vuedraggable 的 move 事件检查
const checkMove = (evt: any): boolean => {
  if (!evt.draggedContext) {
    return true // 没有拖拽上下文，允许
  }
  
  const draggedChapter = evt.draggedContext.element as ChapterLocal
  const targetParent = props.chapter // 目标父章节
  const targetLevel = targetParent.level + 1 // 拖到目标章节下，新层级是父层级+1
  const subTreeDepth = getSubTreeDepth(draggedChapter.id)
  const finalMaxLevel = targetLevel + subTreeDepth
  
  console.log(`[拖拽验证] "${draggedChapter.title}" (level=${draggedChapter.level}, 子树深度=${subTreeDepth}) → "${targetParent.title}" (level=${targetParent.level})`)
  console.log(`  目标level=${targetLevel}, 最终最大level=${finalMaxLevel}`)
  
  // 三层结构: Level 1(卷), Level 2(章), Level 3(节)
  // 规则: 任何章节移动后，它及其所有子章节的 level 都不能超过 3
  if (finalMaxLevel > 3) {
    // 判断具体情况给出友好提示
    if (targetParent.level === 3) {
      // 不能移到节下面
      showDragError(`无法移动到 "${targetParent.title}" 下：节不能包含子章节`)
    } else if (targetParent.level === 2 && subTreeDepth > 0) {
      // 移到章下面，但被拖拽的章节有子节点
      if (draggedChapter.level === 2 && subTreeDepth === 1) {
        // 这是一个有节的章，不能移到另一个章下面
        showDragError(`无法移动 "${draggedChapter.title}"：该章包含子节，只能移到卷下面或根目录`)
      } else {
        showDragError(`无法移动 "${draggedChapter.title}"：该章节有${subTreeDepth}层子章节，移到这里会超过3层限制`)
      }
    } else if (subTreeDepth > 0) {
      // 其他情况：被拖拽的章节有子章节，会超过层级限制
      showDragError(`无法移动 "${draggedChapter.title}"：该章节有${subTreeDepth}层子章节，移到这里会超过3层限制`)
    } else {
      showDragError(`无法移动 "${draggedChapter.title}"：会超过3层目录限制`)
    }
    return false
  }
  
  return true
}

// 子章节
const childChapters = computed(() => {
  return props.chapters
    .filter(ch => ch.parentId === props.chapter.id)
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
})

// 是否有子章节
const hasChildren = computed(() => childChapters.value.length > 0)

// 章节内容
const chapterContents = computed(() => {
  return (props.contents || [])
    .filter(content => content.chapterId === props.chapter.id)
    .sort((a, b) => a.orderIndex - b.orderIndex)
})

// 可排序的子章节 - 简化版本
const sortedChildChapters = computed({
  get: () => childChapters.value,
  set: (value) => {
    console.log('=== 子章节顺序更新 ===')
    console.log('当前父章节:', props.chapter.title, 'level:', props.chapter.level)
    console.log('拖入的章节:', value.map(ch => `${ch.title}(level=${ch.level})`))
    
    // 验证每个章节移动是否合法
    for (const chapter of value) {
      const targetLevel = props.chapter.level + 1
      const subTreeDepth = getSubTreeDepth(chapter.id)
      const finalMaxLevel = targetLevel + subTreeDepth
      
      console.log(`  验证 "${chapter.title}": 目标level=${targetLevel}, 子树深度=${subTreeDepth}, 最终最大level=${finalMaxLevel}`)
      
      if (finalMaxLevel > 3) {
        // 拒绝这次移动
        if (props.chapter.level === 3) {
          showDragError(`无法移动到 "${props.chapter.title}" 下：节不能包含子章节`)
        } else if (props.chapter.level === 2 && subTreeDepth > 0) {
          if (chapter.level === 2 && subTreeDepth === 1) {
            showDragError(`无法移动 "${chapter.title}"：该章包含子节，只能移到卷下面或根目录`)
          } else {
            showDragError(`无法移动 "${chapter.title}"：该章节有${subTreeDepth}层子章节，移到这里会超过3层限制`)
          }
        } else {
          showDragError(`无法移动 "${chapter.title}"：该章节有${subTreeDepth}层子章节，移到这里会超过3层限制`)
        }
        console.log('❌ 验证失败，阻止更新')
        return // 阻止更新
      }
    }
    
    console.log('✅ 验证通过，开始更新章节数据')
    
    // 创建新的章节列表，不直接修改原数组
    const updatedChapters = [...props.chapters]
    
    // 记录哪些章节被移动到这里了
    const movedChapterIds = new Set(value.map(ch => ch.id))
    
    // 更新被移动章节的信息
    value.forEach((chapter, index) => {
      const chapterIndex = updatedChapters.findIndex(ch => ch.id === chapter.id)
      if (chapterIndex >= 0) {
        updatedChapters[chapterIndex] = {
          ...updatedChapters[chapterIndex],
          parentId: props.chapter.id,
          orderIndex: index,
          level: props.chapter.level + 1
        }
      }
    })
    
    // 递归更新被移动章节的子章节层级
    const updateChildrenLevels = (parentId: string, parentLevel: number) => {
      const children = updatedChapters.filter(ch => ch.parentId === parentId)
      children.forEach(child => {
        const childIndex = updatedChapters.findIndex(ch => ch.id === child.id)
        if (childIndex >= 0) {
          updatedChapters[childIndex] = {
            ...updatedChapters[childIndex],
            level: parentLevel + 1
          }
          updateChildrenLevels(child.id, parentLevel + 1)
        }
      })
    }
    
    // 为每个被移动的章节更新其子章节
    value.forEach(chapter => {
      updateChildrenLevels(chapter.id, props.chapter.level + 1)
    })
    
    console.log('发送 chapters-reorder 事件')
    emit('chapters-reorder', updatedChapters)
  }
})

// 可排序的章节内容
const sortedChapterContents = computed({
  get: () => chapterContents.value,
  set: (value) => {
    console.log('=== 章节内容拖拽完成 ===')
    console.log('章节:', props.chapter.title)
    console.log('新内容顺序:', value.map(c => c.title))
    
    const updatedContents = value.map((content, index) => ({
      ...content,
      chapterId: props.chapter.id,
      orderIndex: index
    }))
    
    emit('contents-reorder', { 
      chapterId: props.chapter.id, 
      contents: updatedContents
    })
  }
})

// 处理章节切换
const handleToggle = () => {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value
    emit('chapter-toggle', props.chapter.id)
  }
}

// 处理拖拽开始
const handleDragStart = (evt: any) => {
  console.log('拖拽开始:', evt)
  if (evt.item && evt.item.dataset) {
    draggedChapterId.value = evt.item.dataset.chapterId
  }
}

// 处理拖拽结束
const handleDragEnd = (evt: any) => {
  console.log('拖拽结束:', evt)
  draggedChapterId.value = null
}

// 处理子章节拖拽变化
const handleChildChapterDragChange = (evt: any) => {
  console.log('子章节拖拽变化:', evt)
  
  if (evt.added) {
    console.log('章节被添加到:', props.chapter.title)
    console.log('添加的章节:', evt.added.element.title)
  }
  
  if (evt.removed) {
    console.log('章节被移除自:', props.chapter.title)
    console.log('移除的章节:', evt.removed.element.title)
  }
  
  if (evt.moved) {
    console.log('章节内部移动:', evt.moved.element.title)
  }
}

// 处理内容拖拽变化
const handleContentDragChange = (evt: any) => {
  console.log('内容拖拽变化:', evt)
}
</script>

<style scoped>
.chapter-tree-node {
  user-select: none;
}

.chapter-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 8px;
  margin: 0;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.15s ease;
}

.chapter-node:hover {
  background-color: #f0f0f0;
}

.chapter-node.selected {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.chapter-content {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.expand-toggle {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  transition: transform 0.2s ease;
  font-size: 10px;
  color: #666;
}

.expand-toggle.expanded {
  transform: rotate(90deg);
}

.expand-spacer {
  width: 20px;
}

.chapter-icon {
  margin-right: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 3px;
}

.children-count {
  font-size: 10px;
  color: #666;
  background-color: #bbdefb;
  padding: 0 4px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
  font-weight: 500;
}

.content-count {
  font-size: 10px;
  color: #666;
  background-color: #c8e6c9;
  padding: 0 4px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
  font-weight: 500;
}

.chapter-node.selected .children-count {
  background-color: #1976d2;
  color: #fff;
}

.chapter-node.selected .content-count {
  background-color: #388e3c;
  color: #fff;
}

.chapter-title {
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chapter-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.chapter-node:hover .chapter-actions {
  opacity: 1;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
  transition: background-color 0.15s ease;
}

.action-button:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.action-button.delete:hover {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.action-button.small {
  width: 20px;
  height: 20px;
  font-size: 10px;
}

.contents-section {
  margin-left: 16px;
  margin-top: 1px;
}

.content-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 6px;
  margin: 0;
  background-color: #fafafa;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.content-item:hover {
  background-color: #f0f0f0;
}

.content-item.selected {
  background-color: #e8f5e8;
  border-left: 3px solid #4caf50;
}

.content-icon {
  margin-right: 6px;
  font-size: 12px;
}

.content-title {
  font-size: 13px;
  color: #555;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.content-item:hover .content-actions {
  opacity: 1;
}

.children-section {
  margin-left: 16px;
  margin-top: 1px;
}

.children-section.collapsed {
  /* 折叠时隐藏子章节，但保留拖放区域 */
  max-height: 0;
  overflow: visible; /* 允许拖放提示显示 */
}

.children-section.collapsed > .children-drop-zone > * {
  /* 隐藏折叠状态下的子章节 */
  display: none;
}

.children-drop-zone {
  min-height: 5px; /* 确保有足够的区域接收拖放 */
}

.content-drop-zone {
  min-height: 20px;
  padding: 2px 0;
}

.content-drop-zone.empty {
  min-height: 20px;
}
</style>