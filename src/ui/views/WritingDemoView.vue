<template>
  <div class="writing-demo">
    <!-- 左侧边栏 -->
    <div class="sidebar">
      <!-- 作品信息 -->
      <div class="work-info">
        <h2 class="work-title">我的科幻小说</h2>
        <div class="work-stats">
          <div class="stat-item">
            <span class="label">总字数:</span>
            <span class="value">15,420</span>
          </div>
          <div class="stat-item">
            <span class="label">章节数:</span>
            <span class="value">5</span>
          </div>
          <div class="stat-item">
            <span class="label">进度:</span>
            <span class="value">23%</span>
          </div>
        </div>
      </div>

      <!-- 章节树 -->
      <div class="chapter-section">
        <div class="tree-header">
          <h3>章节目录</h3>
          <button class="add-chapter-btn" @click="showNotification('功能演示中', 'info')">
            +
          </button>
        </div>
        
        <div class="tree-content">
          <div class="chapter-node" 
               v-for="chapter in demoChapters" 
               :key="chapter.id"
               :class="{ 'selected': selectedChapterId === chapter.id }"
               @click="selectChapter(chapter.id)">
            <div class="node-content">
              <div class="node-info">
                <div class="node-title">{{ chapter.title }}</div>
                <div class="node-stats">
                  <span class="word-count">{{ chapter.wordCount }}字</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主编辑区域 -->
    <div class="main-editor-area">
      <div v-if="selectedChapterId" class="editor-wrapper">
        <div class="editor-header">
          <div class="title-section">
            <input 
              v-model="currentTitle"
              placeholder="章节标题"
              class="title-input"
            />
          </div>
          
          <div class="status-section">
            <div class="word-stats">
              <span class="word-count">{{ stats.wordCount }}字</span>
              <span class="char-count">{{ stats.characterCount }}字符</span>
            </div>
            
            <div class="save-status">
              {{ saveStatus }}
            </div>
          </div>
        </div>
        
        <div class="editor-container">
          <textarea 
            v-model="editorContent"
            class="demo-editor"
            placeholder="开始写作..."
            @input="handleContentChange"
          ></textarea>
        </div>
        
        <div class="editor-footer">
          <button class="save-btn" @click="saveContent">
            立即保存
          </button>
        </div>
      </div>
      
      <div v-else class="welcome-screen">
        <div class="welcome-content">
          <h2>欢迎使用 Gestell 写作台</h2>
          <p>这是新的三栏布局写作界面演示</p>
          <p>选择左侧的章节开始写作，或者创建新的章节。</p>
          <div class="quick-actions">
            <button class="action-btn primary" @click="showNotification('创建章节功能演示中', 'info')">
              创建新章节
            </button>
            <button class="action-btn" @click="showNotification('创建作品功能演示中', 'info')">
              创建新作品
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧边栏 -->
    <div class="right-sidebar">
      <!-- 章节信息 -->
      <div v-if="selectedChapter" class="chapter-info">
        <h3>章节信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">标题:</span>
            <span class="value">{{ selectedChapter.title }}</span>
          </div>
          <div class="info-item">
            <span class="label">字数:</span>
            <span class="value">{{ selectedChapter.wordCount }}</span>
          </div>
          <div class="info-item">
            <span class="label">类型:</span>
            <span class="value">章节</span>
          </div>
          <div class="info-item">
            <span class="label">创建:</span>
            <span class="value">{{ new Date().toLocaleDateString() }}</span>
          </div>
        </div>
      </div>

      <!-- 大纲/结构 -->
      <div class="outline-section">
        <h3>文档大纲</h3>
        <div class="outline-content">
          <ul class="outline-list">
            <li>第一节 引言</li>
            <li>第二节 背景设定</li>
            <li>第三节 人物介绍</li>
            <li>第四节 情节发展</li>
          </ul>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <h3>写作统计</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ todayStats.wordsWritten }}</div>
            <div class="stat-label">今日字数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ todayStats.timeSpent }}</div>
            <div class="stat-label">今日时长</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 通知 -->
    <div v-if="notifications.length > 0" class="notifications">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="notification"
        :class="notification.type"
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// 演示数据
const demoChapters = ref([
  { id: '1', title: '第一章 序幕', wordCount: 2340 },
  { id: '2', title: '第二章 觉醒', wordCount: 3120 },
  { id: '3', title: '第三章 冒险开始', wordCount: 2890 },
  { id: '4', title: '第四章 遭遇', wordCount: 4210 },
  { id: '5', title: '第五章 转机', wordCount: 2860 }
])

const selectedChapterId = ref('')
const currentTitle = ref('')
const editorContent = ref('')
const saveStatus = ref('就绪')
const notifications = ref<Array<{id: number, message: string, type: string}>>([])

