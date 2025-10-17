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
      <!-- 根目录内容拖拽区域 -->
      <div class="root-contents" v-show="rootContentsList.length > 0 || isDragging">
        <draggable
          v-model="rootContentsList"
          group="content-items"
          item-key="id"
          class="content-list root-drop-zone"
          :class="{ 'empty': rootContentsList.length === 0, 'dragging': isDragging, 'show-when-empty': rootContentsList.length === 0 && isDragging }"
          :move="validateContentMove"
          @change="handleRootContentChange"
          @start="onContentDragStart"
          @end="onContentDragEnd"
          @add="onContentAdd"
          @remove="onContentRemove"
          @update="onContentUpdate"
        >
          <template #item="{ element: content }">
            <div 
              class="content-item"
              :class="{ 'selected': props.selectedContentId === content.id }"
              :data-content-id="content.id"
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

      <!-- 根级章节拖拽区域 -->
      <div class="root-chapters">
        <draggable
          :list="rootChaptersList"
          group="chapters"
          @start="onChapterDragStart"
          @end="onChapterDragEnd"
          @add="onChapterAdd"
          @remove="onChapterRemove"
          @update="onChapterUpdate"
          :move="validateChapterMove"
          item-key="id"
          class="chapter-list"
          animation="150"
          ghost-class="chapter-ghost"
          chosen-class="chapter-chosen"
        >
          <template #item="{ element: chapter }">
            <ChapterTreeNode
              :key="chapter.id"
              :chapter="chapter"
              :chapters="props.chapters"
              :contents="props.contents"
              :user-id="props.userId"
              :selected-chapter-id="props.selectedChapterId"
              :selected-content-id="props.selectedContentId"
              :is-dragging="isDragging"
              @chapter-toggle="$emit('chapter-toggle', $event)"
              @chapter-click="$emit('chapter-click', $event)"
              @chapter-edit="$emit('chapter-edit', $event)"
              @chapter-delete="$emit('chapter-delete', $event)"
              @add-sub-chapter="$emit('add-sub-chapter', $event)"
              @add-content="handleAddContentToChapter"
              @content-select="$emit('content-select', $event)"
              @content-edit="$emit('content-edit', $event)"
              @content-delete="$emit('content-delete', $event)"
              @contents-reorder="handleContentsReorder"
              @chapters-reorder="handleChaptersReorder"
              @drag-error="showDragError"
              @content-drag-start="handleGlobalDragStart"
              @content-drag-end="handleGlobalDragEnd"
            />
          </template>
        </draggable>
      </div>
    </div>

    <!-- 内容创建模态框 -->
    <ContentCreateModal
      :is-visible="showCreateContentModal"
      :work-id="props.workId"
      :chapter-id="createContentChapterId ?? undefined"
      @close="handleCloseCreateContentModal"
      @create="handleContentCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import draggable from 'vuedraggable'
import ChapterTreeNode from './Node.vue'
import ContentCreateModal from '../ContentCreateModal.vue'
import type { ChapterLocal, Content } from './types'

interface Props {
  chapters: ChapterLocal[]
  contents: Content[]
  workId?: string
  userId?: string
  selectedChapterId?: string
  selectedContentId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'chapter-toggle': [chapterId: string]
  'chapter-click': [chapterId: string]
  'chapter-edit': [chapter: ChapterLocal]
  'chapter-delete': [chapterId: string]
  'add-chapter': []
  'add-sub-chapter': [parentId: string]
  'add-content': [data: { chapterId?: string }]
  'content-select': [contentId: string]
  'content-edit': [content: Content]
  'content-delete': [contentId: string]
  'contents-reorder': [data: { chapterId?: string; contents: Content[] }]
  'chapters-reorder': [chapters: ChapterLocal[]]
}>()

// 状态管理
const dragErrorMessage = ref<string>('')
const showCreateContentModal = ref(false)
const createContentChapterId = ref<string | null>(null)
const isDragging = ref(false)

