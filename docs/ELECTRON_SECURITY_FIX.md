# Electron 安全配置修复指南

## 问题描述

遇到了三个 Electron 安全相关的问题：

1. **CSP (Content Security Policy) 警告**：
   ```
   Electron Security Warning (Insecure Content-Security-Policy)
   This renderer process has either no Content Security Policy set 
   or a policy with "unsafe-eval" enabled.
   ```

2. **本地资源加载错误**：
   ```
   Not allowed to load local resource: file:///Users/oxb/scifan/gestell/dist/renderer/src/ui/index.html
   ```

3. **macOS 特定：内联样式被阻止**（Windows 11 下正常）：
   ```
   Refused to apply inline style because it violates the following 
   Content Security Policy directive: "style-src 'self'".
   ```

### 平台差异说明

- **Windows 11**: 对 CSP 的执行相对宽松
- **macOS**: 对 CSP 的执行更加严格，特别是对 HTML `<meta>` 标签中定义的 CSP
- **根本原因**: Vue 应用使用了 `:style` 动态样式绑定，运行时会生成内联样式

## 解决方案

### 1. 修复 Content Security Policy (CSP)

#### 问题原因
- HTML 中使用了 `'unsafe-inline'`，触发 Electron 安全警告
- 开发模式需要 `'unsafe-eval'` 来支持 Vite 的 HMR（热模块替换）
- 但不应在生产环境使用这些不安全的策略

#### 解决方案
**区分开发和生产环境的 CSP 策略：**

**开发环境** (`src/ui/index.html`):
- 在 HTML meta 标签中允许 `'unsafe-inline'` 和 `'unsafe-eval'`
- 支持 Vite HMR 和 Vue 动态样式绑定
- 移除内联 `<style>` 标签，使用外部 CSS 文件 (`loading.css`)

**生产环境** (`src/ui/index.prod.html`):
- 允许 `style-src 'self' 'unsafe-inline'` 用于 Vue 动态样式
- 不允许 `'unsafe-eval'` 
- 移除内联 `<style>` 标签，使用外部 CSS 文件
- 仅允许来自 `'self'` 的脚本资源

#### 修改的文件

**src/main.ts**:
```typescript
// 开发模式下动态设置 CSP
if (isDev) {
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          // ... 其他策略
        ]
      }
    });
  });
}
```

**src/ui/index.html** (开发):
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
<!-- 移除内联样式，使用外部 CSS -->
<link rel="stylesheet" href="./loading.css">
```

**src/ui/index.prod.html** (生产):
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
<!-- 移除内联样式，使用外部 CSS -->
<link rel="stylesheet" href="./loading.css">
```

**新增文件：src/ui/loading.css**
```css
/* 加载页面的样式，独立于 Vue 应用 */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
  color: #e0e0e0;
  overflow: hidden;
  user-select: none;
}

#app {
  width: 100vw;
  height: 100vh;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 18px;
  color: #64b5f6;
}
```

### 2. 修复文件路径问题

#### 问题原因
生产模式下的文件路径不正确：
```typescript
// 错误的路径
mainWindow.loadFile(path.join(__dirname, '../dist/renderer/src/ui/index.html'));
```

Vite 构建后的文件结构：
```
dist/
  renderer/
    index.html      ← 正确的位置
    assets/
      main-xxx.js
      style-xxx.css
```

#### 解决方案
修正生产模式的文件路径：
```typescript
// 正确的路径
const indexPath = path.join(__dirname, '../dist/renderer/index.html');
mainWindow.loadFile(indexPath);
```

### 3. 增强的 WebPreferences 配置

在 `src/main.ts` 中添加 `webSecurity: true`：
```typescript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  webSecurity: true,  // ← 新增
  preload: path.join(__dirname, '../src/preload.js')
}
```

### 4. 更新 Vite 配置

在 `vite.config.ts` 中确保构建输出正确：
```typescript
build: {
  outDir: mode === 'development' ? '../../dist/renderer' : 'dist/renderer',
  emptyOutDir: true,  // ← 构建前清空输出目录
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'src/ui/index.html')
    }
  },
  assetsDir: 'assets'  // ← 确保资源目录正确
}
```

## 测试步骤

### 开发模式测试
```bash
npm run dev
```

