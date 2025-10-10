<template>
  <div class="welcome-panel">
    <div class="welcome-content">
      <div class="welcome-icon">✨</div>
      <h2>欢迎使用 Gestell</h2>
      <p class="welcome-message">选择一个章节开始创作，或在左侧章节树中添加新内容</p>
      
      <div class="quick-actions">
        <div class="action-card">
          <div class="action-icon">📝</div>
          <h3>开始写作</h3>
          <p>在左侧章节树中点击"📄"按钮添加内容</p>
        </div>
        
        <div class="action-card">
          <div class="action-icon">📁</div>
          <h3>组织章节</h3>
          <p>使用拖拽功能重新排列章节结构</p>
        </div>
        
        <div class="action-card">
          <div class="action-icon">💡</div>
          <h3>快捷键</h3>
          <p>Ctrl+S 保存，Ctrl+B 加粗，Ctrl+I 斜体</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.welcome-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px;
}

.welcome-content {
  text-align: center;
  max-width: 800px;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

h2 {
  font-size: 32px;
  color: #2c3e50;
  margin-bottom: 12px;
  font-weight: 600;
}

.welcome-message {
  font-size: 16px;
  color: #606c76;
  margin-bottom: 40px;
  line-height: 1.6;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  margin-top: 40px;
}

.action-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.action-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.action-card h3 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 8px;
  font-weight: 600;
}

.action-card p {
  font-size: 14px;
  color: #606c76;
  line-height: 1.5;
  margin: 0;
}
</style>
