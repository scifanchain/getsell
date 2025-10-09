<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>创建新作品</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="title">作品标题</label>
            <input
              id="title"
              v-model="formData.title"
              type="text"
              placeholder="请输入作品标题"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="description">作品简介</label>
            <textarea
              id="description"
              v-model="formData.description"
              placeholder="简要描述您的作品内容"
              rows="4"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="genre">类型</label>
            <select id="genre" v-model="formData.genre">
              <option value="science_fiction">科幻</option>
              <option value="fantasy">奇幻</option>
              <option value="romance">言情</option>
              <option value="mystery">悬疑</option>
              <option value="thriller">惊悚</option>
              <option value="historical">历史</option>
              <option value="literary">文学</option>
              <option value="other">其他</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="targetWords">目标字数</label>
            <input
              id="targetWords"
              v-model.number="formData.targetWords"
              type="number"
              placeholder="例如：100000"
              min="1000"
              step="1000"
            />
          </div>
          
          <div class="form-group">
            <label for="tags">标签</label>
            <input
              id="tags"
              v-model="formData.tagsInput"
              type="text"
              placeholder="用逗号分隔，例如：都市,重生,系统"
            />
            <div class="help-text">用逗号分隔多个标签</div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn secondary" @click="$emit('close')">
              取消
            </button>
            <button type="submit" class="btn primary">
              创建作品
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'save': [workData: any]
  'close': []
}>()

const formData = ref({
  title: '',
  description: '',
  genre: 'science_fiction',
  targetWords: 50000,
  tagsInput: ''
})

const handleSubmit = () => {
  const tags = formData.value.tagsInput
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)

  const workData = {
    title: formData.value.title,
    description: formData.value.description,
    genre: formData.value.genre,
    targetWords: formData.value.targetWords,
    tags,
    collaborationMode: 'solo'
  }

  emit('save', workData)
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
  background: #f8f9fa;
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
  background: #e9ecef;
  color: #333;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-of-type {
  margin-bottom: 0;
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
  box-sizing: border-box;
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
  min-height: 100px;
}

.help-text {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
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