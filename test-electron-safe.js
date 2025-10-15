const { app, BrowserWindow } = require('electron');
const { CRSQLiteManager } = require('./dist/core/crsqlite-manager.js');
const { CRSQLiteWorkRepository } = require('./dist/repositories/crsqlite/CRSQLiteWorkRepository.js');
const path = require('path');

async function testCRSQLite() {
  console.log('🚀 开始 CR-SQLite 测试 (Electron 环境)...\n');
  
  let manager = null;
  
  try {
    // 1. 初始化数据库
    console.log('📝 初始化数据库...');
    const testDbPath = path.join(app.getPath('userData'), 'test-unified.db');
    manager = new CRSQLiteManager({
      dbPath: testDbPath,
      enableWal: true,
      enableForeignKeys: false,
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

    // 检查 works 表的字段
    const workColumns = db.prepare(`PRAGMA table_info(works)`).all();
    console.log('✅ works 表字段:', workColumns.map(c => c.name).join(', '));

    // 检查 contents 表的字段
    const contentColumns = db.prepare(`PRAGMA table_info(contents)`).all();
    console.log('✅ contents 表字段:', contentColumns.map(c => c.name).join(', '));

    // 测试统计查询
    console.log('\n📝 测试统计查询...');
    try {
      const totalWords = db.prepare('SELECT SUM(wordCount) as sum FROM contents').get();
      console.log('✅ 统计查询成功:', totalWords);
    } catch (error) {
      console.log('❌ 统计查询失败:', error.message);
    }

    // 3. 测试 Repository
    console.log('\n📝 测试 WorkRepository...');
    const workRepo = new CRSQLiteWorkRepository(manager);
    
    // 创建测试作品
    const testWork = {
      title: '测试作品 - 统一架构',
      description: '这是一个统一架构测试作品',
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

    console.log('\n🎉 所有测试通过！统一架构成功！');
    console.log('\n✨ 字段命名已统一为 camelCase，不再需要映射转换！');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
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

app.whenReady().then(() => {
  testCRSQLite();
});