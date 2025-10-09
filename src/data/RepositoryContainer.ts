import { PrismaClient } from '../generated/prisma';
import { DatabaseManager } from '../core/database';
import { 
    IUserRepository, 
    IWorkRepository, 
    IChapterRepository, 
    IContentRepository, 
    IStatsRepository 
} from './interfaces';
import { PrismaUserRepository } from './prisma/UserRepository';

/**
 * Repository 容器
 * 负责创建和管理所有 Repository 实例
 */
export class RepositoryContainer {
    private databaseManager: DatabaseManager;
    private prisma: PrismaClient;

    // Repository 实例
    private _userRepository?: IUserRepository;
    private _workRepository?: IWorkRepository;
    private _chapterRepository?: IChapterRepository;
    private _contentRepository?: IContentRepository;
    private _statsRepository?: IStatsRepository;

    constructor(databaseManager: DatabaseManager) {
        this.databaseManager = databaseManager;
        this.prisma = databaseManager.getClient();
    }

    /**
     * 获取用户 Repository
     */
    get userRepository(): IUserRepository {
        if (!this._userRepository) {
            this._userRepository = new PrismaUserRepository(this.prisma);
        }
        return this._userRepository;
    }

    /**
     * 获取作品 Repository
     */
    get workRepository(): IWorkRepository {
        if (!this._workRepository) {
            // TODO: 实现 PrismaWorkRepository
            throw new Error('WorkRepository 尚未实现');
        }
        return this._workRepository;
    }

    /**
     * 获取章节 Repository
     */
    get chapterRepository(): IChapterRepository {
        if (!this._chapterRepository) {
            // TODO: 实现 PrismaChapterRepository
            throw new Error('ChapterRepository 尚未实现');
        }
        return this._chapterRepository;
    }

    /**
     * 获取内容 Repository
     */
    get contentRepository(): IContentRepository {
        if (!this._contentRepository) {
            // TODO: 实现 PrismaContentRepository
            throw new Error('ContentRepository 尚未实现');
        }
        return this._contentRepository;
    }

    /**
     * 获取统计 Repository
     */
    get statsRepository(): IStatsRepository {
        if (!this._statsRepository) {
            // TODO: 实现 PrismaStatsRepository
            throw new Error('StatsRepository 尚未实现');
        }
        return this._statsRepository;
    }

    /**
     * 获取数据库管理器
     */
    get database(): DatabaseManager {
        return this.databaseManager;
    }
}