**预期结果**：
- ✅ 不再显示 CSP 警告（因为开发模式允许 unsafe-eval）
- ✅ Vite HMR 正常工作
- ✅ 应用正常加载

### 生产模式测试
```bash
npm run build
npm start
```

**预期结果**：
- ✅ 不再显示 CSP 警告
- ✅ 不再有文件路径错误
- ✅ 应用从 `dist/renderer/index.html` 正常加载
- ✅ 所有资源正确加载

## CSP 策略说明

### 开发环境策略（宽松）
```
default-src 'self' 'unsafe-inline' 'unsafe-eval'
script-src 'self' 'unsafe-inline' 'unsafe-eval'  ← 允许 Vite HMR
style-src 'self' 'unsafe-inline'                  ← 允许 Vue 动态样式和 Vite HMR
connect-src 'self' ws: wss: http://localhost:*    ← 允许本地 WebSocket
```

### 生产环境策略（平衡安全与功能）
```
default-src 'self'
script-src 'self'                ← 仅允许同源脚本，不允许 eval
style-src 'self' 'unsafe-inline' ← 允许内联样式（Vue 动态 :style 需要）
connect-src 'self' ws: wss:      ← 允许同源和 WebSocket（协作功能需要）
```

### 为什么生产环境需要 'unsafe-inline' for styles?

Vue 应用广泛使用动态样式绑定：
```vue
<!-- 这些会生成内联样式 -->
<div :style="{ backgroundColor: color }"></div>
<div :style="{ width: `${progress}%` }"></div>
```

**权衡考虑**：
- ❌ 完全禁用 `'unsafe-inline'`: Vue 动态样式无法工作
- ✅ 允许 `style-src 'unsafe-inline'`: 保持功能性，风险相对较低
- ✅ 禁止 `script-src 'unsafe-eval'`: 阻止最危险的 XSS 攻击

这是 Vue/React 等现代框架在 Electron 中的标准做法。

## 安全最佳实践

1. **开发和生产分离**：
   - 开发模式可以放宽 CSP 以支持开发工具
   - 生产模式尽可能使用严格的 CSP

2. **避免内联代码**：
   - 不使用内联 `<script>` 标签
   - 将 HTML 中的 `<style>` 移到外部 CSS 文件
   - Vue 动态 `:style` 绑定是例外（框架需要）

3. **webPreferences 配置**：
   ```typescript
   {
     nodeIntegration: false,      // 禁用 Node 集成
     contextIsolation: true,      // 启用上下文隔离
     webSecurity: true,           // 启用 Web 安全
     allowRunningInsecureContent: false  // 禁止不安全内容
   }
   ```

4. **使用 preload 脚本**：
   - 通过 preload 暴露必要的 API
   - 避免在渲染进程直接访问 Node.js API

5. **平台差异处理**：
   - macOS 对 CSP 执行更严格
   - 在 macOS 上测试以确保 CSP 配置正确
   - HTML meta 标签中的 CSP 优先级高于 HTTP 头

## 参考资源

- [Electron Security Guidelines](https://www.electronjs.org/docs/latest/tutorial/security)
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Electron contextBridge](https://www.electronjs.org/docs/latest/api/context-bridge)

## 总结

通过以下改进，我们解决了所有安全警告：

✅ 区分开发和生产环境的 CSP 策略
✅ 修正文件路径错误
✅ 增强 webPreferences 安全配置
✅ 遵循 Electron 安全最佳实践
✅ 不影响开发体验（HMR 仍然工作）
✅ 生产环境平衡安全性与功能性
✅ 解决 macOS 特定的 CSP 执行严格性问题
✅ 移除 HTML 内联样式，使用外部 CSS
✅ 允许 Vue 动态样式绑定（框架必需）

### 关键改进

1. **移除内联 `<style>` 标签**
   - 创建独立的 `loading.css` 文件
   - 符合 CSP 最佳实践

2. **允许 Vue 动态样式**
   - `style-src 'self' 'unsafe-inline'`
   - 这是 Vue 应用的必要妥协
   - 风险远低于允许 `script-src 'unsafe-eval'`

3. **跨平台兼容**
   - Windows 11: ✅ 正常工作
   - macOS: ✅ 修复 CSP 严格执行问题
