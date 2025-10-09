<template>
  <div class="chapter-node">
    <div 
      class="chapter-item"
      :class="{ 'has-children': hasChildren }"
      @click="$emit('chapter-click', chapter.id)"
    >
      <button 
        v-if="hasChildren"
        @click.stop="toggle"
        class="toggle-btn"
      >
        {{ expanded ? '▼' : '▶' }}
      </button>
      <div class="chapter-icon">📖</div>
      <div class="chapter-info">
        <span class="chapter-title">{{ chapter.title }}</span>
        <span v-if="chapter.subtitle" class="chapter-subtitle">{{ chapter.subtitle }}</span>
      </div>
      <div class="chapter-actions" @click.stop>
        <button @click="$emit('chapter-edit', chapter)" class="action-btn" title="编辑">
          ✏️
        </button>
        <button @click="$emit('chapter-delete', chapter.id)" class="action-btn" title="删除">
          🗑️
        </button>
      </div>
    </div>
    
    <!-- 子章节 -->
    <div v-if="hasChildren && expanded" class="children">
      <ChapterNode 
        v-for="child in childChapters"
        :key="child.id"
        :chapter="child"
        :chapters="chapters"
        @chapter-click="$emit('chapter-click', $event)"
        @chapter-edit="$emit('chapter-edit', $event)"
        @chapter-delete="$emit('chapter-delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Chapter } from '../../shared/types'

interface Props {
  chapter: Chapter
  chapters: Chapter[]
}

const props = defineProps<Props>()

defineEmits<{
  'chapter-click': [chapterId: string]
  'chapter-edit': [chapter: Chapter]
  'chapter-delete': [chapterId: string]
}>()

const expanded = ref(false)

const childChapters = computed(() => {
  return props.chapters.filter(c => c.parentId === props.chapter.id)
})

const hasChildren = computed(() => {
  return childChapters.value.length > 0
})

const toggle = () => {
  expanded.value = !expanded.value
}
</script>

<script lang="ts">
export default {
  name: 'ChapterNode'
}
</script>

<style scoped>
.chapter-node {
  position: relative;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.chapter-item:hover {
  background: #f8f9fa;
  border-color: #dee2e6;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 0;
  margin-right: 8px;
  cursor: pointer;
  font-size: 12px;
  color: #6c757d;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  color: #495057;
}

.chapter-icon {
  margin-right: 8px;
  font-size: 16px;
}

.chapter-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chapter-title {
  font-size: 14px;
  color: #212529;
  font-weight: 500;
}

.chapter-subtitle {
  font-size: 12px;
  color: #6c757d;
}

.chapter-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.chapter-item:hover .chapter-actions {
  opacity: 1;
}

.action-btn {
  padding: 2px 4px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #e9ecef;
}

.children {
  margin-left: 24px;
  border-left: 1px solid #e9ecef;
  padding-left: 8px;
  margin-top: 4px;
}

.children .chapter-node:last-child {
  margin-bottom: 0;
}
</style>