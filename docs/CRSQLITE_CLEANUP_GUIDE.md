# CR-SQLite 变更日志清理指南

## 📚 背景

### 问题：变更日志累积

CR-SQLite 会记录每次数据库更新到 `crsql_changes` 表中，用于 P2P 同步。但这会导致：

```
场景：2人协作，10分钟内 100 次编辑
├─ 生成 100 条变更记录
├─ 每条约 5KB（包含内容）
└─ 总计：~510 KB

问题：
1. 最终只需要最后一个版本
2. 中间的 99 个版本是冗余的
3. 长期累积会导致数据库膨胀
```

### 解决方案：定期清理

保留最近的变更（用于同步），删除旧的变更（已同步完成）。

---

## 🎯 清理策略

### 1. **自动清理（推荐）**

```typescript
import { DatabaseManager } from './core/db-manager';
import { SyncCoordinator } from './core/sync-coordinator';

// 初始化数据库管理器
const dbManager = new DatabaseManager({
  dbPath: '/path/to/database.db',
  enableWal: true
});

await dbManager.initialize();

// 创建同步协调器（自动清理已启用）
const syncCoordinator = new SyncCoordinator(dbManager);

// 启动（包含自动清理）
syncCoordinator.start();

// 配置说明：
// - retentionDays: 7        保留最近 7 天的变更
// - minChangesToKeep: 100   至少保留 100 条变更
// - compactAfterSync: true  每次同步后自动压缩
// - scheduledCleanupIntervalMs: 3600000  每小时清理一次
```

### 2. **手动清理**

```typescript
// 场景 A：同步后立即清理
await syncCoordinator.manualSync();
await syncCoordinator.manualCleanup();

// 场景 B：定期清理（如凌晨 3 点）
const cleanupTask = cron.schedule('0 3 * * *', () => {
  syncCoordinator.manualCleanup();
});

// 场景 C：达到阈值后清理
const stats = dbManager.getChangesStats();
if (stats.totalChanges > 10000) {
  await syncCoordinator.manualCleanup();
}
```

### 3. **精细控制**

```typescript
// 直接使用 DatabaseManager 的清理方法
import { dbManager } from './core/db-manager';

// 获取统计信息
const stats = dbManager.getChangesStats();
console.log('变更日志统计:', {
  总记录数: stats.totalChanges,
  最旧版本: stats.oldestVersion,
  最新版本: stats.newestVersion,
  估算大小: `${(stats.estimatedSize / 1024 / 1024).toFixed(2)} MB`
});

// 清理指定版本之前的所有变更
const cutoffVersion = stats.newestVersion - 1000; // 保留最近 1000 个版本
dbManager.compactChanges(cutoffVersion);
```

---

## 🔄 完整的同步 + 清理流程

### 三层架构

```typescript
┌─────────────────────────────────────────────────────────┐
│                 第 1 层：实时协作                        │
│  Yjs WebRTC (毫秒级)                                    │
│  - 用户编辑 → 实时同步给其他在线用户                     │
│  - 延迟: < 100ms                                        │
│  - 数据量: 每次编辑 ~100-500 bytes                      │
└─────────────────────────────────────────────────────────┘
         ↓ 5 秒防抖
┌─────────────────────────────────────────────────────────┐
│                 第 2 层：本地持久化                      │
│  SQLite 快照 (秒级)                                     │
│  - 5 秒无操作 → 保存快照到 SQLite                       │
│  - CR-SQLite 自动记录变更到 crsql_changes 表           │
│  - 开销: 每次 ~0.01ms（记录变更）                       │
└─────────────────────────────────────────────────────────┘
         ↓ 空闲 1 分钟 / 定时 5 分钟
┌─────────────────────────────────────────────────────────┐
│                 第 3 层：设备间同步                      │
│  CR-SQLite P2P (分钟级)                                │
│  - 空闲 1 分钟后 → 批量同步所有累积变更                 │
│  - 或定时 5 分钟强制同步                                │
│  - 同步后清理旧变更 (可选)                              │
└─────────────────────────────────────────────────────────┘
         ↓ 同步后 / 每小时
┌─────────────────────────────────────────────────────────┐
│                 清理层：变更日志压缩                     │
│  - 删除已同步的旧变更                                   │
│  - 保留最近 7 天 或 至少 100 条                         │
│  - 运行 VACUUM 回收磁盘空间                             │
└─────────────────────────────────────────────────────────┘
```

