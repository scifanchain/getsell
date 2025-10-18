# macOS EGL 警告修复指南

## 问题描述

在 macOS 上运行 Electron 应用时，终端显示以下警告：

```
[1] [26967:1018/164600.772381:ERROR:gl_display.cc(497)] EGL Driver message (Error) eglQueryDeviceAttribEXT: Bad attribute.
```

## 这是什么？

这是一个 **无害的警告信息**，不是真正的错误。

### 原因

1. **Chromium/Electron 的图形架构**：
   - Chromium 内置了 OpenGL/EGL 的查询代码
   - 用于跨平台图形渲染

2. **macOS 的图形系统**：
   - macOS 使用 **Metal** 作为主要图形 API
   - 不完全支持 EGL（Embedded-System Graphics Library）
   - EGL 主要用于 Linux 和嵌入式系统

3. **冲突**：
   - Electron 尝试查询 EGL 设备属性
   - macOS 不支持该属性
   - 返回 "Bad attribute" 错误
   - 但不影响实际渲染（使用 Metal）

### 影响

✅ **完全不影响功能**：
- 应用正常运行
- 渲染性能正常
- 没有视觉问题
- 只是日志噪音

## 解决方案

### 方案 1：忽略警告（推荐）

**最简单的方案**：什么都不做。

- ✅ 这是 Electron 在 macOS 上的正常行为
- ✅ 不影响应用功能
- ✅ 不影响性能
- ✅ 不需要任何修改

### 方案 2：抑制 GPU 警告

如果您觉得终端输出的警告信息干扰，可以添加命令行开关。

**修改**: `src/main.ts`

```typescript
// macOS 特定：禁用 GPU 相关的警告信息
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}
```

**效果**：
- ✅ 减少 GPU 相关的警告信息
- ✅ 不影响渲染功能（仍使用硬件加速）
- ⚠️ 某些复杂 3D 场景可能受影响（但写作应用不涉及）

### 方案 3：完全禁用硬件加速（不推荐）

**仅在必要时使用**：

```typescript
// macOS 特定：完全禁用硬件加速
if (process.platform === 'darwin') {
  app.disableHardwareAcceleration();
}
```

**效果**：
- ✅ 完全消除 EGL 警告
- ❌ 性能下降（使用软件渲染）
- ❌ 动画可能不流畅
- ❌ 不推荐用于生产环境

### 方案 4：过滤日志输出

在启动脚本中过滤掉特定的错误信息。

**修改**: `package.json`

```json
{
  "scripts": {
    "dev:electron": "wait-on http://localhost:3000 && npm run build:main && npx electron dist/main.js --dev 2>&1 | grep -v 'EGL Driver message'",
  }
}
```

**效果**：
- ✅ 隐藏 EGL 警告
- ⚠️ 可能隐藏其他有用的错误信息
- ⚠️ 跨平台兼容性问题

## 推荐方案

### 对于开发环境

**选择方案 1：忽略警告**

理由：
- 这是正常现象
- 不影响开发体验
- 保持默认配置，避免潜在问题

### 对于生产环境

**选择方案 2：添加 GPU 命令行开关**

```typescript
// src/main.ts
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}
```

理由：
- 减少日志噪音
- 不影响性能
- 对用户透明

## 其他常见的 macOS Electron 警告

### 1. Metal 相关警告

```
[Metal] WARNING: Unsupported feature...
```

**原因**：Metal API 版本不完全兼容
**影响**：无
**解决**：忽略

### 2. Security 警告

```
WARNING: This renderer process has no Content Security Policy set
```

**原因**：CSP 配置问题
**影响**：安全风险
**解决**：参考 `docs/ELECTRON_SECURITY_FIX.md`

### 3. Sandbox 警告

```
[Sandbox] Sandbox is not supported on this platform
```

**原因**：macOS 沙盒限制
**影响**：无
**解决**：忽略或配置沙盒

## 验证修复

### 测试步骤

```bash
# 1. 重新构建主进程
npm run build:main

# 2. 启动开发模式
npm run dev

# 3. 观察终端输出
```

### 预期结果

**方案 1（忽略）**:
```
[1] [26967:1018/164600.772381:ERROR:gl_display.cc(497)] EGL Driver message (Error) eglQueryDeviceAttribEXT: Bad attribute.
🚀 Gestell启动中...
📦 Electron版本: 32.0.0
✅ 应用正常运行
```

**方案 2（抑制警告）**:
```
🚀 Gestell启动中...
📦 Electron版本: 32.0.0
🖥️  平台: darwin
✅ EGL 警告减少或消失
✅ 应用正常运行
```

## 技术背景

### EGL (Embedded-System Graphics Library)

- **用途**：OpenGL ES 的窗口系统接口
- **支持平台**：
  - ✅ Linux (X11, Wayland)
  - ✅ Android
  - ✅ Embedded Systems
  - ❌ macOS (使用 NSOpenGL/Metal)
  - ❌ Windows (使用 WGL)

### macOS 图形技术栈

```
应用层
  ↓
Electron/Chromium
  ↓
Metal (主要) / NSOpenGL (弃用)
  ↓
macOS 图形驱动
  ↓
GPU 硬件
```

### 为什么 Chromium 仍然查询 EGL？

1. **跨平台设计**：Chromium 是跨平台的，包含所有平台的代码
2. **渐进式回退**：尝试多种图形 API，选择最佳的
3. **兼容性**：确保在所有平台上都能运行

## 参考资源

- [Electron Command Line Switches](https://www.electronjs.org/docs/latest/api/command-line-switches)
- [Chromium GPU Flags](https://peter.sh/experiments/chromium-command-line-switches/)
- [Apple Metal Framework](https://developer.apple.com/metal/)
- [EGL Specification](https://www.khronos.org/egl)

## 总结

✅ **这是正常现象**
- macOS 不完全支持 EGL
- Electron 仍然尝试查询
- 不影响应用功能

✅ **推荐做法**
- 开发环境：忽略警告
- 生产环境：添加 GPU 命令行开关（可选）

✅ **不要过度修复**
- 避免禁用硬件加速
- 保持默认配置
- 关注真正的错误

❌ **不推荐**
- 完全禁用硬件加速
- 过度过滤日志
- 担心这个警告

---

**关键点**：这不是一个需要修复的"bug"，而是 Electron 在 macOS 上的正常行为。
