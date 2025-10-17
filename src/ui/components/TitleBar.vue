<template>
  <header class="titlebar">
    <div class="titlebar-content">
      <!-- 左侧：Logo和菜单 -->
      <div class="titlebar-left">
        <div class="app-logo">
          <span class="logo-icon">📚</span>
          <span class="app-name">Gestell</span>
        </div>
        <nav class="main-menu">
          <a href="#" @click="goToWorks" class="menu-item">作品</a>
          <a href="#" @click="goToCharacters" class="menu-item">人物</a>
          <a href="#" @click="goToTimeline" class="menu-item">纪元</a>
          <a href="#" @click="goToLocations" class="menu-item">地点</a>
          <a href="#" @click="goToTools" class="menu-item">工具</a>
        </nav>
      </div>
      
      <!-- 中间：可拖拽区域 -->
      <div class="titlebar-drag-region"></div>
      
      <!-- 右侧：用户菜单和窗口控制 -->
      <div class="titlebar-right">
        <!-- 用户菜单 -->
        <div class="user-menu" @click="toggleUserDropdown">
          <div class="user-avatar">
            <img v-if="authorAvatar" :src="authorAvatar" alt="用户头像" class="avatar-image">
            <span v-else class="avatar-placeholder">👤</span>
          </div>
          <span class="user-name">{{ authorName || '未登录' }}</span>
          <span class="dropdown-arrow" :class="{ 'dropdown-open': showUserDropdown }">▼</span>
          
          <!-- 用户下拉菜单 -->
          <div v-if="showUserDropdown" class="user-dropdown" @click.stop>
            <div class="dropdown-header">
              <div class="user-info">
                <div class="user-avatar-large">
                  <img v-if="authorAvatar" :src="authorAvatar" alt="用户头像" class="avatar-image">
                  <span v-else class="avatar-placeholder">👤</span>
                </div>
                <div class="user-details">
                  <div class="user-name-large">{{ authorName || '未登录作者' }}</div>
                  <div class="user-email">{{ authorEmail || 'guest@gestell.com' }}</div>
                </div>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-menu">
              <a href="#" @click="goToMyWorks" class="dropdown-item">
                <span class="item-icon">📚</span>
                我的作品
              </a>
              <a href="#" @click="goToProfile" class="dropdown-item">
                <span class="item-icon">👤</span>
                个人资料
              </a>
              <a href="#" @click="goToSettings" class="dropdown-item">
                <span class="item-icon">⚙️</span>
                设置
              </a>
              <div class="dropdown-divider"></div>
              <a href="#" @click="goToHelp" class="dropdown-item">
                <span class="item-icon">❓</span>
                帮助
              </a>
              <a href="#" @click="handleLogin" class="dropdown-item">
                <span class="item-icon">🔐</span>
                {{ authorName ? '登出' : '登录' }}
              </a>
            </div>
          </div>
        </div>
        
        <!-- 窗口控制按钮 -->
        <div class="window-controls">
          <button class="control-btn" @click="minimizeWindow" title="最小化">
            <span class="control-icon">🗕</span>
          </button>
          <button class="control-btn" @click="toggleMaximize" title="最大化/还原">
            <span class="control-icon">{{ isMaximized ? '🗗' : '🗖' }}</span>
          </button>
          <button class="control-btn close-btn" @click="closeWindow" title="关闭">
            <span class="control-icon">✕</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthorStore } from '../stores/author'

const router = useRouter()
const authorStore = useAuthorStore()

// 作者状态
const authorName = computed(() => {
  if (!authorStore.currentAuthor) return ''
  return authorStore.currentAuthor.displayName || authorStore.currentAuthor.username || '未命名作者'
})
const authorEmail = computed(() => authorStore.currentAuthor?.email || '')
const authorAvatar = computed(() => authorStore.currentAuthor?.avatarUrl || '')
const showUserDropdown = ref(false)
const isMaximized = ref(false)

// 窗口控制方法
const minimizeWindow = async () => {
  console.log('🔄 TitleBar: 最小化窗口')
  try {
    await window.electronAPI.window.minimize()
    console.log('✅ TitleBar: 最小化成功')
  } catch (error) {
    console.error('❌ TitleBar: 最小化失败', error)
  }
}

const toggleMaximize = async () => {
  console.log('🔄 TitleBar: 切换最大化')
  try {
    await window.electronAPI.window.toggleMaximize()
    isMaximized.value = !isMaximized.value
    console.log('✅ TitleBar: 切换最大化成功')
  } catch (error) {
    console.error('❌ TitleBar: 切换最大化失败', error)
  }
}

