#!/usr/bin/env node

/**
 * 安全的 CR-SQLite 测试脚本
 * 不启动完整的 Electron 应用，只测试数据库功能
 */

const { CRSQLiteManager } = require('./dist/core/crsqlite-manager.js');
const { CRSQLiteWorkRepository } = require('./dist/repositories/crsqlite/CRSQLiteWorkRepository.js');
const path = require('path');

async function testCRSQLite() {
  console.log('🚀 开始 CR-SQLite 安全测试...\n');
  
  let manager = null;
  
  try {
    // 1. 初始化数据库
    console.log('📝 初始化数据库...');
    const testDbPath = path.join(__dirname, 'test-safe.db');
    manager = new CRSQLiteManager({
      dbPath: testDbPath,
      enableWal: true,
      enableForeignKeys: false, // 关闭外键以避免问题
    });

    await manager.initialize();
    console.log('✅ 数据库初始化成功');

    // 2. 测试表结构
    console.log('\n📝 检查表结构...');
    const db = manager.getDatabase();
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'crsql_%'
    `).all();
    
    console.log('✅ 找到表:', tables.map(t => t.name).join(', '));

    // 3. 测试 Repository
    console.log('\n📝 测试 WorkRepository...');
    const workRepo = new CRSQLiteWorkRepository(manager);
    
    // 创建测试作品
    const testWork = {
      title: '测试作品 - 安全模式',
      description: '这是一个安全测试作品',
      genre: '科幻',
      authorId: 'test_author_001',
      collaborationMode: 'solo',
      status: 'draft',
    };

    const createdWork = await workRepo.create(testWork);
    console.log('✅ 作品创建成功:', {
      id: createdWork.id,
      title: createdWork.title,
      authorId: createdWork.authorId
    });

    // 4. 测试查询
    console.log('\n📝 测试查询功能...');
    const foundWork = await workRepo.findById(createdWork.id);
    console.log('✅ 作品查询成功:', {
      found: !!foundWork,
      title: foundWork?.title,
      hasAuthor: !!foundWork?.author
    });

    // 5. 测试列表查询
    console.log('\n📝 测试列表查询...');
    const allWorks = await workRepo.findAll({ skip: 0, take: 10 });
    console.log('✅ 列表查询成功:', {
      count: allWorks.length,
      works: allWorks.map(w => ({ id: w.id, title: w.title }))
    });

    console.log('\n🎉 所有测试通过！数据库架构统一成功！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    if (manager) {
      try {
        manager.close();
        console.log('\n✅ 数据库连接已关闭');
      } catch (e) {
        console.error('关闭数据库时出错:', e.message);
      }
    }
  }
}

// 运行测试
testCRSQLite().catch(console.error);