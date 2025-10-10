<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>创建内容</h3>
        <button class="close-btn" @click="closeModal">×</button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="content-title">内容标题</label>
            <input
              id="content-title"
              v-model="contentTitle"
              type="text"
              placeholder="请输入内容标题"
              required
              @keyup.enter="handleSubmit"
            />
          </div>
          
          <div class="form-group">
            <label for="content-type">内容类型</label>
            <select id="content-type" v-model="contentType">
              <option value="text">文本</option>
              <option value="dialogue">对话</option>
              <option value="scene">场景描述</option>
              <option value="note">备注</option>
            </select>
          </div>
        </form>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn btn-cancel" @click="closeModal">
          取消
        </button>
        <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="!contentTitle.trim()">
          创建
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  isVisible: boolean
  workId?: string
  chapterId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'close': []
  'create': [{
    title: string
    type: string
    workId?: string
    chapterId?: string
  }]
}>()

const contentTitle = ref('')
const contentType = ref('text')

// 重置表单
watch(() => props.isVisible, (visible) => {
  if (visible) {
    contentTitle.value = ''
    contentType.value = 'text'
  }
})

const closeModal = () => {
  emit('close')
}

const handleSubmit = () => {
  console.log('ContentCreateModal: handleSubmit 被调用')
  console.log('  contentTitle:', contentTitle.value)
  console.log('  contentType:', contentType.value)
  console.log('  props.workId:', props.workId)
  console.log('  props.chapterId:', props.chapterId)
  
  if (!contentTitle.value.trim()) {
    console.warn('ContentCreateModal: 标题为空，取消提交')
    return
  }
  
  const data = {
    title: contentTitle.value.trim(),
    type: contentType.value,
    workId: props.workId,
    chapterId: props.chapterId
  }
  
  console.log('ContentCreateModal: 准备发送 create 事件', data)
  emit('create', data)
  console.log('ContentCreateModal: 已发送 create 事件')
  
  closeModal()
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
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f8f9fa;
  color: #333;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background: #5a6268;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
</style>
