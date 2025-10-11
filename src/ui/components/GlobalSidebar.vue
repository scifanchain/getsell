<template>
  <aside class="global-sidebar">
    <nav class="nav-icons">
      <router-link 
        v-for="item in navItems" 
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :title="item.title"
        :class="{ 'active': isActive(item.path) }"
      >
        <i class="nav-icon">{{ item.icon }}</i>
      </router-link>
      
      <!-- 分隔线 -->
      <div class="nav-divider"></div>
      
      <!-- 底部功能 -->
      <div class="nav-item" title="设置" @click="goToSettings">
        <i class="nav-icon">⚙️</i>
      </div>
      
      <div class="nav-item" title="关于" @click="goToAbout">
        <i class="nav-icon">ℹ️</i>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

// 导航项配置
const navItems = [
  { path: '/', icon: '🏠', title: '首页' },
  { path: '/works', icon: '📚', title: '作品管理' },
  { path: '/characters', icon: '👥', title: '人物设定' },
  { path: '/timeline', icon: '⏳', title: '纪元历史' },
  { path: '/locations', icon: '🗺️', title: '地点设定' },
]

// 判断是否激活
const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

// 导航方法
const goToSettings = () => {
  router.push('/settings')
}

const goToAbout = () => {
  router.push('/about')
}
</script>

<style scoped>
.global-sidebar {
  width: 60px;
  background: #2d3748;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  flex-shrink: 0;
}

.nav-icons {
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  height: 100%;
}

.nav-item {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.05);
  text-decoration: none;
  position: relative;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(2px);
}

.nav-item.active {
  background: rgba(102, 126, 234, 0.3);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.5);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 0 2px 2px 0;
}

.nav-icon {
  font-size: 20px;
  font-style: normal;
  filter: grayscale(0.3);
  transition: filter 0.3s ease;
}

.nav-item:hover .nav-icon,
.nav-item.active .nav-icon {
  filter: grayscale(0);
}

.nav-divider {
  width: 30px;
  height: 1px;
  background: rgba(255, 255, 255, 0.15);
  margin: 12px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .global-sidebar {
    width: 50px;
  }
  
  .nav-item {
    width: 35px;
    height: 35px;
  }
  
  .nav-icon {
    font-size: 16px;
  }
}
</style>
