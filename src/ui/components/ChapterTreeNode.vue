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
      <div 
        v-for="content in chapterContents"
        :key="content.id"
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
    </div>
    
    <!-- 子章节 -->
    <div v-if="hasChildren && isExpanded" class="children">
      <ChapterTreeNode
        v-for="child in childChapters"
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
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Chapter, Content } from '../types/models'

interface Props {
  chapter: Chapter
  chapters: Chapter[]
  contents?: Content[]
  selectedChapterId?: string
  selectedContentId?: string
  dragging?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'chapter-toggle': [chapterId: string]
  'chapter-edit': [chapter: Chapter]
  'chapter-delete': [chapterId: string]
  'add-sub-chapter': [parentId: string]
  'add-content': [data: { chapterId: string }]
  'content-select': [contentId: string]
  'content-edit': [content: Content]
  'content-delete': [contentId: string]
  'contents-reorder': [data: { chapterId: string; contents: Content[] }]
}>()

const isExpanded = ref(true) // 默认展开

// 子章节
const childChapters = computed(() => {
  return props.chapters
    .filter(ch => ch.parentId === props.chapter.id)
    .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
})

// 章节内容
const chapterContents = computed(() => {
  return (props.contents || [])
    .filter(content => content.chapterId === props.chapter.id)
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
  margin-left: 20px;
  margin-top: 4px;
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