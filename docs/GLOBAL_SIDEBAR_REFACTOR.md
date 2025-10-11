# 全局导航栏改造说明

> 日期：2025年10月11日  
> 改动：将左侧导航栏从 HomeView 提取为全局组件

---

## 📝 改动概述

将原本位于 `HomeView.vue` 中的左侧导航栏提取为全局组件 `GlobalSidebar.vue`，使其在所有页面中可用，提升应用的一致性和用户体验。

---

## 🎯 改动目标

1. **全局可用** - 左侧导航在所有页面都可见
2. **统一体验** - 用户在任何页面都能快速导航
3. **代码复用** - 避免在每个页面重复导航代码
4. **易于维护** - 导航配置集中管理

---

## 🔧 技术实现

### 1. 创建全局侧边栏组件

**文件**: `src/ui/components/GlobalSidebar.vue`

**功能特性**:
- 使用 Vue Router 的 `router-link` 实现路由跳转
- 自动高亮当前激活的导航项
- 响应式设计，支持移动端
- 优雅的悬停和激活效果

**导航项配置**:
```typescript
const navItems = [
  { path: '/', icon: '🏠', title: '首页' },
  { path: '/works', icon: '📚', title: '作品管理' },
  { path: '/characters', icon: '👥', title: '人物设定' },
  { path: '/timeline', icon: '⏳', title: '纪元历史' },
  { path: '/locations', icon: '🗺️', title: '地点设定' },
]
```

### 2. 修改 App.vue 布局

**改动前**:
```vue
<div class="app-container">
  <TitleBar />
  <main class="main-content">
    <router-view />
  </main>
  <StatusBar />
</div>
```

**改动后**:
```vue
<div class="app-container">
  <TitleBar />
  <div class="app-body">
    <GlobalSidebar />  <!-- 全局左侧导航 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
  <StatusBar />
</div>
```

### 3. 简化 HomeView.vue

**移除内容**:
- 左侧导航栏的 HTML 结构
- 导航栏相关的 CSS 样式
- 调整布局以适应新的全局导航

**保留内容**:
- 欢迎横幅
- 内容板块（热门作品、活跃作者等）
- 右侧统计信息
- 创建作品模态框

### 4. 创建占位符页面

为了让导航功能完整可用，创建了三个占位符页面：

1. **CharactersView.vue** - 人物设定页面
2. **TimelineView.vue** - 纪元历史页面
3. **LocationsView.vue** - 地点设定页面

这些页面目前显示"功能开发中"的提示，为后续开发预留了空间。

### 5. 更新路由配置

在 `src/ui/router/index.ts` 中添加新路由：

```typescript
{
  path: '/characters',
  name: 'characters',
  component: CharactersView,
  meta: { title: '人物设定', icon: 'users' }
},
{
  path: '/timeline',
  name: 'timeline',
  component: TimelineView,
  meta: { title: '纪元历史', icon: 'timeline' }
},
{
  path: '/locations',
  name: 'locations',
  component: LocationsView,
  meta: { title: '地点设定', icon: 'map' }
}
```

---

## 📂 文件变更清单

### 新增文件
- ✅ `src/ui/components/GlobalSidebar.vue` - 全局侧边栏组件
- ✅ `src/ui/views/CharactersView.vue` - 人物设定页面
- ✅ `src/ui/views/TimelineView.vue` - 纪元历史页面
- ✅ `src/ui/views/LocationsView.vue` - 地点设定页面

### 修改文件
- ✏️ `src/ui/App.vue` - 添加全局侧边栏
- ✏️ `src/ui/views/HomeView.vue` - 移除本地导航栏
- ✏️ `src/ui/router/index.ts` - 添加新路由

---

## 🎨 UI/UX 改进

### 导航栏设计特点

1. **激活状态指示**
   - 当前页面的导航项会高亮显示
   - 左侧有紫色指示条
   - 图标去灰度显示

2. **悬停效果**
   - 背景色变亮
   - 轻微向右移动
   - 图标更加鲜艳

3. **响应式设计**
   - 桌面端：60px 宽度
   - 移动端：50px 宽度
   - 图标自适应缩放

### 布局结构

```
┌─────────────────────────────────────┐
│         TitleBar (标题栏)            │
├──────┬──────────────────────────────┤
│      │                              │
│  G   │                              │
│  l   │      Main Content            │
│  o   │      (路由视图)              │
│  b   │                              │
│  a   │                              │
│  l   │                              │
│      │                              │
│  S   │                              │
│  i   │                              │
│  d   │                              │
│  e   │                              │
│  b   │                              │
│  a   │                              │
│  r   │                              │
│      │                              │
├──────┴──────────────────────────────┤
│         StatusBar (状态栏)           │
└─────────────────────────────────────┘
```

---

## 🚀 使用方式

### 1. 添加新的导航项

在 `GlobalSidebar.vue` 中修改 `navItems` 数组：

```typescript
const navItems = [
  // ... 现有项
  { path: '/new-page', icon: '🆕', title: '新页面' },
]
```

### 2. 创建对应的页面组件

```vue
<!-- src/ui/views/NewPageView.vue -->
<template>
  <div class="new-page-view">
    <h1>新页面</h1>
  </div>
</template>
```

### 3. 添加路由配置

在 `router/index.ts` 中添加路由：

```typescript
{
  path: '/new-page',
  name: 'new-page',
  component: NewPageView,
  meta: { title: '新页面' }
}
```

---

## ✅ 测试检查清单

- [x] 所有导航项可以正常跳转
- [x] 当前页面的导航项正确高亮
- [x] 悬停效果正常显示
- [x] 移动端布局正常
- [x] 从任何页面都能看到导航栏
- [x] 页面切换时导航栏保持可见
- [x] 占位符页面正常显示

---

## 🔮 后续优化建议

### 短期优化

1. **添加提示文字**
   - 在导航项上显示更详细的文字说明
   - 使用 Tooltip 组件

2. **导航栏折叠功能**
   - 在小屏幕上可以折叠/展开
   - 节省屏幕空间

3. **快捷键支持**
   - 支持键盘快捷键切换页面
   - 例如：Ctrl+1 到 Ctrl+5

### 长期优化

1. **自定义导航**
   - 允许用户自定义导航项顺序
   - 支持显示/隐藏某些导航项

2. **工作区概念**
   - 不同工作区有不同的导航配置
   - 支持快速切换工作区

3. **最近访问**
   - 在导航栏显示最近访问的页面
   - 快速返回功能

---

## 📊 性能影响

- ✅ **无负面影响** - 组件懒加载，仅在需要时渲染
- ✅ **代码复用** - 减少重复代码，降低打包体积
- ✅ **渲染优化** - 全局组件仅渲染一次，无需每次切换页面重新渲染

---

## 🐛 已知问题

目前无已知问题。

---

## 📝 注意事项

1. **路由模式**
   - 当前使用 Hash 模式（`createWebHashHistory`）
   - URL 中会包含 `#` 符号

2. **导航栏固定**
   - 导航栏始终可见，无法隐藏
   - 如需隐藏功能，可添加配置选项

3. **样式隔离**
   - 使用 `scoped` 样式，不会影响其他组件
   - 全局样式在 `App.vue` 中定义

---

## 🎉 总结

通过将导航栏提取为全局组件，我们实现了：

- ✅ 更好的用户体验
- ✅ 更清晰的代码结构
- ✅ 更容易维护和扩展
- ✅ 为未来功能开发打下基础

这次改造符合现代前端应用的最佳实践，为后续开发提供了良好的架构基础。

---

**文档维护者**: Gestell 开发团队  
**最后更新**: 2025年10月11日
