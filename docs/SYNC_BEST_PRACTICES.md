# Gestell 协作同步最佳实践方案

> **制定日期**: 2025-10-18  
> **版本**: 1.0  
> **状态**: ✅ 生产就绪

## 📋 目录

- [核心架构](#核心架构)
- [配置方案](#配置方案)
- [性能指标](#性能指标)
- [使用指南](#使用指南)
- [监控建议](#监控建议)

---

## 🏗️ 核心架构

### 三层存储架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Layer 1: 实时协作层                      │
│  技术: Yjs + WebRTC/WebSocket                                │
│  延迟: < 100ms                                                │
│  数据: 内存中的 CRDT 文档                                     │
│  作用: 多人实时协作编辑                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Layer 2: 浏览器缓存层                       │
│  技术: y-indexeddb                                           │
│  延迟: 1秒防抖                                                │
│  数据: IndexedDB（每个设备独立）                              │
│  作用: 刷新恢复、离线编辑                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Layer 3: 本地持久化层                      │
│  技术: SQLite + Drizzle ORM                                  │
│  延迟: 15秒防抖                                               │
│  数据: 本地 SQLite 文件                                       │
│  作用: 业务数据存储、数据分析                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Layer 4: 跨设备同步层                       │
│  技术: CR-SQLite + P2P                                       │
│  延迟: 3分钟空闲 / 10分钟定时                                 │
│  数据: crsql_changes 表（增量变更）                           │
│  作用: 多设备数据同步、离线后重新同步                         │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚙️ 配置方案

### 最佳实践配置

```typescript
// src/core/sync-coordinator.ts

const config: SyncConfig = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📸 快照保存配置（Layer 3）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  snapshot: {
    debounceMs: 15000, // 15秒防抖
    
    // 💡 设计思路：
    // - 用户暂停 15 秒才算真正停止编辑
    // - 相比 5 秒防抖，减少 67% 的 SQLite 写入
    // - 平衡了实时性和性能
    
    // 📊 预期效果（4小时协作）：
    // - 快照次数: ~160 次（vs 5秒防抖的 480 次）
    // - 磁盘 IO: 减少 67%
  },
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔄 CR-SQLite 同步配置（Layer 4）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  crsqlite: {
    strategy: 'idle-batch',
    
    idleThresholdMs: 180000,   // 空闲 3 分钟后触发同步
    batchIntervalMs: 600000,   // 定时 10 分钟强制同步
    
    // 💡 设计思路：
    // - 空闲 3 分钟：协作暂停后及时同步给其他设备
    // - 定时 10 分钟：持续编辑时保底同步机制
    // - 两者配合确保数据不会延迟太久
    
    maxBatchSize: 100,          // 单次最多同步 100 条变更
    
    // 💡 设计思路：
    // - 防止变更累积过多导致单次传输过大
    // - 如果累积超过 100 条，会立即触发同步
    // - 确保单次网络传输 < 500KB
    
    // 📊 预期效果（4小时协作）：
    // - 同步次数: ~24 次（vs 5分钟的 48 次）
    // - 每次数据: ~70KB（160条变更 / 24次）
    // - 网络总流量: ~1.6MB
    // - 网络请求: 减少 50%
  },
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🗑️ 变更日志清理配置
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  cleanup: {
    enabled: true,
    
    retentionDays: 3,           // 保留最近 3 天的变更
    minChangesToKeep: 50,       // 至少保留 50 条变更
    
    // 💡 设计思路：
    // - 3 天足够恢复最近的协作历史
    // - 相比 7 天，减少 57% 的存储占用
    // - 最少保留 50 条确保不会过度清理
    
    compactAfterSync: true,     // 同步后立即压缩
    
    // 💡 设计思路：
    // - 删除后执行 VACUUM 回收磁盘空间
    // - 在空闲时执行不影响性能
    
    scheduledCleanupIntervalMs: 3600000, // 每小时清理一次
    
    // 📊 预期效果：
    // - 存储占用: < 500KB（vs 7天的 ~2MB）
    // - 减少 75% 的存储空间
  },
};
```

### 配置决策表

| 参数 | 值 | 为什么选择这个值？ | 替代方案 |
|------|----|--------------------|---------|
| **snapshot.debounceMs** | 15秒 | • 用户真正停止编辑的阈值<br>• 减少 67% 的磁盘 IO<br>• 平衡实时性和性能 | • 5秒: 更实时但IO多<br>• 30秒: IO少但延迟高 |
| **idleThresholdMs** | 3分钟 | • 协作暂停后及时同步<br>• 避免数据延迟太久<br>• 不会过于频繁 | • 1分钟: 太频繁<br>• 5分钟: 延迟较高 |
| **batchIntervalMs** | 10分钟 | • 持续编辑时的保底机制<br>• 减少 50% 的网络请求<br>• 确保数据不会丢失 | • 5分钟: 更安全但请求多<br>• 15分钟: 请求少但风险高 |
| **maxBatchSize** | 100条 | • 单次传输 < 500KB<br>• 防止累积过多<br>• 网络传输可靠 | • 无限制: 可能传输失败<br>• 50条: 过于保守 |
| **retentionDays** | 3天 | • 足够恢复历史<br>• 减少 75% 存储<br>• 适合大多数场景 | • 1天: 太短<br>• 7天: 占用多 |

---

## 📊 性能指标

### 典型场景分析

#### 场景 1: 单人写作（4小时）

```
用户行为:
- 平均打字速度: 2 字符/秒
- 暂停频率: 每 30 秒暂停一次
- 暂停时长: 5-20 秒

┌──────────────────────────────────────┐
│ Layer 1: Yjs 实时                     │
│ • 编辑次数: ~28,800 次                │
│ • 内存占用: ~2MB                      │
│ • 延迟: < 10ms ✅                     │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Layer 2: IndexedDB                   │
│ • 保存次数: 自动合并（<500次）        │
│ • 存储占用: ~1MB                      │
│ • 刷新恢复: ✅ 立即恢复                │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Layer 3: SQLite 快照                 │
│ • 快照次数: ~160 次                   │
│ • 磁盘占用: ~2MB                      │
│ • 磁盘 IO: 减少 67% ✅                │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Layer 4: CR-SQLite P2P               │
│ • 同步次数: ~24 次                    │
│ • 网络流量: ~1.6MB                    │
│ • 变更记录: ~160 条 → 清理后 <50 条   │
└──────────────────────────────────────┘
```

#### 场景 2: 双人协作（4小时）

```
用户行为:
- 2 人同时编辑
- 各自打字速度: 2 字符/秒
- 实时看到对方的修改

┌──────────────────────────────────────┐
│ Layer 1: Yjs 实时                     │
│ • 本地编辑: ~28,800 次                │
│ • 远程更新: ~28,800 次                │
│ • WebRTC 延迟: < 100ms ✅             │
│ • 冲突解决: 自动 CRDT ✅              │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Layer 2: IndexedDB                   │
│ • 每人独立存储                        │
│ • 各自的 IndexedDB: ~2MB              │
│ • 刷新恢复: ✅ 包含对方的编辑          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Layer 3: SQLite 快照                 │
│ • 每人各自保存: ~160 次/人            │
│ • 总快照: 320 次（两份数据库）        │
│ • 磁盘占用: 每人 ~2MB                 │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Layer 4: CR-SQLite P2P               │
│ • 每人同步 24 次                      │
│ • 相互传输: 24 × 2 = 48 次            │
│ • 总流量: ~3.2MB (双向)               │
│ • 冲突解决: CR-SQLite 自动合并 ✅     │
└──────────────────────────────────────┘
```

#### 场景 3: 十人协作（2小时高峰）

```
用户行为:
- 10 人同时在线
- 但只有 3-4 人同时编辑
- 其他人阅读或暂停

┌──────────────────────────────────────┐
│ Layer 1: Yjs 实时                     │
│ • 活跃编辑者: 3-4 人                  │
│ • WebRTC Mesh: 处理中 ⚠️              │
│ • 建议: 使用 y-websocket 中继服务器   │
│ • 延迟: < 200ms (通过服务器)          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Layer 3: SQLite 快照                 │
│ • 活跃者快照: ~80 次/人 × 4 = 320 次  │
│ • 观察者快照: ~20 次/人 × 6 = 120 次  │
│ • 总计: ~440 次（分散在 10 个设备）   │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Layer 4: CR-SQLite P2P               │
│ • 同步频率: 10分钟/次                 │
│ • 同步次数: 12 次/人                  │
│ • 总网络流量: ~1MB/人 × 10 = ~10MB   │
│ • P2P Mesh: 建议使用中继服务器 ⚠️     │
└──────────────────────────────────────┘

⚠️ 注意：
- 10人以上建议使用 WebSocket 中继服务器
- 不要使用纯 WebRTC Mesh（连接数 = n²）
```

### 性能对比表

| 指标 | 之前配置<br>(5秒+5分钟) | 最佳实践配置<br>(15秒+10分钟) | 改善幅度 |
|------|---------------------|------------------------------|---------|
| **SQLite 写入** | 480 次/4h | 160 次/4h | ⬇️ 67% |
| **网络同步** | 48 次/4h | 24 次/4h | ⬇️ 50% |
| **单次传输** | ~50KB | ~70KB | ⬆️ 40% (可接受) |
| **总网络流量** | ~2.4MB | ~1.6MB | ⬇️ 33% |
| **变更记录** | ~480 条 → 清理后 100 条 | ~160 条 → 清理后 50 条 | ⬇️ 67% |
| **存储占用** | ~2MB | ~0.5MB | ⬇️ 75% |
| **实时性** | 5秒延迟 | 15秒延迟 | ⬆️ 10秒 (可接受) |

---

## 🚀 使用指南

### 1. 在主进程中初始化

```typescript
// src/main.ts

import { DatabaseManager } from './core/db-manager';
import { SyncCoordinator } from './core/sync-coordinator';

let syncCoordinator: SyncCoordinator | null = null;

app.whenReady().then(async () => {
  // 1. 初始化数据库
  await dbManager.initialize();
  
  // 2. 创建同步协调器
  syncCoordinator = new SyncCoordinator(dbManager);
  
  // 3. 启动同步协调器
  syncCoordinator.start();
  
  console.log('✅ 同步协调器已启动');
});

app.on('before-quit', () => {
  // 退出前停止同步协调器
  if (syncCoordinator) {
    syncCoordinator.stop();
  }
});
```

### 2. 在渲染进程中集成

```typescript
// src/views/WritingView.vue

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';

const initCollaboration = async () => {
  // 1️⃣ 创建 Yjs 文档
  const ydoc = new Y.Doc();
  
  // 2️⃣ 集成 ProseMirror
  const yXmlFragment = ydoc.getXmlFragment('prosemirror');
  const prosemirrorBinding = new ProsemirrorBinding(yXmlFragment, editorView);
  
  // 3️⃣ IndexedDB 持久化（Layer 2）
  const indexeddbProvider = new IndexeddbPersistence(
    `gestell-content-${props.contentId}`,
    ydoc
  );
  
  await indexeddbProvider.whenSynced;
  console.log('✅ IndexedDB 已同步');
  
  // 4️⃣ WebRTC 实时协作（Layer 1）
  const webrtcProvider = new WebrtcProvider(
    `gestell-room-${props.contentId}`,
    ydoc,
    {
      signaling: ['wss://your-signaling-server.com'],
    }
  );
  
  // 5️⃣ 监听 Yjs 更新，触发快照保存（Layer 3）
  let snapshotTimer: NodeJS.Timeout | null = null;
  
  ydoc.on('update', (update: Uint8Array, origin: any) => {
    // 通知 SyncCoordinator 有新编辑
    window.electron.ipcRenderer.send('sync:notify-edit');
    
    // 防抖保存到 SQLite（15秒）
    if (snapshotTimer) {
      clearTimeout(snapshotTimer);
    }
    
    snapshotTimer = setTimeout(async () => {
      const content = ydoc.getText('content').toJSON();
      await window.electron.ipcRenderer.invoke('content:save', {
        contentId: props.contentId,
        content: JSON.stringify(content),
      });
      
      console.log('📸 快照已保存到 SQLite');
      snapshotTimer = null;
    }, 15000); // 15秒防抖
  });
  
  // 6️⃣ 组件卸载时清理
  onBeforeUnmount(() => {
    if (snapshotTimer) {
      clearTimeout(snapshotTimer);
    }
    webrtcProvider.destroy();
    indexeddbProvider.destroy();
  });
};
```

### 3. 暴露 IPC 接口

```typescript
// src/main.ts

import { ipcMain } from 'electron';

// 通知有新编辑
ipcMain.on('sync:notify-edit', () => {
  if (syncCoordinator) {
    syncCoordinator.notifyEdit();
  }
});

// 手动触发同步
ipcMain.handle('sync:manual', async () => {
  if (!syncCoordinator) return { success: false };
  
  await syncCoordinator.performSync('manual');
  return { success: true };
});

// 手动触发清理
ipcMain.handle('sync:cleanup', async () => {
  if (!syncCoordinator) return { success: false };
  
  await syncCoordinator.performCleanup();
  return { success: true };
});

// 获取同步状态
ipcMain.handle('sync:status', () => {
  if (!syncCoordinator) return null;
  
  return syncCoordinator.getStatus();
});
```

### 4. 在 UI 中显示同步状态

```vue
<!-- src/components/SyncStatusIndicator.vue -->

<template>
  <div class="sync-status">
    <div v-if="status.isIdle" class="status-idle">
      💤 空闲 ({{ status.idleTimeSeconds }}秒)
    </div>
    <div v-else class="status-editing">
      ✏️ 编辑中
    </div>
    
    <div class="sync-info">
      <div>变更记录: {{ status.changeStats.totalChanges }} 条</div>
      <div>存储占用: {{ formatSize(status.changeStats.estimatedSize) }}</div>
      <div>最后同步: {{ formatVersion(status.lastSyncVersion) }}</div>
    </div>
    
    <button @click="manualSync">立即同步</button>
    <button @click="manualCleanup">清理日志</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const status = ref({
  isIdle: false,
  idleTimeSeconds: 0,
  changeStats: { totalChanges: 0, estimatedSize: 0 },
  lastSyncVersion: 0,
});

let statusInterval: NodeJS.Timeout | null = null;

onMounted(() => {
  // 每 5 秒更新状态
  statusInterval = setInterval(async () => {
    const result = await window.electron.ipcRenderer.invoke('sync:status');
    if (result) {
      status.value = result;
    }
  }, 5000);
});

onUnmounted(() => {
  if (statusInterval) {
    clearInterval(statusInterval);
  }
});

const manualSync = async () => {
  await window.electron.ipcRenderer.invoke('sync:manual');
  console.log('✅ 手动同步完成');
};

const manualCleanup = async () => {
  await window.electron.ipcRenderer.invoke('sync:cleanup');
  console.log('✅ 手动清理完成');
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const formatVersion = (version: number) => {
  return `v${version}`;
};
</script>
```

---

## 📈 监控建议

### 关键指标

#### 1. 性能指标

```typescript
// 建议记录的指标

interface SyncMetrics {
  // SQLite 快照
  snapshotCount: number;           // 快照次数
  snapshotAvgTime: number;         // 平均快照耗时
  snapshotFailures: number;        // 快照失败次数
  
  // CR-SQLite 同步
  syncCount: number;               // 同步次数
  syncAvgTime: number;             // 平均同步耗时
  syncAvgChanges: number;          // 平均每次同步变更数
  syncAvgDataSize: number;         // 平均每次传输数据量
  syncFailures: number;            // 同步失败次数
  
  // 变更日志
  changesTotal: number;            // 总变更数
  changesRetained: number;         // 保留的变更数
  changesCleared: number;          // 已清理的变更数
  storageSize: number;             // 总存储占用
  
  // 网络
  networkUpload: number;           // 上传流量
  networkDownload: number;         // 下载流量
  networkLatency: number;          // 网络延迟
}
```

#### 2. 告警阈值

| 指标 | 正常范围 | 告警阈值 | 严重阈值 |
|------|---------|---------|---------|
| 单次快照耗时 | < 100ms | > 500ms | > 1s |
| 单次同步耗时 | < 2s | > 5s | > 10s |
| 单次传输数据 | < 200KB | > 500KB | > 1MB |
| 变更记录数 | < 200 | > 500 | > 1000 |
| 存储占用 | < 1MB | > 5MB | > 10MB |
| 同步失败率 | < 1% | > 5% | > 10% |

#### 3. 日志记录

```typescript
// 建议的日志格式

// 快照日志
console.log('[Snapshot] contentId=%s duration=%dms size=%d', 
  contentId, duration, size);

// 同步日志
console.log('[Sync] trigger=%s changes=%d dataSize=%d duration=%dms', 
  trigger, changes, dataSize, duration);

// 清理日志
console.log('[Cleanup] before=%d after=%d savedSpace=%d', 
  before, after, savedSpace);

// 错误日志
console.error('[Sync Error] type=%s message=%s stack=%s', 
  errorType, message, stack);
```

---

## 🔧 故障排查

### 常见问题

#### 问题 1: 同步延迟过高

**症状**: 其他设备 10+ 分钟才能看到变更

**可能原因**:
- 空闲阈值设置过长
- 定时同步间隔过长
- 网络连接不稳定

**解决方案**:
```typescript
// 临时降低同步间隔
const config = {
  crsqlite: {
    idleThresholdMs: 120000,   // 2分钟（从3分钟降低）
    batchIntervalMs: 300000,   // 5分钟（从10分钟降低）
  }
};
```

#### 问题 2: 存储占用过高

**症状**: SQLite 文件 > 10MB

**可能原因**:
- 清理未启用
- 保留天数过长
- 大量变更未清理

**解决方案**:
```typescript
// 手动触发清理
await window.electron.ipcRenderer.invoke('sync:cleanup');

// 或者降低保留天数
const config = {
  cleanup: {
    retentionDays: 1,  // 只保留1天
    minChangesToKeep: 20,
  }
};
```

#### 问题 3: 网络流量过大

**症状**: 网络占用 > 5MB/小时

**可能原因**:
- 快照防抖时间过短
- 同步频率过高
- 单次传输数据过大

**解决方案**:
```typescript
// 增加防抖时间和同步间隔
const config = {
  snapshot: {
    debounceMs: 30000,  // 30秒
  },
  crsqlite: {
    idleThresholdMs: 300000,   // 5分钟
    batchIntervalMs: 900000,   // 15分钟
  }
};
```

---

## 📚 参考资料

- [Yjs 官方文档](https://docs.yjs.dev/)
- [y-indexeddb 文档](https://github.com/yjs/y-indexeddb)
- [CR-SQLite 文档](https://github.com/vlcn-io/cr-sqlite)
- [变更日志清理指南](./CRSQLITE_CLEANUP_GUIDE.md)
- [架构分析文档](./PROJECT_ARCHITECTURE_ANALYSIS.md)

---

## 📝 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 1.0 | 2025-10-18 | 初始版本，最佳实践配置 |

---

## 🤝 贡献指南

如果你发现配置可以进一步优化，请：

1. 记录你的测试数据（场景、指标、改进效果）
2. 更新配置参数
3. 更新本文档的性能指标
4. 提交 Pull Request

---

**注意**: 本配置基于典型协作场景优化。特殊场景（如超大文档、百人协作）可能需要调整参数。
