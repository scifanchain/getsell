/**
 * CR-SQLite 简单测试（JavaScript 版本）
 * 直接运行编译后的代码，不依赖 tsx
 */

const path = require('path');
const fs = require('fs');

// Mock Electron app
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return path.join(__dirname, '../temp/test-user-data');
    }
    return path.join(__dirname, '../temp');
  },
  getAppPath: () => path.join(__dirname, '..')
};

// 替换 electron 模块
require.cache[require.resolve('electron')] = {
  exports: { app: mockApp }
};

const { CRSQLiteManager } = require('../dist/core/crsqlite-manager');

const TEST_DB_PATH = path.join(__dirname, '../temp/test-crsqlite-simple.db');

// 清理
function cleanup() {
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // 清理 CR-SQLite 的时钟表
    const clockPath = TEST_DB_PATH + '__crsql_clock';
    if (fs.existsSync(clockPath)) {
      fs.unlinkSync(clockPath);
    }
    console.log('✅ 清理完成');
  } catch (error) {
    console.log('⚠️ 清理跳过:', error.message);
  }
}

async function runTest() {
  console.log('🚀 CR-SQLite 简单测试开始...\n');

  cleanup();

  try {
    // 测试 1: 初始化
    console.log('📝 Test 1: 初始化数据库');
    const manager = new CRSQLiteManager({
      dbPath: TEST_DB_PATH,
    });

    await manager.initialize();
    console.log('✅ 数据库初始化成功');
    console.log('   Site ID:', manager.getSiteId());
    console.log('   DB Path:', manager.getDbPath());

    // 测试 2: 获取数据库版本
    console.log('\n📝 Test 2: 获取数据库版本');
    const version = manager.getDbVersion();
    console.log('✅ 数据库版本:', version);

    // 测试 3: 执行简单查询
    console.log('\n📝 Test 3: 执行简单查询');
    const db = manager.getDatabase();
    
    // 插入测试数据
    const stmt = db.prepare(`
      INSERT INTO authors (id, username, display_name, total_works, total_words, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = Date.now();
    stmt.run('test-user-1', 'testuser', 'Test User', 0, 0, 'active', now, now);
    console.log('✅ 插入测试用户成功');

    // 查询测试数据
    const user = db.prepare('SELECT * FROM authors WHERE id = ?').get('test-user-1');
    console.log('✅ 查询用户成功:', {
      username: user.username,
      displayName: user.display_name,
    });

    // 测试 4: 检查 CRDT 是否启用
    console.log('\n📝 Test 4: 检查 CRDT 是否启用');
    const tables = db.prepare(`
      SELECT tbl_name FROM sqlite_master 
      WHERE type='table' AND name LIKE '%__crsql_clock'
    `).all();
    
    console.log('✅ CRDT 已启用的表:', tables.map(t => t.tbl_name.replace('__crsql_clock', '')).join(', '));

    // 测试 5: 获取变更
    console.log('\n📝 Test 5: 获取变更');
    const changes = manager.getChangesSince(0);
    console.log('✅ 变更数量:', changes.length);
    if (changes.length > 0) {
      console.log('   第一个变更:', {
        table: changes[0].table,
        pk: changes[0].pk,
        db_version: changes[0].db_version,
      });
    }

    // 测试 6: 统计信息
    console.log('\n📝 Test 6: 获取统计信息');
    const stats = manager.getStats();
    console.log('✅ 统计信息:', {
      siteId: stats.siteId,
      dbVersion: stats.dbVersion,
      isInitialized: stats.isInitialized,
    });

    // 关闭数据库
    manager.close();
    console.log('\n✅ 数据库已关闭');

    console.log('\n🎉 所有测试通过！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

runTest();
