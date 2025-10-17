<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ isNew ? '创建章节' : '编辑章节' }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="title">章节标题</label>
            <input
              id="title"
              ref="titleInput"
              v-model="formData.title"
              type="text"
              placeholder="请输入章节标题"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="type">章节类型</label>
            <select id="type" v-model="formData.type">
              <option value="volume">卷</option>
              <option value="chapter">章节</option>
              <option value="section">小节</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="subtitle">副标题</label>
            <input
              id="subtitle"
              v-model="formData.subtitle"
              type="text"
              placeholder="可选的副标题"
            />
          </div>
          
          <div class="form-group">
            <label for="description">描述</label>
            <textarea
              id="description"
              v-model="formData.description"
              placeholder="章节描述或简介"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn secondary" @click="$emit('close')">
              取消
            </button>
            <button type="submit" class="btn primary">
              {{ isNew ? '创建' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface Chapter {
  id?: string
  title: string
  subtitle?: string
  description?: string
  type: 'volume' | 'chapter' | 'section'
  workId?: string
  parentId?: string
}

interface Props {
  chapter?: Chapter | null
  isNew: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'save': [chapterData: any]
  'close': []
}>()

const titleInput = ref<HTMLInputElement | null>(null)

const formData = ref({
  title: '',
  subtitle: '',
  description: '',
  type: 'chapter' as 'volume' | 'chapter' | 'section',
  workId: undefined as string | undefined,
  parentId: undefined as string | undefined
})

onMounted(() => {
  console.log('📝 ChapterEditModal onMounted:', {
    hasChapter: !!props.chapter,
    chapter: props.chapter,
    isNew: props.isNew
  })
  
  if (props.chapter) {
    formData.value = {
      title: props.chapter.title || '',
      subtitle: props.chapter.subtitle || '',
      description: props.chapter.description || '',
      type: props.chapter.type || 'chapter',
      workId: props.chapter.workId,
      parentId: props.chapter.parentId
    }
    console.log('📝 ChapterEditModal formData 初始化:', formData.value)
  }
  
  // 自动聚焦到标题输入框
  nextTick(() => {
    titleInput.value?.focus()
  })
})

const handleSubmit = () => {
  if (props.isNew) {
    // 创建模式：传递所有字段，但过滤掉 undefined 的值
    const data: any = {
      title: formData.value.title,
      subtitle: formData.value.subtitle,
      description: formData.value.description,
      type: formData.value.type
    }
    if (formData.value.workId) {
      data.workId = formData.value.workId
    }
    if (formData.value.parentId) {
      data.parentId = formData.value.parentId
    }
    console.log('📝 ChapterEditModal 提交数据:', data)
    emit('save', data)
  } else {
    // 编辑模式：只传递可以更新的字段，不包括 workId 和 parentId
    emit('save', {
      title: formData.value.title,
      subtitle: formData.value.subtitle,
      description: formData.value.description,
      type: formData.value.type
    })
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e1e5e9;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e1e5e9;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn.secondary {
  background: #f8f9fa;
  color: #333;
  border: 1px solid #ddd;
}

.btn.secondary:hover {
  background: #e9ecef;
}

.btn.primary {
  background: #007bff;
  color: white;
}

.btn.primary:hover {
  background: #0056b3;
}
</style>