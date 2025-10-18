<!--
  登录视图
-->
<template>
  <div class="login-view">
    <div class="login-container">
      <div class="login-header">
        <h1>欢迎使用 Gestell</h1>
        <p>优雅的写作工具，让创作更简单</p>
      </div>
      
      <div class="login-form">
        <div class="form-tabs">
          <button 
            @click="mode = 'login'" 
            :class="{ active: mode === 'login' }"
            class="tab-btn"
          >
            登录
          </button>
          <button 
            @click="mode = 'register'" 
            :class="{ active: mode === 'register' }"
            class="tab-btn"
          >
            注册
          </button>
        </div>
        
        <!-- 登录表单 -->
        <form v-if="mode === 'login'" @submit.prevent="handleLogin" class="form">
          <div class="form-group">
            <label>用户名</label>
            <input 
              v-model="loginForm.username"
              type="text" 
              required
              placeholder="输入用户名"
              autocomplete="username"
              :disabled="loading"
            >
          </div>
          
          <div class="form-group">
            <label>密码</label>
            <input 
              v-model="loginForm.password"
              type="password"
              placeholder="输入密码（可选）"
              autocomplete="current-password"
              :disabled="loading"
            >
            <small class="form-hint">如果您的账号未设置密码，可留空</small>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input 
                v-model="loginForm.rememberMe"
                type="checkbox"
                :disabled="loading"
              >
              <span>记住登录状态</span>
            </label>
          </div>
          
          <button type="submit" :disabled="loading" class="btn btn-primary btn-full">
            <span v-if="loading" class="loading-spinner"></span>
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
        
        <!-- 注册表单 -->
        <form v-if="mode === 'register'" @submit.prevent="handleRegister" class="form">
          <div class="form-group">
            <label>用户名</label>
            <input 
              v-model="registerForm.username"
              type="text" 
              required
              minlength="3"
              maxlength="20"
              placeholder="3-20个字符"
              autocomplete="username"
              :disabled="loading"
            >
            <small class="form-hint">用户名将用于登录，不可修改</small>
          </div>
          
          <div class="form-group">
            <label>密码</label>
            <input 
              v-model="registerForm.password"
              type="password"
              minlength="6"
              placeholder="输入密码（可选，至少6位）"
              autocomplete="new-password"
              :disabled="loading"
            >
            <small class="form-hint">设置密码可以保护您的账号安全</small>
          </div>
          
          <div class="form-group">
            <label>显示名称</label>
            <input 
              v-model="registerForm.displayName"
              type="text"
              maxlength="50"
              placeholder="输入显示名称（可选）"
              autocomplete="name"
              :disabled="loading"
            >
            <small class="form-hint">显示名称可以在个人资料中修改</small>
          </div>
          
          <div class="form-group">
            <label>邮箱地址</label>
            <input 
              v-model="registerForm.email"
              type="email" 
              required
              placeholder="输入邮箱地址"
              autocomplete="email"
              :disabled="loading"
            >
            <small class="form-hint">邮箱用于找回账号</small>
          </div>
          
          <button type="submit" :disabled="loading" class="btn btn-primary btn-full">
            <span v-if="loading" class="loading-spinner"></span>
            {{ loading ? '注册中...' : '创建账号' }}
          </button>
        </form>
        
        <!-- 错误信息 -->
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
      
      <div class="login-footer">
        <p>Gestell - 让写作成为享受</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthorStore } from '../stores/author'

const router = useRouter()
const route = useRoute()
const authorStore = useAuthorStore()

// 响应式数据
const mode = ref<'login' | 'register'>('login')
const loginForm = ref({
  username: '',
  password: '',
  rememberMe: true
})
const registerForm = ref({
  username: '',
  password: '',
  displayName: '',
  email: ''
})

// 计算属性
const loading = computed(() => authorStore.loading)
const error = computed(() => authorStore.error)

// 方法
async function handleLogin() {
  if (!loginForm.value.username.trim()) {
    authorStore.error = '请输入用户名'
    return
  }
  
  // 清除之前的错误
  authorStore.clearError()
  
  try {
    const result = await authorStore.loginAuthor(
      loginForm.value.username,
      loginForm.value.password || undefined,
      loginForm.value.rememberMe
    )
    
    if (result) {
      // 登录成功，跳转到原始目标页面或首页
      const redirect = route.query.redirect as string || '/'
      await router.push(redirect)
    }
  } catch (error) {
    console.error('登录失败:', error)
  }
}

async function handleRegister() {
  const { username, password, displayName, email } = registerForm.value
  
  // 验证表单
  if (!username.trim()) {
    authorStore.error = '请输入用户名'
    return
  }
  
  if (username.length < 3 || username.length > 20) {
    authorStore.error = '用户名长度应为3-20个字符'
    return
  }
  
  // 验证密码（如果填写了）
  if (password && password.length < 6) {
    authorStore.error = '密码长度至少6位'
    return
  }
  
  if (!email.trim()) {
    authorStore.error = '请输入邮箱地址'
    return
  }
  
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    authorStore.error = '请输入有效的邮箱地址'
    return
  }
  
  // 清除之前的错误
  authorStore.clearError()
  
  try {
    const user = await authorStore.registerAuthor({
      username: username.trim(),
      password: password.trim() || undefined,
      displayName: displayName.trim() || username.trim(),
      email: email.trim()
    })
    
    if (user) {
      // 注册成功后自动跳转到原始目标页面或首页
      const redirect = route.query.redirect as string || '/'
      await router.push(redirect)
    }
  } catch (error) {
    console.error('注册失败:', error)
  }
}
</script>

<style scoped>
.login-view {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h1 {
  margin: 0 0 0.5rem 0;
  color: #1f2937;
  font-size: 1.875rem;
  font-weight: 700;
}

.login-header p {
  margin: 0;
  color: #6b7280;
}

.form-tabs {
  display: flex;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.form {
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.checkbox-label span {
  color: #374151;
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  font-size: 1rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-full {
  width: 100%;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #fecaca;
  margin-top: 1rem;
  text-align: center;
}

.login-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.login-footer p {
  margin: 0;
  color: #9ca3af;
  font-size: 0.875rem;
}
</style>