### 示例代码

```typescript
// main.ts 或应用入口

import { DatabaseManager } from './core/db-manager';
import { SyncCoordinator } from './core/sync-coordinator';

async function initializeSync() {
  // 1️⃣ 初始化数据库
  const dbManager = new DatabaseManager({
    dbPath: app.getPath('userData') + '/gestell.db',
    enableWal: true
  });

  await dbManager.initialize();

  // 2️⃣ 创建同步协调器
  const syncCoordinator = new SyncCoordinator(dbManager);

  // 3️⃣ 启动自动同步和清理
  syncCoordinator.start();

  // 4️⃣ 监听编辑事件（由 WritingView 触发）
  ipcMain.on('content:edited', () => {
    syncCoordinator.notifyEdit();
  });

  ipcMain.on('content:snapshot-saved', () => {
    syncCoordinator.notifySnapshotSaved();
  });

  // 5️⃣ 提供手动同步接口（可选）
  ipcMain.handle('sync:manual', async () => {
    await syncCoordinator.manualSync();
    return { success: true };
  });

  ipcMain.handle('sync:cleanup', async () => {
    await syncCoordinator.manualCleanup();
    return { success: true };
  });

  ipcMain.handle('sync:status', () => {
    return syncCoordinator.getStatus();
  });

  // 6️⃣ 应用退出时停止
  app.on('before-quit', () => {
    syncCoordinator.stop();
    dbManager.close();
  });
}

initializeSync();
```

---

## 📊 性能对比

### 场景：2 人协作，10 分钟内 100 次编辑

#### ❌ 不清理（累积问题）

```
10 天后：
├─ 变更记录：~14,400 条（每天 10 分钟，100 次编辑）
├─ 存储占用：~7.2 MB
└─ 查询性能：变慢（需要扫描大量记录）
```

#### ✅ 自动清理（推荐）

```
任何时候：
├─ 变更记录：< 1000 条（保留最近的）
├─ 存储占用：< 0.5 MB
└─ 查询性能：快速
```

---

## 🛡️ 安全考虑

### 1. **何时可以安全清理？**

✅ 可以清理：
- 所有设备都已同步完成
- 变更已经在所有节点应用
- 保留了足够的历史用于新设备加入

❌ 不能清理：
- 有设备长时间离线未同步
- 正在进行同步过程中
- 需要回滚到旧版本

### 2. **保留策略建议**

```typescript
// 保守策略（适合多设备、不稳定网络）
{
  retentionDays: 30,      // 保留 30 天
  minChangesToKeep: 500   // 至少 500 条
}

// 平衡策略（推荐）
{
  retentionDays: 7,       // 保留 7 天
  minChangesToKeep: 100   // 至少 100 条
}

// 激进策略（单设备或稳定网络）
{
  retentionDays: 1,       // 保留 1 天
  minChangesToKeep: 50    // 至少 50 条
}
```

### 3. **清理前检查**

```typescript
async function safeCleanup() {
  // 1. 检查所有设备是否在线并已同步
  const allDevicesSynced = await checkAllDevicesSyncStatus();
  
  if (!allDevicesSynced) {
    console.warn('⚠️  有设备未同步，推迟清理');
    return;
  }

  // 2. 执行清理
  await syncCoordinator.manualCleanup();
}
```

---

## 📝 总结

### 关键点

1. ✅ **CR-SQLite 记录变更的开销很小**（每次 ~0.01ms）
2. ✅ **变更记录可以定期清理**（不会影响已同步的数据）
3. ✅ **推荐策略**：保留最近 7 天或至少 100 条变更
4. ✅ **自动清理**：同步后或每小时自动运行

### 最佳实践

```typescript
// 在应用中启用自动清理
const syncCoordinator = new SyncCoordinator(dbManager);
syncCoordinator.start();  // 自动处理一切！

// 监控存储使用
setInterval(() => {
  const stats = dbManager.getChangesStats();
  console.log('变更日志大小:', 
    (stats.estimatedSize / 1024 / 1024).toFixed(2), 'MB'
  );
}, 60000);
```

### 预期效果

- 💾 存储占用：保持在 < 1 MB
- ⚡ 查询性能：始终快速
- 🔄 同步效率：只传输必要的变更
- 🎯 开销：几乎可以忽略
