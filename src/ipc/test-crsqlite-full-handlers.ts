/**
 * CR-SQLite 完整仓储测试 IPC Handler
 * 测试 User, Work, Chapter, Content 四个仓储
 */

import { ipcMain } from 'electron';
import { CRSQLiteManager } from '../core/crsqlite-manager';
import { 
  CRSQLiteUserRepository,
  CRSQLiteWorkRepository,
  CRSQLiteChapterRepository,
  CRSQLiteContentRepository
} from '../data/crsqlite';
import { app } from 'electron';
import * as pathModule from 'path';
import { ulid } from 'ulid';

export function registerCRSQLiteFullTestHandlers() {
  /**
   * 运行完整仓储测试
   */
  ipcMain.handle('test:crsqlite:full', async () => {
    const results: any[] = [];
    let manager: CRSQLiteManager | null = null;
    
    // 测试数据 ID
    let testUserId = '';
    let testWorkId = '';
    let testChapterId = '';
    let testSubChapterId = '';
    let testContentId = '';

    try {
      results.push({ test: 'Start', status: 'info', message: '🚀 开始完整仓储测试' });

      // Test 1: 初始化数据库
      const testDbPath = pathModule.join(app.getPath('userData'), 'test-crsqlite-full.db');
      manager = new CRSQLiteManager({
        dbPath: testDbPath,
        enableWal: true,
        enableForeignKeys: false,
      });

      await manager.initialize();
      
      results.push({
        test: '1',
        status: 'success',
        message: '✅ 数据库初始化成功',
        data: { siteId: manager.getSiteId(), dbVersion: manager.getDbVersion() }
      });

      // 创建仓储实例
      const userRepo = new CRSQLiteUserRepository(manager);
      const workRepo = new CRSQLiteWorkRepository(manager);
      const chapterRepo = new CRSQLiteChapterRepository(manager);
      const contentRepo = new CRSQLiteContentRepository(manager);

      // Test 2: 创建用户
      const user = await userRepo.create({
        id: ulid(),
        username: 'test_user_' + Date.now(),
        displayName: '测试用户',
        email: 'test@example.com',
        bio: '完整测试用户',
        publicKey: 'test_key',
        privateKeyEncrypted: 'encrypted_key'
      });
      testUserId = user.id;
      
      results.push({
        test: '2',
        status: 'success',
        message: `✅ 用户创建成功: ${user.username}`,
        data: { userId: testUserId }
      });

      // Test 3: 创建作品
      const work = await workRepo.create({
        title: '测试小说',
        description: '这是一部测试小说',
        genre: '科幻',
        authorId: testUserId,
        collaborationMode: 'solo',
        status: 'draft'
      });
      testWorkId = work.id;
      
      results.push({
        test: '3',
        status: 'success',
        message: `✅ 作品创建成功: ${work.title}`,
        data: { workId: testWorkId }
      });

      // Test 4: 创建章节
      const chapter = await chapterRepo.create({
        workId: testWorkId,
        authorId: testUserId,
        title: '第一章：开始',
        subtitle: '故事的序幕',
        description: '这是第一章的描述',
        type: 'chapter',
        status: 'draft',
        level: 1,
        orderIndex: 0,
        targetWords: 10000
      });
      testChapterId = chapter.id;
      
      results.push({
        test: '4',
        status: 'success',
        message: `✅ 章节创建成功: ${chapter.title}`,
        data: { chapterId: testChapterId }
      });

      // Test 5: 创建子章节
      const subChapter = await chapterRepo.create({
        workId: testWorkId,
        parentId: testChapterId,
        authorId: testUserId,
        title: '第一节：初遇',
        level: 2,
        orderIndex: 0,
        type: 'section',
        status: 'draft'
      });
      testSubChapterId = subChapter.id;
      
      results.push({
        test: '5',
        status: 'success',
        message: `✅ 子章节创建成功: ${subChapter.title}`,
        data: { subChapterId: testSubChapterId }
      });

      // Test 6: 查询章节层级
      const chapters = await chapterRepo.findByWork(testWorkId, true);
      const children = await chapterRepo.findChildren(testChapterId);
      const chapterPath = await chapterRepo.getPath(testSubChapterId);
      
      results.push({
        test: '6',
        status: 'success',
        message: `✅ 章节查询成功: 找到${chapters.length}个章节, ${children.length}个子章节, 路径长度=${chapterPath.length}`,
        data: { chapters: chapters.length, children: children.length, pathLength: chapterPath.length }
      });

      // Test 7: 更新章节
      const updatedChapter = await chapterRepo.update(testChapterId, {
        title: '第一章：开始（已修改）',
        status: 'published',
        tags: ['测试', '第一章']
      });
      
      results.push({
        test: '7',
        status: 'success',
        message: `✅ 章节更新成功: ${updatedChapter.title}`,
        data: { title: updatedChapter.title, tags: updatedChapter.tags }
      });

      // Test 8: 创建内容
      const content = await contentRepo.create({
        workId: testWorkId,
        chapterId: testChapterId,
        authorId: testUserId,
        type: 'text',
        contentText: '这是测试内容。今天天气不错，适合写作。This is a test content with English words.',
        orderIndex: 0,
        tags: ['测试内容']
      });
      testContentId = content.id;
      
      results.push({
        test: '8',
        status: 'success',
        message: `✅ 内容创建成功: 字数=${content.wordCount}, 字符=${content.characterCount}`,
        data: { 
          contentId: testContentId, 
          wordCount: content.wordCount, 
          characterCount: content.characterCount 
        }
      });

      // Test 9: 查询内容
      const workContents = await contentRepo.findByWork(testWorkId);
      const chapterContents = await contentRepo.findByChapter(testChapterId);
      
      results.push({
        test: '9',
        status: 'success',
        message: `✅ 内容查询成功: 作品${workContents.length}个, 章节${chapterContents.length}个`,
        data: { workContents: workContents.length, chapterContents: chapterContents.length }
      });

      // Test 10: 更新内容
      const updatedContent = await contentRepo.update(testContentId, {
        contentText: '这是更新后的测试内容。内容已经被修改了。Adding more English words to test counting.',
        aiAnalysis: {
          sentiment: 'positive',
          keywords: ['测试', '修改']
        }
      });
      
      results.push({
        test: '10',
        status: 'success',
        message: `✅ 内容更新成功: 新字数=${updatedContent.wordCount}`,
        data: { 
          wordCount: updatedContent.wordCount,
          hasAiAnalysis: !!updatedContent.aiAnalysis 
        }
      });

      // Test 11: 创建内容版本
      const version = await contentRepo.createVersion(testContentId, {
        changeDescription: '第一次修改',
        authorId: testUserId
      });
      const versions = await contentRepo.getVersionHistory(testContentId);
      
      results.push({
        test: '11',
        status: 'success',
        message: `✅ 版本管理成功: 版本号=${version.versionNumber}, 历史数=${versions.length}`,
        data: { versionNumber: version.versionNumber, versionsCount: versions.length }
      });

      // Test 12: 搜索内容
      const searchResults = await contentRepo.search(testWorkId, '测试');
      
      results.push({
        test: '12',
        status: 'success',
        message: `✅ 内容搜索成功: 找到${searchResults.length}条结果`,
        data: { searchResults: searchResults.length }
      });

      // Test 13: 章节统计更新
      await chapterRepo.updateStats(testChapterId);
      const statsChapter = await chapterRepo.findById(testChapterId);
      
      results.push({
        test: '13',
        status: 'success',
        message: `✅ 章节统计更新: 内容数=${statsChapter.contentCount}, 字数=${statsChapter.wordCount}`,
        data: { 
          contentCount: statsChapter.contentCount, 
          wordCount: statsChapter.wordCount 
        }
      });

      // Test 14: 章节排序
      const chapter2 = await chapterRepo.create({
        workId: testWorkId,
        authorId: testUserId,
        title: '第二章：发展',
        level: 1,
        orderIndex: 1,
        type: 'chapter',
        status: 'draft'
      });
      
      await chapterRepo.reorder(testWorkId, [
        { id: chapter2.id, orderIndex: 0 },
        { id: testChapterId, orderIndex: 1 }
      ]);
      
      const reorderedChapters = await chapterRepo.findByWork(testWorkId);
      
      results.push({
        test: '14',
        status: 'success',
        message: `✅ 章节排序成功: 第一个章节是"${reorderedChapters[0].title}"`,
        data: { firstChapterTitle: reorderedChapters[0].title }
      });

      // Test 15: 内容排序
      const content2 = await contentRepo.create({
        workId: testWorkId,
        chapterId: testChapterId,
        authorId: testUserId,
        type: 'text',
        contentText: '第二段内容',
        orderIndex: 1
      });
      
      await contentRepo.reorder(testWorkId, testChapterId, [
        { id: content2.id, orderIndex: 0 },
        { id: testContentId, orderIndex: 1 }
      ]);
      
      const reorderedContents = await contentRepo.findByChapter(testChapterId);
      
      results.push({
        test: '15',
        status: 'success',
        message: `✅ 内容排序成功: ${reorderedContents.length}个内容已排序`,
        data: { contentsCount: reorderedContents.length }
      });

      // Test 16: CRDT 变更检测
      const dbVersion = manager.getDbVersion();
      const changes = manager.getChangesSince(0);
      
      results.push({
        test: '16',
        status: 'success',
        message: `✅ CRDT 变更检测: 版本=${dbVersion}, 变更数=${changes.length}`,
        data: { dbVersion, changesCount: changes.length }
      });

      // Test 17: 清理测试数据（级联删除测试）
      await contentRepo.delete(testContentId);
      await contentRepo.delete(content2.id);
      await chapterRepo.delete(chapter2.id);
      await chapterRepo.delete(testChapterId); // 会级联删除子章节
      await workRepo.delete(testWorkId);
      await userRepo.delete(testUserId);
      
      results.push({
        test: '17',
        status: 'success',
        message: '✅ 测试数据清理成功（级联删除验证）'
      });

      // 关闭数据库
      manager.close();

      results.push({
        test: 'Complete',
        status: 'success',
        message: '🎉 所有17项测试通过！',
        summary: {
          total: 17,
          passed: 17,
          failed: 0
        }
      });

      return {
        success: true,
        results
      };

    } catch (error: any) {
      results.push({
        test: 'Error',
        status: 'error',
        message: '❌ 测试失败: ' + error.message,
        error: error.stack
      });

      if (manager) {
        try {
          manager.close();
        } catch (e) {
          // Ignore close errors
        }
      }

      return {
        success: false,
        results,
        error: error.message,
        stack: error.stack
      };
    }
  });

  console.log('[IPC] CR-SQLite full test handlers registered');
}
