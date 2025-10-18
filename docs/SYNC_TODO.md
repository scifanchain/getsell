# Gestell 同步功能 TODO 清单

> **快速待办事项** - 按优先级排序

---

## 🔴 本周必完成 (HIGH PRIORITY)

### ☐ 1. 安装 y-indexeddb 依赖
```bash
npm install y-indexeddb
```
**预计**: 5分钟

---

### ☐ 2. 集成 y-indexeddb 到 Editor
**文件**: `src/views/WritingView.vue`  
**预计**: 1小时

```typescript
import { IndexeddbPersistence } from 'y-indexeddb';

const indexeddbProvider = new IndexeddbPersistence(
  `gestell-content-${props.contentId}`,
  ydoc
);

await indexeddbProvider.whenSynced;
```

**验证**:
- [ ] 刷新页面后内容能恢复
- [ ] 包含协作者的编辑

---

### ☐ 3. 初始化 SyncCoordinator
**文件**: `src/main.ts`  
**预计**: 30分钟

```typescript
import { SyncCoordinator } from './core/sync-coordinator';

let syncCoordinator: SyncCoordinator | null = null;

app.whenReady().then(async () => {
  syncCoordinator = new SyncCoordinator(dbManager);
  syncCoordinator.start();
});
```

**验证**:
- [ ] 控制台显示 "✅ 同步协调器已启动"
- [ ] 退出时正常停止

---

### ☐ 4. 暴露 IPC 接口
**文件**: `src/main.ts`  
**预计**: 1小时

```typescript
ipcMain.on('sync:notify-edit', () => {
  syncCoordinator?.notifyEdit();
});

ipcMain.handle('sync:manual', async () => {
  await syncCoordinator?.performSync('manual');
});

ipcMain.handle('sync:status', () => {
  return syncCoordinator?.getStatus();
});
```

**验证**:
- [ ] 渲染进程能调用所有接口
- [ ] 返回正确的状态

---

### ☐ 5. 触发快照保存
**文件**: `src/views/WritingView.vue`  
**预计**: 1小时

```typescript
let snapshotTimer: NodeJS.Timeout | null = null;

ydoc.on('update', () => {
  window.electron.ipcRenderer.send('sync:notify-edit');
  
  if (snapshotTimer) clearTimeout(snapshotTimer);
  
  snapshotTimer = setTimeout(async () => {
    await window.electron.ipcRenderer.invoke('content:save', {
      contentId: props.contentId,
      content: JSON.stringify(content),
    });
    console.log('📸 快照已保存');
  }, 15000);
});
```

**验证**:
- [ ] 编辑后 15 秒自动保存
- [ ] 控制台输出 "📸 快照已保存"
- [ ] 数据库中能看到更新

---

## 🟡 下周完成 (MEDIUM PRIORITY)

### ☐ 6. 实现 WebSocket 传输层
**文件**: 新建 `src/core/sync-transport.ts`  
**预计**: 4-8小时

```typescript
class WebSocketTransport {
  async broadcast(changes: DatabaseChange[]): Promise<void>
  async receive(): Promise<DatabaseChange[]>
}
```

**子任务**:
- [ ] 设计传输接口
- [ ] 实现 WebSocket 客户端
- [ ] 实现重连机制
- [ ] 处理错误和超时

---

### ☐ 7. 集成网络层到 SyncCoordinator
**文件**: `src/core/sync-coordinator.ts`  
**预计**: 2小时

```typescript
private async broadcastBatch(changes: DatabaseChange[]) {
  await this.transport.broadcast(changes);
}

private async receiveRemoteChanges() {
  return await this.transport.receive();
}
```

**验证**:
- [ ] 两个设备能互相同步
- [ ] 网络中断后能重连
- [ ] 冲突自动解决

---

### ☐ 8. 添加同步状态 UI
**文件**: 新建 `src/components/SyncStatusIndicator.vue`  
**预计**: 2小时

**功能**:
- [ ] 显示实时状态（编辑中/空闲/同步中）
- [ ] 显示变更数量和存储占用
- [ ] 手动同步按钮
- [ ] 手动清理按钮

---

## 🟢 后续优化 (LOW PRIORITY)

### ☐ 9. 性能监控
- [ ] 记录同步耗时
- [ ] 记录网络流量
- [ ] 导出性能报告

### ☐ 10. 多人协作优化
- [ ] 智能同步频率
- [ ] 冲突可视化

### ☐ 11. 离线模式
- [ ] 检测网络状态
- [ ] 离线队列管理
- [ ] 重连自动同步

---

## 📋 当前进度

```
总任务: 11 个
已完成: 0 个 (0%)
进行中: 0 个
待开始: 11 个

本周目标: 完成任务 1-5 (5个)
下周目标: 完成任务 6-8 (3个)
```

---

## 🎯 里程碑

### Milestone 1: 基础功能 ✅
- [x] SyncCoordinator 实现
- [x] 变更清理机制
- [x] 配置优化
- [x] 完整文档

### Milestone 2: 本地集成 (本周)
- [ ] IndexedDB 集成
- [ ] 协调器初始化
- [ ] IPC 接口
- [ ] 快照保存

### Milestone 3: 网络同步 (下周)
- [ ] WebSocket 传输
- [ ] 跨设备同步
- [ ] 状态 UI

### Milestone 4: 完善优化 (后续)
- [ ] 性能监控
- [ ] 多人优化
- [ ] 离线模式

---

## 🔗 相关文档

- 📖 [完整实现进度](./SYNC_IMPLEMENTATION_PROGRESS.md)
- 📚 [最佳实践指南](./SYNC_BEST_PRACTICES.md)
- ⚡ [快速参考](./SYNC_QUICK_REFERENCE.md)
- 🧹 [清理机制指南](./CRSQLITE_CLEANUP_GUIDE.md)

---

**开始时间**: 2025-10-18  
**预计完成**: Milestone 2 (2025-10-25)  
**最后更新**: 2025-10-18
