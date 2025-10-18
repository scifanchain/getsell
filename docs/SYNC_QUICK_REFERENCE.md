# 🎯 Gestell 同步配置快速参考

> **一页速查表 - 打印后贴在显示器旁边** 📌

---

## ⚡ 核心配置（记住这4个数字）

```typescript
{
  snapshot:  15秒 防抖    // Yjs → SQLite
  idle:      3分钟 空闲   // 空闲后同步
  scheduled: 10分钟 定时  // 保底同步
  cleanup:   3天 保留     // 变更历史
}
```

---

## 📊 性能预期（4小时协作）

| 层级 | 操作次数 | 数据量 | 延迟 |
|------|---------|--------|------|
| **Yjs 实时** | ~28,800 次编辑 | ~2MB 内存 | < 100ms |
| **IndexedDB** | 自动合并 | ~1MB | 1秒 |
| **SQLite 快照** | ~160 次 | ~2MB | 15秒 |
| **CR-SQLite P2P** | ~24 次 | ~1.6MB | 3分钟/10分钟 |

---

## 🚨 告警阈值（超过这些值需要调查）

```
⚠️  单次快照耗时 > 500ms
⚠️  单次同步耗时 > 5s
⚠️  单次传输数据 > 500KB
⚠️  变更记录数   > 500 条
⚠️  存储占用     > 5MB
⚠️  同步失败率   > 5%
```

---

## 🔧 场景优化速查

### 场景 1: 单人写作 - 性能优先 ✅ 推荐默认配置

```typescript
snapshot:  15秒
idle:      3分钟
scheduled: 10分钟
```

### 场景 2: 双人协作 - 平衡配置 ✅ 推荐默认配置

```typescript
snapshot:  15秒
idle:      3分钟
scheduled: 10分钟
```

### 场景 3: 多人协作（5-10人）- 实时优先

```typescript
snapshot:  10秒   // 降低
idle:      2分钟  // 降低
scheduled: 5分钟  // 降低
```

### 场景 4: 离线使用 - 极简配置

```typescript
snapshot:  30秒   // 增加
idle:      禁用
scheduled: 禁用
cleanup:   1天    // 降低
```

### 场景 5: 网络受限（流量贵）- 节约流量

```typescript
snapshot:  30秒   // 增加
idle:      10分钟 // 增加
scheduled: 30分钟 // 增加
cleanup:   1天    // 降低
```

---

## 🐛 快速故障排查

| 问题 | 检查点 | 快速修复 |
|------|--------|---------|
| **同步慢** | `idleThresholdMs` | 降低到 120000 (2分钟) |
| **存储大** | `retentionDays` | 降低到 1 天 |
| **流量高** | `debounceMs` | 增加到 30000 (30秒) |
| **丢数据** | IndexedDB | 检查是否集成 y-indexeddb |
| **冲突多** | CR-SQLite | 检查版本号是否递增 |

---

## 📞 快速命令

```typescript
// 手动触发同步
window.electron.ipcRenderer.invoke('sync:manual')

// 手动清理
window.electron.ipcRenderer.invoke('sync:cleanup')

// 查看状态
window.electron.ipcRenderer.invoke('sync:status')
```

---

## 🎨 状态图标含义

```
✏️  正在编辑
💤  空闲中（等待同步）
🔄  同步中
✅  同步完成
❌  同步失败
🗑️  清理中
```

---

## 📐 容量规划

| 用户数 | 4小时数据量 | 存储占用 | 网络流量 |
|--------|------------|---------|---------|
| **1人** | ~2MB | < 0.5MB | ~1.6MB |
| **2人** | ~4MB | < 1MB | ~3.2MB |
| **5人** | ~10MB | < 2MB | ~8MB |
| **10人** | ~20MB | < 4MB | ~16MB |

---

## 🔗 完整文档链接

- 📖 [完整最佳实践文档](./SYNC_BEST_PRACTICES.md)
- 🧹 [变更日志清理指南](./CRSQLITE_CLEANUP_GUIDE.md)
- 🏗️ [项目架构分析](./PROJECT_ARCHITECTURE_ANALYSIS.md)

---

**最后更新**: 2025-10-18  
**版本**: 1.0  
**状态**: ✅ 生产就绪
