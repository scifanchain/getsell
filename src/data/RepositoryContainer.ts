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
import { PrismaWorkRepository } from './prisma/WorkRepository';
import { PrismaChapterRepository } from './prisma/ChapterRepository';
import { PrismaContentRepository } from './prisma/ContentRepository';
import { PrismaStatsRepository } from './prisma/StatsRepository';

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
            this._workRepository = new PrismaWorkRepository(this.prisma);
        }
        return this._workRepository;
    }

    /**
     * 获取章节 Repository
     */
    get chapterRepository(): IChapterRepository {
        if (!this._chapterRepository) {
            this._chapterRepository = new PrismaChapterRepository(this.prisma);
        }
        return this._chapterRepository;
    }

    /**
     * 获取内容 Repository
     */
    get contentRepository(): IContentRepository {
        if (!this._contentRepository) {
            this._contentRepository = new PrismaContentRepository(this.prisma);
        }
        return this._contentRepository;
    }

    /**
     * 获取统计 Repository
     */
    get statsRepository(): IStatsRepository {
        if (!this._statsRepository) {
            this._statsRepository = new PrismaStatsRepository(this.prisma);
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