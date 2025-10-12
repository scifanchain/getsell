/**
 * Vue Router 路由配置
 */

import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '../stores/user'

// 导入视图组件
import HomeView from '../views/HomeView.vue'
import EditorView from '../views/EditorView.vue'
import SettingsView from '../views/SettingsView.vue'
import CharactersView from '../views/CharactersView.vue'
import TimelineView from '../views/TimelineView.vue'
import LocationsView from '../views/LocationsView.vue'

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
    path: '/works',
    name: 'works',
    component: () => import('../views/WorkListView.vue'),
    meta: {
      title: '作品列表',
      icon: 'folder'
    }
  },
  {
    path: '/characters',
    name: 'characters',
    component: CharactersView,
    meta: {
      title: '人物设定',
      icon: 'users'
    }
  },
  {
    path: '/timeline',
    name: 'timeline',
    component: TimelineView,
    meta: {
      title: '纪元历史',
      icon: 'timeline'
    }
  },
  {
    path: '/locations',
    name: 'locations',
    component: LocationsView,
    meta: {
      title: '地点设定',
      icon: 'map'
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
    path: '/writing/:workId?',
    name: 'writing',
    component: () => import('../views/WritingView.vue'),
    meta: {
      title: '写作台',
      icon: 'write'
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
      icon: 'user',
      requiresAuth: false,  // 不需要登录
      isPublic: true        // 公开页面
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
  
  // 检查登录状态
  const userStore = useUserStore()
  const isPublicPage = to.meta?.isPublic === true
  
  // 如果是公开页面（如登录页），直接通过
  if (isPublicPage) {
    // 如果已登录且访问登录页，重定向到首页
    if (userStore.isLoggedIn && to.name === 'login') {
      next('/')
      return
    }
    next()
    return
  }
  
  // 如果需要登录但未登录，重定向到登录页
  if (!userStore.isLoggedIn) {
    console.log('🔒 用户未登录，重定向到登录页')
    next({
      name: 'login',
      query: { redirect: to.fullPath }  // 保存原始目标路径
    })
    return
  }
  
  next()
})

export default router

// 导出路由配置供其他地方使用
export { routes }