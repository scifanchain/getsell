<template>
  <header class="titlebar">
    <div class="titlebar-content">
      <!-- Logo区域 -->
      <div class="app-logo">
        <span class="logo-icon">🌌</span>
        <span class="app-name">Gestell</span>
      </div>
      
      <!-- 菜单区域 (暂时占位) -->
      <div class="menu-area">
        <!-- 这里后续会放置菜单 -->
      </div>
      
      <!-- 窗口控制按钮 -->
      <div class="window-controls">
        <button class="control-btn" @click="minimizeWindow" title="最小化">
          <span>−</span>
        </button>
        <button class="control-btn" @click="toggleMaximize" title="最大化/还原">
          <span>□</span>
        </button>
        <button class="control-btn close-btn" @click="closeWindow" title="关闭">
          <span>×</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const minimizeWindow = async () => {
  await window.gestell.window.minimize()
}

const toggleMaximize = async () => {
  await window.gestell.window.toggleMaximize()
}

const closeWindow = async () => {
  await window.gestell.window.close()
}
</script>

<style scoped>
.titlebar {
  height: 40px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-bottom: 1px solid rgba(100, 181, 246, 0.2);
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.titlebar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 16px;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 18px;
}

.app-name {
  font-size: 15px;
  font-weight: 600;
  color: #64b5f6;
}

.menu-area {
  flex: 1;
}

.window-controls {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.control-btn {
  width: 32px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  outline: none;
  border-radius: 2px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.close-btn:hover {
  background: #e74c3c;
}
</style>