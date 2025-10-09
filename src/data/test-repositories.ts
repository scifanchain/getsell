/**
 * Repository 层测试脚本
 * 用于验证所有 Repository 实现是否正常工作
 */

import { DatabaseManager } from '../core/database';
import { RepositoryContainer } from './RepositoryContainer';
import { ulid } from 'ulid';

async function testRepositories() {
    console.log('🧪 开始测试 Repository 层...');
    
    try {
        // 初始化数据库和容器
        const dbManager = new DatabaseManager();
        await dbManager.connect();
        
        const container = new RepositoryContainer(dbManager);
        
        console.log('✅ 数据库连接成功');
        
        // 测试用户 Repository
        await testUserRepository(container);
        
        // 测试作品 Repository
        await testWorkRepository(container);
        
        // 测试章节 Repository
        await testChapterRepository(container);
        
        // 测试内容 Repository
        await testContentRepository(container);
        
        // 测试统计 Repository
        await testStatsRepository(container);
        
        console.log('🎉 所有 Repository 测试通过！');
        
        await dbManager.disconnect();
        
    } catch (error) {
        console.error('❌ Repository 测试失败:', error);
        throw error;
    }
}

async function testUserRepository(container: RepositoryContainer) {
    console.log('📝 测试用户 Repository...');
    
    const userRepo = container.userRepository;
    
    // 测试确保默认用户存在
    await userRepo.ensureDefaultUser();
    console.log('✅ 默认用户检查完成');
}

async function testWorkRepository(container: RepositoryContainer) {
    console.log('📚 测试作品 Repository...');
    
    const workRepo = container.workRepository;
    
    // 验证 Repository 实例化成功
    console.log('✅ 作品 Repository 实例化成功');
}

async function testChapterRepository(container: RepositoryContainer) {
    console.log('📖 测试章节 Repository...');
    
    const chapterRepo = container.chapterRepository;
    
    // 验证 Repository 实例化成功
    console.log('✅ 章节 Repository 实例化成功');
}

async function testContentRepository(container: RepositoryContainer) {
    console.log('📄 测试内容 Repository...');
    
    const contentRepo = container.contentRepository;
    
    // 验证 Repository 实例化成功
    console.log('✅ 内容 Repository 实例化成功');
}

async function testStatsRepository(container: RepositoryContainer) {
    console.log('📊 测试统计 Repository...');
    
    const statsRepo = container.statsRepository;
    
    // 测试获取系统统计
    const systemStats = await statsRepo.getSystemStats();
    console.log('✅ 系统统计:', {
        authors: systemStats.authors,
        works: systemStats.works,
        chapters: systemStats.chapters,
        contents: systemStats.contents
    });
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
    testRepositories().catch(console.error);
}

export { testRepositories };