// 🔧 修复：防止重复关闭窗口
let isClosingWindow = false;
const closeWindow = async () => {
  if (isClosingWindow) {
    console.log('⚠️ 窗口正在关闭中，忽略重复点击')
    return;
  }
  
  try {
    isClosingWindow = true;
    console.log('🔄 TitleBar: 开始关闭窗口')
    await window.electronAPI.window.close()
  } catch (error) {
    console.error('关闭窗口失败:', error)
    isClosingWindow = false; // 失败时重置状态
  }
}

// 导航方法
function goToWorks() {
  router.push('/works')
}

function goToCharacters() {
  // TODO: 实现人物管理页面
  console.log('跳转到人物管理')
}

function goToTimeline() {
  // TODO: 实现纪元历史页面
  console.log('跳转到纪元历史')
}

function goToLocations() {
  // TODO: 实现地点设定页面
  console.log('跳转到地点设定')
}

function goToTools() {
  // TODO: 实现工具页面
  console.log('跳转到工具')
}

// 用户下拉菜单方法
function toggleUserDropdown() {
  showUserDropdown.value = !showUserDropdown.value
}

function goToMyWorks() {
  router.push('/works')
  showUserDropdown.value = false
}

function goToProfile() {
  // TODO: 实现个人资料页面
  console.log('跳转到个人资料')
  showUserDropdown.value = false
}

function goToSettings() {
  router.push('/settings')
  showUserDropdown.value = false
}

function goToHelp() {
  // TODO: 实现帮助页面
  console.log('跳转到帮助')
  showUserDropdown.value = false
}

function handleLogin() {
  if (authorName.value) {
    // 登出
    authorStore.logoutAuthor()
    router.push('/login')
    console.log('用户已登出')
  } else {
    // 登录
    router.push('/login')
  }
  showUserDropdown.value = false
}

// 点击外部关闭下拉菜单
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  const userMenu = document.querySelector('.user-menu')
  if (userMenu && !userMenu.contains(target)) {
    showUserDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.titlebar {
  height: 32px;
  background: #2d3748;
  border-bottom: 1px solid #4a5568;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  user-select: none;
}

.titlebar-content {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 12px;
  -webkit-app-region: no-drag;
}

.titlebar-drag-region {
  flex: 1;
  height: 100%;
  -webkit-app-region: drag;
}

.titlebar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 0;
  -webkit-app-region: no-drag;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 16px;
}

.app-name {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.main-menu {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-item {
  color: #e2e8f0;
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.menu-item:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.1);
  margin-right: 8px;
}

.user-menu:hover {
  background: rgba(255, 255, 255, 0.2);
}

.user-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  color: white;
  font-size: 12px;
}

.user-name {
  font-size: 12px;
  color: #e2e8f0;
  font-weight: 500;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  font-size: 10px;
  color: #cbd5e0;
  transition: transform 0.2s ease;
}

.dropdown-open {
  transform: rotate(180deg);
}

/* 用户下拉菜单 */
.user-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  z-index: 2000;
  overflow: hidden;
}

.dropdown-header {
  padding: 12px;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  border-bottom: 1px solid #e2e8f0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar-large {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name-large {
  font-size: 14px;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 2px;
}

.user-email {
  font-size: 12px;
  color: #718096;
}

.dropdown-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 6px 0;
}

.dropdown-menu {
  padding: 6px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  color: #4a5568;
  text-decoration: none;
  font-size: 13px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.dropdown-item:hover {
  background: #f7fafc;
  color: #2d3748;
}

.item-icon {
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.window-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.control-btn {
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  font-size: 12px;
  outline: none;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.control-btn:first-child:hover {
  background: #4a5568;
}

.control-btn:nth-child(2):hover {
  background: #4a5568;
}

.close-btn:hover {
  background: #e53e3e !important;
  color: white;
}

.control-icon {
  font-family: 'Segoe UI', sans-serif;
  font-weight: normal;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-menu {
    display: none;
  }
  
  .user-name {
    display: none;
  }
  
  .titlebar-left {
    gap: 8px;
  }
  
  .app-name {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .titlebar {
    height: 28px;
  }
  
  .titlebar-left {
    padding-left: 8px;
  }
  
  .app-name {
    font-size: 11px;
  }
  
  .logo-icon {
    font-size: 14px;
  }
  
  .user-avatar {
    width: 18px;
    height: 18px;
  }
  
  .control-btn {
    width: 40px;
  }
  
  .user-dropdown {
    min-width: 180px;
    right: -8px;
  }
}
</style>