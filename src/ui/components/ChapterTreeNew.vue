<template>
  <div class="chapter-tree">
    <div class="tree-header">
      <h3>章节目录</h3>
      <button 
        class="add-chapter-btn"
        @click="$emit('add-chapter')"
        title="添加新章节"
      >
        +
      </button>
    </div>
    
    <div class="tree-content">
      <draggable
        v-model="sortedChapters"
        group="chapters"
        @change="handleDragChange"
        @start="handleDragStart"
        @end="handleDragEnd"
        animation="150"
        ghost-class="chapter-ghost"
        chosen-class="chapter-chosen"
        drag-class="chapter-drag"
        class="draggable-list"
      >
        <template #item="{ element: chapter }">
          <ChapterTreeNode 
            :chapter="chapter" 
            :chapters="chapters"
            :selected-id="selectedChapterId"
            :dragging="isDragging"
            @chapter-select="$emit('chapter-select', $event)"
            @chapter-edit="$emit('chapter-edit', $event)"
            @chapter-delete="$emit('chapter-delete', $event)"
            @add-sub-chapter="$emit('add-sub-chapter', $event)"
          />
        </template>
      </draggable>
    </div>
    
    <div v-if="chapters.length === 0" class="empty-state">
      <p>还没有章节</p>
      <button class="create-first-btn" @click="$emit('add-chapter')">
        创建第一个章节
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { VueDraggable } from 'vuedraggable'
import ChapterTreeNode from './ChapterTreeNode.vue'

interface Chapter {
  id: string
  title: string
  parentId?: string
  orderIndex: number
  type: 'chapter' | 'volume' | 'section'
  characterCount: number
  contentCount: number
  childChapterCount: number
  createdAt: string
  updatedAt: string
}

interface Props {
  chapters: Chapter[]
  selectedChapterId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'chapter-select': [chapterId: string]
  'chapter-edit': [chapter: Chapter]
  'chapter-delete': [chapterId: string]
  'add-chapter': []
  'add-sub-chapter': [parentId: string]
  'chapters-reorder': [chapters: Chapter[]]
}>()

const isDragging = ref(false)

// 排序后的章节列表
const sortedChapters = computed({
  get: () => {
    return [...props.chapters]
      .filter(chapter => !chapter.parentId) // 只显示根级章节
      .sort((a, b) => a.orderIndex - b.orderIndex)
  },
  set: (value) => {
    // 更新排序
    const reorderedChapters = value.map((chapter, index) => ({
      ...chapter,
      orderIndex: index
    }))
    emit('chapters-reorder', reorderedChapters)
  }
})

// 拖拽事件处理
const handleDragStart = () => {
  isDragging.value = true
}

const handleDragEnd = () => {
  isDragging.value = false
}

const handleDragChange = (evt: any) => {
  if (evt.moved) {
    // 拖拽移动时更新排序
    const { oldIndex, newIndex } = evt.moved
    console.log(`章节从位置 ${oldIndex} 移动到 ${newIndex}`)
  }
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