// 根级章节列表（响应式数组，用于 draggable）
const rootChaptersList = computed({
  get: () => {
    return props.chapters
      .filter(chapter => !chapter.parentId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  },
  set: (newList) => {
    // 不在这里处理，交给 onChapterDragEnd 处理
  }
})

// 处理根目录内容拖拽变化
const handleRootContentChange = (evt: any) => {
  console.log('📄 根目录内容拖拽变化:', evt)
  
  if (evt.added) {
    console.log('📄➕ 内容被添加到根目录')
    console.log('📄➕ 添加的内容:', evt.added.element.title)
  }
  
  if (evt.removed) {
    console.log('📄➖ 内容从根目录移除')
    console.log('📄➖ 移除的内容:', evt.removed.element.title)
  }
  
  if (evt.moved) {
    console.log('📄🔄 根目录内容重新排序')
    console.log('📄🔄 移动的内容:', evt.moved.element.title)
  }
}

// 根目录内容列表内部状态
const rootContentsInternal = ref<Content[]>([])

const syncRootContents = () => {
  rootContentsInternal.value = props.contents
    .filter(content => !content.chapterId)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
}

watch(
  () => props.contents,
  () => {
    syncRootContents()
  },
  { immediate: true, deep: true }
)

const rootContentsList = computed({
  get: () => rootContentsInternal.value,
  set: (newList) => {
    // 保持内部显示顺序，等待父组件响应后同步
    rootContentsInternal.value = [...newList]

    const updatedContents = newList.map((content, index) => ({
      ...content,
      chapterId: undefined,
      orderIndex: index
    }))

    emit('contents-reorder', { chapterId: undefined, contents: updatedContents })
  }
})

// 显示拖拽错误并自动隐藏
const showDragError = (message: string) => {
  dragErrorMessage.value = message
  setTimeout(() => {
    dragErrorMessage.value = ''
  }, 3000)
}

// 计算章节子树深度
const getSubTreeDepth = (chapterId: string): number => {
  const childChapters = props.chapters.filter(ch => ch.parentId === chapterId)
  if (childChapters.length === 0) {
    return 0
  }
  
  let maxDepth = 0
  for (const child of childChapters) {
    const childDepth = getSubTreeDepth(child.id)
    maxDepth = Math.max(maxDepth, childDepth + 1)
  }
  
  return maxDepth
}

// 验证章节移动到根级别
const validateChapterMove = (evt: any) => {
  if (!evt.draggedContext) return true
  
  const draggedChapter = evt.draggedContext.element as ChapterLocal
  
  // 移动到根级别，新的 level 是 1
  const targetLevel = 1
  const subTreeDepth = getSubTreeDepth(draggedChapter.id)
  const finalMaxLevel = targetLevel + subTreeDepth
  
  if (finalMaxLevel > 3) {
    showDragError(`无法移动 "${draggedChapter.title}" 到根目录：该章节有${subTreeDepth}层子章节，会超过3层限制`)
    return false
  }
  
  return true
}

// 验证内容移动（内容可以移动到任何位置）
const validateContentMove = (evt: any) => {
  console.log('�🔥🔥 [我的调试] validateContentMove 被调用!')
  console.log('�🔍 [根目录] 验证内容移动:', evt)
  console.log('🔍 draggedContext:', evt.draggedContext)
  console.log('🔍 relatedContext:', evt.relatedContext)
  return true // 内容可以移动到任意位置
}

// 处理根目录章节拖拽开始
const onChapterDragStart = (evt: any) => {
  console.log('🔷 [根目录] 章节拖拽开始:', evt)
}

// 处理章节添加到根目录
const onChapterAdd = (evt: any) => {
  console.log('➕🔷 [根目录] 章节添加:', evt)
  const { element, newIndex } = evt
  
  // 安全地获取章节信息
  const chapterTitle = element?.title || 'Unknown Chapter'
  console.log(`➕🔷 添加章节: ${chapterTitle} 到根目录, 位置: ${newIndex}`)
  
  // 注意：不在这里处理层级更新，交给 onChapterDragEnd 处理
}

// 处理章节从根目录移除
const onChapterRemove = (evt: any) => {
  console.log('➖🔷 [根目录] 章节移除:', evt)
  const { element, oldIndex } = evt
  
  // 安全地获取章节信息
  const chapterTitle = element?.title || 'Unknown Chapter'
  console.log(`➖🔷 移除章节: ${chapterTitle} 从根目录, 原位置: ${oldIndex}`)
  
  // 注意：不在这里处理层级更新，交给目标容器的 onChapterDragEnd 处理
}

// 处理根目录章节重新排序
const onChapterUpdate = (evt: any) => {
  console.log('🔄🔷 [根目录] 章节更新:', evt)
  const { oldIndex, newIndex } = evt
  
  console.log(`🔄🔷 根目录章节重新排序: 从位置 ${oldIndex} 移动到位置 ${newIndex}`)
  
  // 注意：不在这里处理层级更新，交给 onChapterDragEnd 处理
}

// 处理章节拖拽结束
const onChapterDragEnd = (evt: any) => {
  const { newIndex, oldIndex, item, to, from, pullMode } = evt
  const isCrossChapter = to !== from
  
  console.log(`🔷 [根目录] 章节拖拽结束事件 (${isCrossChapter ? '跨章节' : '根目录内'})`)
  console.log('🔷 详细事件信息:')
  console.log('🔷 - to (目标容器):', to)
  console.log('🔷 - from (源容器):', from)
  console.log('🔷 - 跨章节拖拽:', isCrossChapter)
  console.log('🔷 - pullMode:', pullMode)
  
  // 如果是根目录内拖拽且位置没变化，不处理
  if (!isCrossChapter && newIndex === oldIndex) {
    console.log('🔷 根目录内位置无变化，跳过处理')
    return
  }
  
  // 获取当前的根级章节列表
  const rootChapters = rootChaptersList.value
  console.log(`🔷 根目录章节数量: ${rootChapters.length}`)
  console.log('🔷 根目录章节列表:', rootChapters.map(c => `${c.id}: ${c.title} (level: ${c.level})`))
  
  // 更新章节的 orderIndex 和 level
  const updatedChapters = [...props.chapters]
  
  // 根级章节的level固定为1
  const rootLevel = 1
  console.log(`🔷 设置根级章节level为: ${rootLevel}`)
  
  rootChapters.forEach((chapter, index) => {
    const chapterIndex = updatedChapters.findIndex(ch => ch.id === chapter.id)
    if (chapterIndex >= 0) {
      const oldLevel = updatedChapters[chapterIndex].level
      updatedChapters[chapterIndex] = {
        ...updatedChapters[chapterIndex],
        parentId: undefined, // 根级章节
        level: rootLevel, // 根级章节 level 为 1
        orderIndex: index
      }
      
      console.log(`🔷 更新章节: ${chapter.title} -> 移到根目录, level: ${oldLevel} -> ${rootLevel}, 位置: ${index}`)
      
      // 递归更新子章节的 level
      updateChildrenLevels(updatedChapters, chapter.id, rootLevel)
    }
  })
  
  console.log('🔷 发送 chapters-reorder 事件')
  emit('chapters-reorder', updatedChapters)
}

// 全局拖拽状态管理
const handleGlobalDragStart = () => {
  isDragging.value = true
}

const handleGlobalDragEnd = () => {
  isDragging.value = false
}

// 处理根目录内容拖拽开始
const onContentDragStart = (evt: any) => {
  console.log('🔥🔥🔥 [我的调试] onContentDragStart 被调用!')
  console.log('🚀 [根目录] 内容拖拽开始:', evt)
  handleGlobalDragStart()
}

// 处理内容添加到根目录
const onContentAdd = (evt: any) => {
  console.log('🔥🔥🔥 [我的调试] onContentAdd 被调用!')
  console.log('➕ [根目录] 内容添加:', evt)
  console.log('➕ 事件详情:', {
    element: evt.element,
    newIndex: evt.newIndex,
    from: evt.from,
    to: evt.to
  })
  const { element, newIndex } = evt
  
  // 安全地获取内容信息
  const contentTitle = element?.title || element?.textContent || 'Unknown Content'
  console.log(`🔥🔥🔥 [我的调试] 添加内容: ${contentTitle} 到根目录, 位置: ${newIndex}`)
  
  // 立即更新内容的章节归属为根目录
  const updatedContents = rootContentsList.value.map((content, index) => ({
    ...content,
    chapterId: undefined, // 根目录内容
    orderIndex: index
  }))
  
  console.log('🔥🔥🔥 [我的调试] 发送 contents-reorder 事件 (添加到根目录)')
  emit('contents-reorder', { chapterId: undefined, contents: updatedContents })
}

// 处理内容从根目录移除
const onContentRemove = (evt: any) => {
  console.log('➖ [根目录] 内容移除:', evt)
  const { element, oldIndex } = evt
  
  // 安全地获取内容信息
  const contentTitle = element?.title || element?.textContent || 'Unknown Content'
  console.log(`➖ 移除内容: ${contentTitle} 从根目录, 原位置: ${oldIndex}`)
  
  // 更新剩余内容的顺序
  const updatedContents = rootContentsList.value.map((content, index) => ({
    ...content,
    chapterId: undefined,
    orderIndex: index
  }))
  
  console.log('➖ 发送 contents-reorder 事件 (从根目录移除)')
  emit('contents-reorder', { chapterId: undefined, contents: updatedContents })
}

// 处理根目录内容重新排序
const onContentUpdate = (evt: any) => {
  console.log('🔄 [根目录] 内容更新:', evt)
  const { oldIndex, newIndex } = evt
  
  console.log(`🔄 根目录内容重新排序: 从位置 ${oldIndex} 移动到位置 ${newIndex}`)
  
  // 更新内容顺序
  const updatedContents = rootContentsList.value.map((content, index) => ({
    ...content,
    chapterId: undefined,
    orderIndex: index
  }))
  
  console.log('🔄 发送 contents-reorder 事件 (根目录更新)')
  emit('contents-reorder', { chapterId: undefined, contents: updatedContents })
}

// 处理内容拖拽结束
const onContentDragEnd = (evt: any) => {
  console.log('🔥🔥🔥 [我的调试] onContentDragEnd 被调用!')
  const { newIndex, oldIndex, item, to, from, pullMode } = evt
  const isCrossChapter = to !== from
  
  console.log(`�🔥🔥 [我的调试] [根目录] 内容拖拽结束事件 (${isCrossChapter ? '跨章节' : '根目录内'})`)
  console.log('📁 详细事件信息:')
  console.log('📁 - to (目标容器):', to)
  console.log('📁 - from (源容器):', from)
  console.log('📁 - 跨章节拖拽:', isCrossChapter)
  console.log('📁 - pullMode:', pullMode)
  
  // 获取被拖拽的内容ID
  const draggedContentId = item.dataset?.contentId || 
    item.querySelector('[data-content-id]')?.dataset?.contentId ||
    rootContentsList.value[oldIndex]?.id
  
  if (!draggedContentId) {
    console.error('❌ 无法获取被拖拽的内容ID')
    return
  }
  
  console.log(`📁 拖拽内容ID: ${draggedContentId}`)
  console.log(`📁 从索引 ${oldIndex} 移动到索引 ${newIndex}`)
  console.log('📁 当前位置: 根目录')
  
  // 如果是根目录内拖拽且位置没变化，不处理
  if (!isCrossChapter && newIndex === oldIndex) {
    console.log('📁 根目录内位置无变化，跳过处理')
    return
  }
  
  // 获取当前的根目录内容列表（这是拖拽后的最新状态）
  const rootContents = rootContentsList.value
  console.log(`📁 根目录内容数量: ${rootContents.length}`)
  console.log('📁 根目录内容列表:', rootContents.map(c => `${c.id}: ${c.title}`))
  
  // 更新内容的 orderIndex 和 chapterId
  const updatedContents = rootContents.map((content, index) => {
    const updatedContent = {
      ...content,
      chapterId: undefined, // 根目录内容
      orderIndex: index
    }
    
    if (content.id === draggedContentId) {
      console.log(`📁 更新被拖拽内容: ${content.title} -> 移到根目录, 位置: ${index}`)
    }
    
    return updatedContent
  })
  
  console.log('📁 发送 contents-reorder 事件')
  console.log('📁 更新内容数据:', updatedContents.map(c => `${c.id}: ${c.title} (章节: ${c.chapterId || '根目录'}, 位置: ${c.orderIndex})`))
  emit('contents-reorder', { chapterId: undefined, contents: updatedContents })
  
  // 重置拖拽状态
  handleGlobalDragEnd()
}

// 调试章节数据
const debugChapterData = () => {
  console.log('🐛 ============ 章节数据调试 ============')
  console.log('🐛 所有章节数据:')
  
  props.chapters.forEach(chapter => {
    console.log(`🐛 章节: ${chapter.title}`)
    console.log(`   ID: ${chapter.id}`)
    console.log(`   parentId: ${chapter.parentId || 'null (根级章节)'}`)
    console.log(`   level: ${chapter.level}`)
    console.log(`   orderIndex: ${chapter.orderIndex}`)
    console.log('   ---')
  })
  
  console.log('🐛 根级章节:')
  const rootChaps = props.chapters.filter(ch => !ch.parentId)
  rootChaps.forEach(ch => console.log(`   - ${ch.title} (level: ${ch.level})`))
  
  console.log('🐛 按层级分组:')
  for (let level = 1; level <= 3; level++) {
    const levelChapters = props.chapters.filter(ch => ch.level === level)
    console.log(`   Level ${level}: ${levelChapters.length} 个章节`)
    levelChapters.forEach(ch => {
      const parentTitle = ch.parentId ? 
        props.chapters.find(p => p.id === ch.parentId)?.title : '根目录'
      console.log(`     - ${ch.title} (父: ${parentTitle})`)
    })
  }
  
  console.log('🐛 检查孤儿章节:')
  const orphans = props.chapters.filter(ch => {
    if (!ch.parentId) return false // 根级章节不是孤儿
    return !props.chapters.find(p => p.id === ch.parentId)
  })
  if (orphans.length > 0) {
    console.log('⚠️ 发现孤儿章节:')
    orphans.forEach(ch => console.log(`     - ${ch.title} (缺失父章节: ${ch.parentId})`))
  } else {
    console.log('✅ 没有孤儿章节')
  }
  
  console.log('🐛 检查层级不一致:')
  const inconsistentLevels: string[] = []
  props.chapters.forEach(ch => {
    if (!ch.parentId) {
      // 根级章节应该是 level 1
      if (ch.level !== 1) {
        inconsistentLevels.push(`${ch.title}: 根级章节但 level=${ch.level} (应该是1)`)
      }
    } else {
      // 子章节的 level 应该是父章节 level + 1
      const parent = props.chapters.find(p => p.id === ch.parentId)
      if (parent && ch.level !== parent.level + 1) {
        inconsistentLevels.push(`${ch.title}: level=${ch.level} 但父章节 ${parent.title} level=${parent.level} (应该是${parent.level + 1})`)
      }
    }
  })
  
  if (inconsistentLevels.length > 0) {
    console.log('⚠️ 发现层级不一致:')
    inconsistentLevels.forEach(msg => console.log(`     - ${msg}`))
  } else {
    console.log('✅ 层级一致')
  }
  
  console.log('🐛 ================================')
}

// 修复所有章节的层级
const fixAllChapterLevels = () => {
  console.log('🔧 开始修复所有章节层级...')
  
  const updatedChapters = [...props.chapters]
  
  // 首先处理根级章节
  const rootChapters = updatedChapters.filter(ch => !ch.parentId)
  rootChapters.forEach(ch => {
    const index = updatedChapters.findIndex(c => c.id === ch.id)
    if (index >= 0) {
      updatedChapters[index] = { ...updatedChapters[index], level: 1 }
      console.log(`🔧 修复根级章节: ${ch.title} -> level 1`)
    }
  })
  
  // 递归修复所有子章节
  rootChapters.forEach(rootChapter => {
    updateChildrenLevels(updatedChapters, rootChapter.id, 1)
  })
  
  console.log('🔧 发送修复后的章节数据')
  emit('chapters-reorder', updatedChapters)
}

// 递归更新子章节的 level
const updateChildrenLevels = (chapters: ChapterLocal[], parentId: string, parentLevel: number) => {
  const children = chapters.filter(ch => ch.parentId === parentId)
  console.log(`🔧 [根目录] 更新子章节层级: 父章节=${parentId}, 父级别=${parentLevel}, 子章节数=${children.length}`)
  
  children.forEach(child => {
    const childIndex = chapters.findIndex(ch => ch.id === child.id)
    if (childIndex >= 0) {
      const oldLevel = chapters[childIndex].level
      const newLevel = parentLevel + 1
      
      // 确保level值在有效范围内 (1-3)
      if (newLevel > 3) {
        console.warn(`⚠️ 警告: 章节 ${child.title} 的level将超过最大值3，跳过更新`)
        return
      }
      
      chapters[childIndex] = {
        ...chapters[childIndex],
        level: newLevel
      }
      
      console.log(`🔧   - [根目录] 更新章节: ${child.title} 从 level ${oldLevel} -> ${newLevel}`)
      
      // 递归更新子章节的 level
      updateChildrenLevels(chapters, child.id, newLevel)
    }
  })
}

// 处理添加根目录内容
const handleAddRootContent = () => {
  createContentChapterId.value = null
  showCreateContentModal.value = true
}

// 处理添加内容到章节
const handleAddContentToChapter = (data: { chapterId: string }) => {
  console.log('ChapterTree: handleAddContentToChapter 被调用', data)
  createContentChapterId.value = data.chapterId
  showCreateContentModal.value = true
}

// 处理关闭内容创建模态框
const handleCloseCreateContentModal = () => {
  showCreateContentModal.value = false
  createContentChapterId.value = null
}

// 处理内容创建完成
const handleContentCreated = (data: any) => {
  console.log('ChapterTree: handleContentCreated 被调用', data)
  // 传递完整的 data，包括 title, type, workId, chapterId
  emit('add-content', data)
  handleCloseCreateContentModal()
}

// 处理子组件的内容重排序
const handleContentsReorder = (data: { chapterId: string; contents: Content[] }) => {
  emit('contents-reorder', data)
}

// 处理子组件的章节重排序
const handleChaptersReorder = (chapters: ChapterLocal[]) => {
  emit('chapters-reorder', chapters)
}
</script>

<style scoped>
.chapter-tree {
  padding: 8px;
  height: 100%;
  overflow-y: auto;
  background-color: #fafafa;
  border-radius: 4px;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.tree-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.add-content-btn,
.add-chapter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: #fff;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.add-content-btn:hover,
.add-chapter-btn:hover {
  background-color: #f0f0f0;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.drag-error-toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #856404;
}

.error-icon {
  font-size: 16px;
}

.tree-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #555;
  padding: 4px 8px;
  background-color: #f5f5f5;
  border-radius: 3px;
}

.root-contents,
.root-chapters {
  background-color: #fff;
  border-radius: 4px;
  padding: 8px;
  border: 1px solid #e0e0e0;
}

.root-drop-zone.empty.show-when-empty {
  min-height: 60px;
  height: 60px;
  border: 2px dashed #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 14px;
  margin: 8px 0;
}

.root-drop-zone.empty.show-when-empty::before {
  content: '拖放内容到根目录';
}

.root-drop-zone.empty {
  min-height: 0;
  height: 0;
  border: none;
  overflow: hidden;
  transition: all 0.2s ease;
  margin: 0;
  padding: 0;
}

.root-drop-zone.empty.dragging {
  min-height: 60px;
  height: 60px;
  border: 2px dashed #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 14px;
  margin: 8px 0;
}

.root-drop-zone.empty.dragging::before {
  content: '拖放内容到根目录';
}

.content-list,
.chapter-list {
  min-height: 40px;
}

.content-list.empty {
  min-height: 0;
  height: 0;
  border: none;
  overflow: hidden;
  transition: all 0.2s ease;
}

.content-list.empty.dragging {
  min-height: 60px;
  height: 60px;
  border: 2px dashed #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 14px;
}

.content-list.empty.dragging::before {
  content: '拖放内容到此处';
}

.content-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  margin: 2px 0;
  background-color: #fafafa;
  border-radius: 4px;
  cursor: move;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.content-item:hover {
  background-color: #f0f0f0;
  border-color: #ddd;
}

.content-item.selected {
  background-color: #e8f5e8;
  border-color: #4caf50;
}

.content-icon {
  margin-right: 8px;
  font-size: 14px;
}

.content-title {
  font-size: 14px;
  color: #333;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.content-item:hover .content-actions {
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

/* 拖拽样式 */
.content-ghost {
  opacity: 0.5;
  background-color: #e3f2fd !important;
}

.content-chosen {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 拖拽悬停时的视觉反馈 */
.content-list.sortable-drag-over,
.content-list.sortable-ghost,
.content-list:global(.sortable-drag-over) {
  background-color: #e8f5e8 !important;
  border: 2px solid #4caf50 !important;
}

.content-list.empty.sortable-drag-over::before,
.content-list.empty:global(.sortable-drag-over)::before {
  content: '释放以添加到根目录';
  color: #4caf50;
  font-weight: bold;
}

.chapter-ghost {
  opacity: 0.5;
}

.chapter-chosen {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
</style>
