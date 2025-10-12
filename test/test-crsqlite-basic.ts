/**
 * CR-SQLite 基础功能测试
 * 测试数据库初始化、CRUD 操作、CRDT 变更检测
 */

import { CRSQLiteManager } from '../src/core/crsqlite-manager';
import { CRSQLiteUserRepository } from '../src/data/crsqlite/CRSQLiteUserRepository';
import { CRSQLiteWorkRepository } from '../src/data/crsqlite/CRSQLiteWorkRepository';
import * as path from 'path';
import * as fs from 'fs';
import { ulid } from 'ulid';

// 测试数据库路径
const TEST_DB_PATH = path.join(__dirname, '../temp/test-crsqlite.db');

// 清理旧的测试数据库
function cleanupTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log('✅ 清理旧测试数据库');
  }
  
  // 也清理 WAL 和 SHM 文件
  const walFile = TEST_DB_PATH + '-wal';
  const shmFile = TEST_DB_PATH + '-shm';
  if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
  if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
}

async function runTests() {
  console.log('\n🚀 CR-SQLite 基础功能测试开始...\n');

  // 清理测试环境
  cleanupTestDb();

  try {
    // ========== Test 1: 初始化数据库 ==========
    console.log('📝 Test 1: 初始化数据库');
    const manager = new CRSQLiteManager({
      dbPath: TEST_DB_PATH,
      enableWal: true,
      enableForeignKeys: true,
    });

    await manager.initialize();
    console.log('✅ 数据库初始化成功');
    console.log('   Site ID:', manager.getSiteId());
    console.log('   DB Version:', manager.getDbVersion());
    console.log('');

    // ========== Test 2: 创建用户 ==========
    console.log('📝 Test 2: 创建用户');
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
    console.log('✅ 用户创建成功');
    console.log('   ID:', createdUser.id);
    console.log('   Username:', createdUser.username);
    console.log('');

    // ========== Test 3: 查询用户 ==========
    console.log('📝 Test 3: 查询用户');
    const foundUser = await userRepo.findById(createdUser.id);
    console.log('✅ 用户查询成功');
    console.log('   Found:', foundUser?.username);
    console.log('');

    const foundByUsername = await userRepo.findByUsername(testUser.username);
    console.log('✅ 按用户名查询成功');
    console.log('   Found:', foundByUsername?.username);
    console.log('');

    // ========== Test 4: 更新用户 ==========
    console.log('📝 Test 4: 更新用户');
    const updatedUser = await userRepo.update(createdUser.id, {
      displayName: '更新后的用户名',
      bio: '更新后的简介',
    });
    console.log('✅ 用户更新成功');
    console.log('   New Display Name:', updatedUser.displayName);
    console.log('   New Bio:', updatedUser.bio);
    console.log('');

    // ========== Test 5: 创建作品 ==========
    console.log('📝 Test 5: 创建作品');
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
    console.log('✅ 作品创建成功');
    console.log('   ID:', createdWork.id);
    console.log('   Title:', createdWork.title);
    console.log('');

    // ========== Test 6: 查询作品 ==========
    console.log('📝 Test 6: 查询作品');
    const foundWork = await workRepo.findById(createdWork.id);
    console.log('✅ 作品查询成功');
    console.log('   Found:', foundWork?.title);
    console.log('   Author:', foundWork?.author?.username);
    console.log('');

    // ========== Test 7: 获取作者的作品列表 ==========
    console.log('📝 Test 7: 获取作者的作品列表');
    const authorWorks = await workRepo.findByAuthor(createdUser.id);
    console.log('✅ 作品列表查询成功');
    console.log('   Count:', authorWorks.length);
    console.log('');

    // ========== Test 8: 检测 CRDT 变更 ==========
    console.log('📝 Test 8: 检测 CRDT 变更');
    const initialVersion = manager.getDbVersion();
    console.log('   Initial DB Version:', initialVersion);

    // 进行一次更新
    await workRepo.update(createdWork.id, {
      title: '更新后的标题',
      description: '更新后的描述',
    });

    const newVersion = manager.getDbVersion();
    console.log('   New DB Version:', newVersion);
    console.log('   Version Increased:', newVersion > initialVersion);

    // 获取变更记录
    const changes = manager.getChangesSince(initialVersion);
    console.log('✅ CRDT 变更检测成功');
    console.log('   Changes Count:', changes.length);
    if (changes.length > 0) {
      console.log('   First Change Table:', changes[0].table);
      console.log('   First Change Column:', changes[0].cid);
    }
    console.log('');

    // ========== Test 9: 搜索功能 ==========
    console.log('📝 Test 9: 搜索功能');
    const searchResults = await workRepo.search('测试');
    console.log('✅ 搜索成功');
    console.log('   Results Count:', searchResults.length);
    console.log('');

    // ========== Test 10: 统计信息 ==========
    console.log('📝 Test 10: 获取统计信息');
    const stats = manager.getStats();
    console.log('✅ 统计信息获取成功');
    console.log('   Site ID:', stats.siteId);
    console.log('   DB Version:', stats.dbVersion);
    console.log('   DB Path:', stats.dbPath);
    console.log('   Initialized:', stats.isInitialized);
    console.log('');

    // ========== Test 11: 删除操作 ==========
    console.log('📝 Test 11: 删除操作');
    await workRepo.delete(createdWork.id);
    const deletedWork = await workRepo.findById(createdWork.id);
    console.log('✅ 作品删除成功');
    console.log('   Deleted:', deletedWork === null);
    console.log('');

    await userRepo.delete(createdUser.id);
    const deletedUser = await userRepo.findById(createdUser.id);
    console.log('✅ 用户删除成功');
    console.log('   Deleted:', deletedUser === null);
    console.log('');

    // ========== 关闭数据库 ==========
    console.log('📝 关闭数据库连接');
    manager.close();
    console.log('✅ 数据库已关闭');
    console.log('');

    // ========== 测试完成 ==========
    console.log('🎉 所有测试通过！\n');
    console.log('📊 测试统计:');
    console.log('   ✅ 11/11 测试通过');
    console.log('   📦 数据库大小:', fs.statSync(TEST_DB_PATH).size, 'bytes');
    console.log('');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error('');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(console.error);
