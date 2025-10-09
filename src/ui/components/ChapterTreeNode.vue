<template>
  <div 
    class="chapter-tree-node"
    :class="{
      'selected': selectedId === chapter.id,
      'dragging': dragging
    }"
  >
    <div 
      class="node-content"
      @click="$emit('chapter-select', chapter.id)"
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
            <span class="word-count">{{ chapter.characterCount }}字</span>
            <span v-if="chapter.contentCount > 0" class="content-count">
              {{ chapter.contentCount }}段
            </span>
          </div>
        </div>
      </div>
      
      <div class="node-actions">
        <button 
          class="action-btn"
          @click.stop="$emit('add-sub-chapter', chapter.id)"
          title="添加子章节"
        >
          +
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
    
    <!-- 子章节 -->
    <div v-if="hasChildren && isExpanded" class="children">
      <ChapterTreeNode
        v-for="child in childChapters"
        :key="child.id"
        :chapter="child"
        :chapters="chapters"
        :selected-id="selectedId"
        :dragging="dragging"
        @chapter-select="$emit('chapter-select', $event)"
        @chapter-edit="$emit('chapter-edit', $event)"
        @chapter-delete="$emit('chapter-delete', $event)"
        @add-sub-chapter="$emit('add-sub-chapter', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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
  chapter: Chapter
  chapters: Chapter[]
  selectedId?: string
  dragging?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'chapter-select': [chapterId: string]
  'chapter-edit': [chapter: Chapter]
  'chapter-delete': [chapterId: string]
  'add-sub-chapter': [parentId: string]
}>()

const isExpanded = ref(true) // 默认展开

// 子章节
const childChapters = computed(() => {
  return props.chapters
    .filter(ch => ch.parentId === props.chapter.id)
    .sort((a, b) => a.orderIndex - b.orderIndex)
})

// 是否有子章节
const hasChildren = computed(() => {
  return childChapters.value.length > 0
})

// 切换展开状态
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
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
  margin-top: 4px;
}

/* 拖拽状态样式 */
.chapter-tree-node.dragging {
  opacity: 0.5;
}
</style>