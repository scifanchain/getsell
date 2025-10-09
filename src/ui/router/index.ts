/**
 * Vue Router 路由配置
 */

import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 导入视图组件
import HomeView from '../views/HomeView.vue'
import EditorView from '../views/EditorView.vue'
import EditorTestView from '../views/EditorTestView.vue'
import SettingsView from '../views/SettingsView.vue'

// 路由定义
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      title: '首页',
      icon: 'home'
    }
  },
  {
    path: '/work/:id',
    name: 'work',
    component: () => import('../views/WorkView.vue'),
    meta: {
      title: '作品',
      icon: 'folder'
    }
  },
  {
    path: '/editor/:workId/:chapterId?',
    name: 'editor',
    component: EditorView,
    meta: {
      title: '编辑器',
      icon: 'edit'
    }
  },
  {
    path: '/editor-test',
    name: 'editor-test',
    component: EditorTestView,
    meta: {
      title: '编辑器测试',
      icon: 'test'
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: {
      title: '设置',
      icon: 'settings'
    }
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: {
      title: '登录',
      icon: 'user'
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: {
      title: '关于',
      icon: 'info'
    }
  }
]

// 创建路由器实例
const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 更新页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - Gestell`
  }
  
  next()
})

export default router

// 导出路由配置供其他地方使用
export { routes }