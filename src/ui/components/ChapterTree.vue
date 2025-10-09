<template>
  <div class="chapter-tree">
    <div 
      v-for="chapter in rootChapters" 
      :key="chapter.id" 
      class="tree-node"
    >
      <ChapterNode 
        :chapter="chapter" 
        :chapters="chapters"
        @chapter-click="$emit('chapter-click', $event)"
        @chapter-edit="$emit('chapter-edit', $event)"
        @chapter-delete="$emit('chapter-delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Chapter } from '../../shared/types'
import ChapterNode from './ChapterNode.vue'

interface Props {
  chapters: Chapter[]
}

const props = defineProps<Props>()

defineEmits<{
  'chapter-click': [chapterId: string]
  'chapter-edit': [chapter: Chapter]
  'chapter-delete': [chapterId: string]
}>()

// 获取根级章节（没有父章节的章节）
const rootChapters = computed(() => {
  return props.chapters.filter(chapter => !chapter.parentId)
})
</script>

<script lang="ts">
export default {
  name: 'ChapterTree'
}
</script>

<style scoped>
.chapter-tree {
  padding: 8px 0;
}

.tree-node {
  margin-bottom: 4px;
}
</style>