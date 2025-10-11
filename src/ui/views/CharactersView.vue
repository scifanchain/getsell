<template>
  <div class="characters-view">
    <div class="page-header">
      <h1>👥 人物设定</h1>
      <p class="page-subtitle">管理您作品中的人物角色</p>
    </div>
    
    <div class="coming-soon">
      <div class="icon">🚧</div>
      <h2>功能开发中</h2>
      <p>人物设定功能即将上线，敬请期待！</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 人物设定视图
</script>

<style scoped>
.characters-view {
  height: 100%;
  padding: 40px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow-y: auto;
}

.page-header {
  margin-bottom: 40px;
  text-align: center;
}

.page-header h1 {
  font-size: 2.5rem;
  color: #1a202c;
  margin: 0 0 16px 0;
}

.page-subtitle {
  font-size: 1.1rem;
  color: #4a5568;
  margin: 0;
}

.coming-soon {
  max-width: 600px;
  margin: 100px auto;
  text-align: center;
  background: white;
  padding: 60px;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.coming-soon .icon {
  font-size: 4rem;
  margin-bottom: 24px;
}

.coming-soon h2 {
  font-size: 1.8rem;
  color: #2d3748;
  margin: 0 0 16px 0;
}

.coming-soon p {
  font-size: 1.1rem;
  color: #718096;
  margin: 0;
}
</style>
