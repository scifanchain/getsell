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
            <label>邮箱地址</label>
            <input 
              v-model="loginForm.email"
              type="email" 
              required
              placeholder="输入邮箱地址"
            >
          </div>
          
          <button type="submit" :disabled="loading" class="btn btn-primary btn-full">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
        
        <!-- 注册表单 -->
        <form v-if="mode === 'register'" @submit.prevent="handleRegister" class="form">
          <div class="form-group">
            <label>用户名</label>
            <input 
              v-model="registerForm.name"
              type="text" 
              required
              placeholder="输入用户名"
            >
          </div>
          
          <div class="form-group">
            <label>邮箱地址</label>
            <input 
              v-model="registerForm.email"
              type="email" 
              required
              placeholder="输入邮箱地址"
            >
          </div>
          
          <button type="submit" :disabled="loading" class="btn btn-primary btn-full">
            {{ loading ? '注册中...' : '注册' }}
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
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const mode = ref<'login' | 'register'>('login')
const loginForm = ref({
  email: ''
})
const registerForm = ref({
  name: '',
  email: ''
})

// 计算属性
const loading = computed(() => userStore.loading)
const error = computed(() => userStore.error)

// 方法
async function handleLogin() {
  if (!loginForm.value.email) return
  
  try {
    const user = await userStore.loginUser(loginForm.value.email)
    if (user) {
      router.push('/')
    }
  } catch (error) {
    console.error('登录失败:', error)
  }
}

async function handleRegister() {
  if (!registerForm.value.name || !registerForm.value.email) return
  
  try {
    await userStore.createUser({
      name: registerForm.value.name,
      email: registerForm.value.email
    })
    
    // 注册成功后自动登录
    router.push('/')
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