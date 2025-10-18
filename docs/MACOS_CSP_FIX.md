# macOS CSP 问题快速修复指南

## 问题症状

在 **macOS** 上出现以下错误（Windows 11 正常）：

```
Refused to apply inline style because it violates the following 
Content Security Policy directive: "style-src 'self'".
```

## 根本原因

1. **平台差异**：macOS 对 CSP 的执行比 Windows 更严格
2. **Vue 动态样式**：应用使用 `:style` 绑定，运行时生成内联样式
3. **HTML meta 优先级**：HTML 中的 CSP meta 标签优先级高于 HTTP 响应头

## 解决方案

### 1. 允许内联样式（必须）

**修改**: `src/ui/index.html` 和 `src/ui/index.prod.html`

```html
<!-- 修改前 -->
<meta http-equiv="Content-Security-Policy" content="
  style-src 'self';
">

<!-- 修改后 -->
<meta http-equiv="Content-Security-Policy" content="
  style-src 'self' 'unsafe-inline';
">
```

### 2. 移除 HTML 内联样式

**新建**: `src/ui/loading.css`

```css
body {
  margin: 0;
  padding: 0;
  /* ... 其他样式 ... */
}
```

**修改**: `src/ui/index.html`

```html
<!-- 移除 <style> 标签，改用外部 CSS -->
<link rel="stylesheet" href="./loading.css">
```

## 为什么需要 'unsafe-inline' for styles?

### Vue 动态样式绑定示例

```vue
<!-- 这些都会生成内联样式 -->
<div :style="{ backgroundColor: color }"></div>
<div :style="{ width: `${progress}%` }"></div>
<span :style="{ color: getStatusColor(status) }"></span>
```

### 编译后的结果

```html
<div style="background-color: rgb(100, 181, 246);"></div>
<div style="width: 85%;"></div>
<span style="color: rgb(76, 175, 80);"></span>
```

**结论**: 不允许 `'unsafe-inline'` = Vue 动态样式全部失效

## 安全权衡

| 策略 | 安全性 | 功能性 | 推荐 |
|------|--------|--------|------|
| `style-src 'self'` | 🔒 最安全 | ❌ Vue 样式不工作 | ❌ |
| `style-src 'self' 'unsafe-inline'` | ⚠️ 相对安全 | ✅ 完全功能 | ✅ |
| `script-src 'unsafe-eval'` | ⛔ 不安全 | ✅ 支持 eval | ❌ |

**关键点**：
- ✅ 允许 `style-src 'unsafe-inline'` - 风险较低
- ❌ 禁止 `script-src 'unsafe-eval'` - 阻止 XSS 攻击

## 完整的 CSP 配置

### 开发环境 (index.html)

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self' 'unsafe-inline' 'unsafe-eval'; 
  script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: blob:; 
  font-src 'self' data:; 
  connect-src 'self' ws: wss: http://localhost:* ws://localhost:*;
  object-src 'none';
">
```

### 生产环境 (index.prod.html)

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self'; 
  script-src 'self'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: blob:; 
  font-src 'self' data:; 
  connect-src 'self' ws: wss:;
  object-src 'none';
">
```

## 测试步骤

### macOS 测试

```bash
# 1. 构建主进程
npm run build:main

# 2. 启动开发模式
npm run dev

# 3. 检查控制台
# ✅ 应该不再有 CSP 错误
# ✅ Vue 动态样式正常显示
```

### 验证点

- [ ] 不再出现 "Refused to apply inline style" 错误
- [ ] 作品列表中的状态颜色显示正常
- [ ] 进度条显示正常
- [ ] 编辑器中的协作者颜色显示正常

## 影响的组件

以下组件使用了动态 `:style` 绑定：

1. `WorkListView.vue` - 状态颜色、进度条
2. `WorkView.vue` - 状态颜色
3. `Editor.vue` - 协作者颜色
4. `ChapterTree/Node.vue` - 节点样式

## 参考资源

- [Vue Style Bindings](https://vuejs.org/guide/essentials/class-and-style.html)
- [CSP style-src Directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)

## 总结

✅ **必须允许** `style-src 'unsafe-inline'` 用于 Vue 应用
✅ **可以禁止** `script-src 'unsafe-eval'` 保持脚本安全
✅ **移除** HTML 内联 `<style>` 标签
✅ **使用** 外部 CSS 文件 (`loading.css`)
✅ **跨平台** Windows 和 macOS 都能正常工作
