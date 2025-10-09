/**
 * 简化的服务层集成测试
 * 测试整个架构是否正常工作
 */

import { ServiceContainer } from '../../src/services/ServiceContainer';
import { RepositoryContainer } from '../../src/data/RepositoryContainer';
import { DatabaseManager } from '../../src/core/database';

// Mock Prisma Client
const mockPrismaClient = {
    author: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn()
    },
    work: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn()
    },
    chapter: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn()
    },
    content: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn()
};

describe('服务层架构集成测试', () => {
    let databaseManager: DatabaseManager;
    let repositories: RepositoryContainer;
    let services: ServiceContainer;

    beforeEach(() => {
        // 创建 DatabaseManager 实例（但不实际连接数据库）
        databaseManager = new DatabaseManager();
        // 模拟已连接状态
        (databaseManager as any).prisma = mockPrismaClient;
        (databaseManager as any).connected = true;

        // 创建 Repository 容器
        repositories = new RepositoryContainer(databaseManager);

        // 创建 Service 容器
        services = new ServiceContainer(repositories);
    });

    describe('架构完整性测试', () => {
        it('应该正确初始化所有服务', () => {
            // 验证服务容器能正确创建
            expect(services).toBeDefined();
            
            // 验证可以获取所有服务
            expect(services.userService).toBeDefined();
            expect(services.workService).toBeDefined();
            expect(services.chapterService).toBeDefined();
            
            // 验证服务有正确的类型
            expect(typeof services.userService.login).toBe('function');
            expect(typeof services.workService.createWork).toBe('function');
            expect(typeof services.chapterService.createChapter).toBe('function');
        });

        it('应该正确初始化 Repository 容器', () => {
            expect(repositories).toBeDefined();
            expect(repositories.userRepository).toBeDefined();
            expect(repositories.workRepository).toBeDefined();
            expect(repositories.chapterRepository).toBeDefined();
            expect(repositories.contentRepository).toBeDefined();
            expect(repositories.statsRepository).toBeDefined();
        });

        it('应该正确配置依赖注入', () => {
            // 验证服务能访问 Repository
            expect(services.repositoryContainer).toBe(repositories);
            expect(services.cryptoService).toBeDefined();
        });
    });

    describe('UserService 基础功能', () => {
        it('应该能处理用户登录请求', async () => {
            // 模拟数据库返回
            mockPrismaClient.author.findUnique.mockResolvedValue({
                id: 'test_user',
                username: 'testuser',
                status: 'active'
            });

            // 测试登录
            const result = await services.userService.login({
                username: 'testuser'
            });

            expect(result).toBeDefined();
            expect(mockPrismaClient.author.findUnique).toHaveBeenCalled();
        });

        it('应该能处理默认用户初始化', async () => {
            // 模拟数据库返回
            mockPrismaClient.author.findUnique.mockResolvedValue({
                id: 'user_mock_001',
                username: 'default_user'
            });

            const result = await services.userService.initializeDefaultUser();
            expect(result).toBeDefined();
        });
    });

    describe('WorkService 基础功能', () => {
        it('应该能创建作品', async () => {
            // 模拟作者存在
            mockPrismaClient.author.findUnique.mockResolvedValue({
                id: 'test_author',
                username: 'testauthor'
            });

            // 模拟作品创建（包含 author 关联数据）
            mockPrismaClient.work.create.mockResolvedValue({
                id: 'test_work',
                title: '测试作品',
                authorId: 'test_author',
                author: {
                    id: 'test_author',
                    username: 'testauthor',
                    displayName: 'Test Author'
                }
            });

            const result = await services.workService.createWork('test_author', {
                title: '测试作品',
                description: '测试描述'
            });

            expect(result).toBeDefined();
            expect(result.title).toBe('测试作品');
        });
    });

    describe('ChapterService 基础功能', () => {
        it('应该能创建章节', async () => {
            // 模拟作品存在
            mockPrismaClient.work.findUnique.mockResolvedValue({
                id: 'test_work',
                title: '测试作品',
                authorId: 'test_author'
            });

            // 模拟获取同级章节列表为空数组
            mockPrismaClient.chapter.findMany.mockResolvedValue([]);

            // 模拟章节创建
            mockPrismaClient.chapter.create.mockResolvedValue({
                id: 'test_chapter',
                title: '测试章节',
                workId: 'test_work',
                authorId: 'test_author'
            });

            const result = await services.chapterService.createChapter('test_author', {
                workId: 'test_work',
                title: '测试章节',
                authorId: 'test_author'
            });

            expect(result).toBeDefined();
            expect(result.title).toBe('测试章节');
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});