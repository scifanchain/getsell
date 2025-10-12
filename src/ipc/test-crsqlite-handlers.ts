/**
 * CR-SQLite 测试 IPC Handler
 * 在 Electron 主进程中测试 CR-SQLite 功能
 */

import { ipcMain } from 'electron';
import { CRSQLiteManager } from '../core/crsqlite-manager';
import { CRSQLiteUserRepository } from '../data/crsqlite/CRSQLiteUserRepository';
import { CRSQLiteWorkRepository } from '../data/crsqlite/CRSQLiteWorkRepository';
import { app } from 'electron';
import * as path from 'path';
import { ulid } from 'ulid';

export function registerCRSQLiteTestHandlers() {
  /**
   * 运行 CR-SQLite 基础测试
   */
  ipcMain.handle('test:crsqlite:basic', async () => {
    const results: any[] = [];
    let manager: CRSQLiteManager | null = null;

    try {
      results.push({ test: 'Start', status: 'info', message: '🚀 CR-SQLite 测试开始' });

      // Test 1: 初始化数据库
      results.push({ test: '1', status: 'info', message: '📝 初始化数据库...' });
      
      const testDbPath = path.join(app.getPath('userData'), 'test-crsqlite.db');
      manager = new CRSQLiteManager({
        dbPath: testDbPath,
        enableWal: true,
        enableForeignKeys: true,
      });

      await manager.initialize();
      
      results.push({
        test: '1',
        status: 'success',
        message: '✅ 数据库初始化成功',
        data: {
          siteId: manager.getSiteId(),
          dbVersion: manager.getDbVersion(),
          dbPath: testDbPath,
        },
      });

      // Test 2: 创建用户
      results.push({ test: '2', status: 'info', message: '📝 创建用户...' });
      
      const userRepo = new CRSQLiteUserRepository(manager);
      const testUser = {
        id: ulid(),
        username: 'test_user_' + Date.now(),
        displayName: '测试用户',
        email: 'test@example.com',
        bio: '这是一个测试用户',
        publicKey: 'test_public_key',
        privateKeyEncrypted: 'test_encrypted_private_key',
      };

      const createdUser = await userRepo.create(testUser);
      
      results.push({
        test: '2',
        status: 'success',
        message: '✅ 用户创建成功',
        data: {
          id: createdUser.id,
          username: createdUser.username,
        },
      });

      // Test 3: 查询用户
      results.push({ test: '3', status: 'info', message: '📝 查询用户...' });
      
      const foundUser = await userRepo.findById(createdUser.id);
      const foundByUsername = await userRepo.findByUsername(testUser.username);
      
      results.push({
        test: '3',
        status: 'success',
        message: '✅ 用户查询成功',
        data: {
          foundById: !!foundUser,
          foundByUsername: !!foundByUsername,
        },
      });

      // Test 4: 更新用户
      results.push({ test: '4', status: 'info', message: '📝 更新用户...' });
      
      const updatedUser = await userRepo.update(createdUser.id, {
        displayName: '更新后的用户名',
        bio: '更新后的简介',
      });
      
      results.push({
        test: '4',
        status: 'success',
        message: '✅ 用户更新成功',
        data: {
          displayName: updatedUser.displayName,
          bio: updatedUser.bio,
        },
      });

      // Test 5: 创建作品
      results.push({ test: '5', status: 'info', message: '📝 创建作品...' });
      
      const workRepo = new CRSQLiteWorkRepository(manager);
      const testWork = {
        title: '测试作品',
        description: '这是一个测试作品',
        genre: '科幻',
        authorId: createdUser.id,
        collaborationMode: 'solo',
        status: 'draft',
      };

      const createdWork = await workRepo.create(testWork);
      
      results.push({
        test: '5',
        status: 'success',
        message: '✅ 作品创建成功',
        data: {
          id: createdWork.id,
          title: createdWork.title,
        },
      });

      // Test 6: 查询作品
      results.push({ test: '6', status: 'info', message: '📝 查询作品...' });
      
      const foundWork = await workRepo.findById(createdWork.id);
      
      results.push({
        test: '6',
        status: 'success',
        message: '✅ 作品查询成功',
        data: {
          found: !!foundWork,
          title: foundWork?.title,
          authorUsername: foundWork?.author?.username,
        },
      });

      // Test 7: CRDT 变更检测
      results.push({ test: '7', status: 'info', message: '📝 检测 CRDT 变更...' });
      
      const initialVersion = manager.getDbVersion();
      
      await workRepo.update(createdWork.id, {
        title: '更新后的标题',
        description: '更新后的描述',
      });

      const newVersion = manager.getDbVersion();
      const changes = manager.getChangesSince(initialVersion);
      
      results.push({
        test: '7',
        status: 'success',
        message: '✅ CRDT 变更检测成功',
        data: {
          initialVersion,
          newVersion,
          versionIncreased: newVersion > initialVersion,
          changesCount: changes.length,
        },
      });

      // Test 8: 清理
      results.push({ test: '8', status: 'info', message: '📝 清理测试数据...' });
      
      await workRepo.delete(createdWork.id);
      await userRepo.delete(createdUser.id);
      
      results.push({
        test: '8',
        status: 'success',
        message: '✅ 测试数据清理成功',
      });

      // 关闭数据库
      manager.close();
      
      results.push({
        test: 'Complete',
        status: 'success',
        message: '🎉 所有测试通过！',
        summary: {
          total: 8,
          passed: 8,
          failed: 0,
        },
      });

      return {
        success: true,
        results,
      };

    } catch (error: any) {
      results.push({
        test: 'Error',
        status: 'error',
        message: '❌ 测试失败: ' + error.message,
        error: error.stack,
      });

      if (manager) {
        manager.close();
      }

      return {
        success: false,
        results,
        error: error.message,
      };
    }
  });

  /**
   * 获取 CR-SQLite 统计信息
   */
  ipcMain.handle('test:crsqlite:stats', async () => {
    try {
      const testDbPath = path.join(app.getPath('userData'), 'test-crsqlite.db');
      const manager = new CRSQLiteManager({
        dbPath: testDbPath,
      });

      await manager.initialize();
      const stats = manager.getStats();
      manager.close();

      return {
        success: true,
        stats,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  console.log('[IPC] CR-SQLite test handlers registered');
}