const stats = ref({ wordCount: 0, characterCount: 0 })
const todayStats = ref({
  wordsWritten: 1240,
  timeSpent: '2小时15分钟'
})

// 计算属性
const selectedChapter = computed(() => {
  return demoChapters.value.find(ch => ch.id === selectedChapterId.value)
})

// 方法
const selectChapter = (chapterId: string) => {
  selectedChapterId.value = chapterId
  const chapter = demoChapters.value.find(ch => ch.id === chapterId)
  if (chapter) {
    currentTitle.value = chapter.title
    editorContent.value = `这是${chapter.title}的内容...

请开始您的写作。这个演示界面展示了三栏布局的写作环境：
- 左侧：章节树和作品信息
- 中间：编辑器主区域  
- 右侧：章节信息和统计数据

您可以在这里进行写作，系统会自动保存您的内容。`
  }
}

const handleContentChange = () => {
  // 计算统计信息
  const content = editorContent.value
  const characterCount = content.length
  
  // 简单的字数计算
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = (content.match(/[a-zA-Z]+/g) || []).length
  const wordCount = chineseChars + englishWords

  stats.value = { wordCount, characterCount }
  saveStatus.value = '未保存'
}

const saveContent = () => {
  saveStatus.value = '保存中...'
  setTimeout(() => {
    saveStatus.value = '已保存'
    showNotification('内容已保存', 'success')
  }, 1000)
}

const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  const notification = {
    id: Date.now(),
    message,
    type
  }
  
  notifications.value.push(notification)
  
  setTimeout(() => {
    const index = notifications.value.findIndex(n => n.id === notification.id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }, 3000)
}

// 监听内容变化
watch(editorContent, () => {
  handleContentChange()
})
</script>

<style scoped>
.writing-demo {
  height: 100vh;
  display: grid;
  grid-template-columns: 300px 1fr 250px;
  grid-template-rows: 1fr;
  gap: 1px;
  background: #e1e5e9;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 左侧边栏 */
.sidebar {
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.work-info {
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
}

.work-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.work-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.stat-item .label {
  color: #666;
}

.stat-item .value {
  font-weight: 500;
  color: #333;
}

.chapter-section {
  flex: 1;
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
  background: #fafafa;
}

.chapter-node {
  margin-bottom: 2px;
  cursor: pointer;
}

.node-content {
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  margin: 0 8px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.node-content:hover {
  background: #f8f9fa;
  border-color: #e9ecef;
}

.chapter-node.selected .node-content {
  background: #e3f2fd;
  border-color: #2196f3;
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.1);
}

.node-title {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  margin-bottom: 2px;
}

.node-stats {
  font-size: 12px;
  color: #666;
}

/* 主编辑区域 */
.main-editor-area {
  background: white;
  overflow: hidden;
}

.editor-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #fafafa;
}

.title-section {
  flex: 1;
  max-width: 400px;
}

.title-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  background: white;
  transition: border-color 0.2s;
}

.title-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.status-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.word-stats {
  display: flex;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.word-count,
.char-count {
  padding: 2px 6px;
  background: #e9ecef;
  border-radius: 3px;
}

.save-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: #d4edda;
  color: #155724;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  padding: 20px;
}

.demo-editor {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  font-size: 16px;
  line-height: 1.6;
  font-family: 'Georgia', serif;
  resize: none;
  padding: 0;
}

.editor-footer {
  padding: 12px 20px;
  border-top: 1px solid #e1e5e9;
  background: #fafafa;
  display: flex;
  justify-content: flex-end;
}

.save-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.save-btn:hover {
  background: #0056b3;
}

.welcome-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-content {
  text-align: center;
  max-width: 400px;
}

.welcome-content h2 {
  margin: 0 0 12px 0;
  color: #333;
}

.welcome-content p {
  margin: 0 0 24px 0;
  color: #666;
  line-height: 1.5;
}

.quick-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-btn {
  padding: 12px 24px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.action-btn.primary {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 右侧边栏 */
.right-sidebar {
  background: white;
  padding: 20px;
  overflow-y: auto;
}

.chapter-info h3,
.outline-section h3,
.stats-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-item .value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.outline-content {
  margin-bottom: 32px;
}

.outline-list {
  margin: 0;
  padding-left: 20px;
  list-style: decimal;
}

.outline-list li {
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #007bff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

/* 通知 */
.notifications {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.notification {
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 4px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.notification.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.notification.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

/* 滚动条样式 */
.tree-content::-webkit-scrollbar,
.right-sidebar::-webkit-scrollbar {
  width: 6px;
}

.tree-content::-webkit-scrollbar-track,
.right-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.tree-content::-webkit-scrollbar-thumb,
.right-sidebar::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.tree-content::-webkit-scrollbar-thumb:hover,
.right-sidebar::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>