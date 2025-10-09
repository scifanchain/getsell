<template>
  <div class="home-view">
    <div class="welcome-section">
      <h1>✍️ 欢迎使用 Gestell</h1>
      <p>Vue 3 + TypeScript 架构完成</p>
    </div>
    <div class="actions">
      <button @click="goToWritingDemo" class="btn btn-primary">体验写作台 (演示)</button>
      <button @click="goToWriting" class="btn">进入写作台</button>
      <button @click="goToLogin" class="btn">开始使用</button>
      <button @click="goToAbout" class="btn">关于</button>
      <button @click="goToEditorTest" class="btn btn-secondary">测试 ProseMirror</button>
    </div>
    <div v-if="isDev">
      <ArchitectureTest />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import ArchitectureTest from '../components/ArchitectureTest.vue'

const router = useRouter()
const isDev = import.meta.env.DEV

function goToLogin() {
  router.push('/login')
}

function goToWriting() {
  router.push('/writing')
}

function goToWritingDemo() {
  router.push('/writing-demo')
}

function goToAbout() {
  router.push('/about')
}

function goToEditorTest() {
  router.push('/editor-test')
}
</script>

<style scoped>
.home-view { padding: 2rem; text-align: center; }
.welcome-section { margin-bottom: 2rem; }
.actions { display: flex; gap: 1rem; justify-content: center; margin-bottom: 2rem; }
.btn { padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.25rem; cursor: pointer; }
.btn-primary { background: #10b981; font-weight: 600; }
.btn-secondary { background: #6b7280; }
</style>
