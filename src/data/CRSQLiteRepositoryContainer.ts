import { CRSQLiteManager } from '../core/crsqlite-manager';
import { 
    IUserRepository, 
    IWorkRepository, 
    IChapterRepository, 
    IContentRepository, 
    IStatsRepository 
} from './interfaces';
import { CRSQLiteUserRepository } from './crsqlite/CRSQLiteUserRepository';
import { CRSQLiteWorkRepository } from './crsqlite/CRSQLiteWorkRepository';
import { CRSQLiteChapterRepository } from './crsqlite/CRSQLiteChapterRepository';
import { CRSQLiteContentRepository } from './crsqlite/CRSQLiteContentRepository';
import { CRSQLiteCollaborationRepository } from './crsqlite/CRSQLiteCollaborationRepository';

export interface ICollaborationRepository {
    saveDocument(data: any): Promise<any>;
    findById(id: string): Promise<any | null>;
    findByContentId(contentId: string): Promise<any | null>;
    delete(id: string): Promise<void>;
}

/**
 * CR-SQLite Repository 容器
 * 负责创建和管理所有基于 CR-SQLite 的 Repository 实例
 * 
 * 完全使用 CR-SQLite,包括 Yjs 协作功能
 */
export class CRSQLiteRepositoryContainer {
    private crsqliteManager: CRSQLiteManager;

    // Repository 实例
    private _userRepository?: IUserRepository;
    private _workRepository?: IWorkRepository;
    private _chapterRepository?: IChapterRepository;
    private _contentRepository?: IContentRepository;
    private _statsRepository?: IStatsRepository;
    private _collaborationRepository?: ICollaborationRepository;

    constructor(crsqliteManager: CRSQLiteManager) {
        this.crsqliteManager = crsqliteManager;
    }

    /**
     * 获取用户 Repository (CR-SQLite)
     */
    get userRepository(): IUserRepository {
        if (!this._userRepository) {
            this._userRepository = new CRSQLiteUserRepository(this.crsqliteManager);
        }
        return this._userRepository;
    }

    /**
     * 获取作品 Repository (CR-SQLite)
     */
    get workRepository(): IWorkRepository {
        if (!this._workRepository) {
            this._workRepository = new CRSQLiteWorkRepository(this.crsqliteManager);
        }
        return this._workRepository;
    }

    /**
     * 获取章节 Repository (CR-SQLite)
     */
    get chapterRepository(): IChapterRepository {
        if (!this._chapterRepository) {
            this._chapterRepository = new CRSQLiteChapterRepository(this.crsqliteManager);
        }
        return this._chapterRepository;
    }

    /**
     * 获取内容 Repository (CR-SQLite)
     */
    get contentRepository(): IContentRepository {
        if (!this._contentRepository) {
            this._contentRepository = new CRSQLiteContentRepository(this.crsqliteManager);
        }
        return this._contentRepository;
    }

    /**
     * 获取统计 Repository (CR-SQLite)
     * 提供基于 CR-SQLite 仓储的统计功能
     */
    get statsRepository(): IStatsRepository {
        if (!this._statsRepository) {
            // 实现统计仓储
            this._statsRepository = {
                getSystemStats: async () => {
                    // 系统级统计
                    const db = this.crsqliteManager.getDatabase();
                    const authorsCount = db.prepare('SELECT COUNT(*) as count FROM authors').get() as { count: number };
                    const worksCount = db.prepare('SELECT COUNT(*) as count FROM works').get() as { count: number };
                    const chaptersCount = db.prepare('SELECT COUNT(*) as count FROM chapters').get() as { count: number };
                    const contentsCount = db.prepare('SELECT COUNT(*) as count FROM contents').get() as { count: number };
                    const totalWords = db.prepare('SELECT SUM(word_count) as sum FROM contents').get() as { sum: number | null };
                    const totalChars = db.prepare('SELECT SUM(character_count) as sum FROM contents').get() as { sum: number | null };
                    
                    return {
                        authors: authorsCount.count,
                        works: worksCount.count,
                        chapters: chaptersCount.count,
                        contents: contentsCount.count,
                        characters: 0, // TODO: 实现角色统计
                        worldbuilding: 0, // TODO: 实现世界观统计
                        chapter_levels: {}, // TODO: 实现章节层级统计
                        content_stats: {
                            total_words: totalWords.sum || 0,
                            total_characters: totalChars.sum || 0,
                            total_contents: contentsCount.count
                        }
                    };
                },
                getUserStats: async (userId: string) => {
                    const works = await this.workRepository.findByAuthor(userId);
                    let totalWords = 0;
                    let totalCharacters = 0;
                    let totalChapters = 0;
                    
                    for (const work of works) {
                        totalWords += work.totalWords || 0;
                        totalCharacters += work.totalCharacters || 0;
                        const chapters = await this.chapterRepository.findByWork(work.id);
                        totalChapters += chapters.length;
                    }
                    
                    return {
                        totalWorks: works.length,
                        totalChapters,
                        totalWords,
                        totalCharacters
                    };
                },
                getWorkStats: async (workId: string) => {
                    const work = await this.workRepository.findById(workId);
                    const chapters = await this.chapterRepository.findByWork(workId);
                    const contents = await this.contentRepository.findByWork(workId);
                    
                    return {
                        chapterCount: chapters.length,
                        contentCount: contents.length,
                        totalWords: work?.totalWords || 0,
                        totalCharacters: work?.totalCharacters || 0,
                        lastUpdated: work?.updatedAt || new Date()
                    };
                },
                refreshWorkStats: async (workId: string) => {
                    // CR-SQLite 中统计实时计算,无需刷新缓存
                    return;
                },
                getActivityStats: async (userId: string, startDate: Date, endDate: Date) => {
                    // TODO: 实现活动统计
                    return {
                        dailyWordCounts: [],
                        totalWords: 0,
                        activeDays: 0
                    };
                }
            };
        }
        return this._statsRepository;
    }

    /**
     * 获取协同编辑 Repository (使用 CR-SQLite)
     */
    get collaborationRepository(): ICollaborationRepository {
        if (!this._collaborationRepository) {
            this._collaborationRepository = new CRSQLiteCollaborationRepository(
                this.crsqliteManager
            );
        }
        return this._collaborationRepository;
    }

    /**
     * 获取 CR-SQLite 管理器
     */
    get crsqlite(): CRSQLiteManager {
        return this.crsqliteManager;
    }

    /**
     * 关闭所有数据库连接
     */
    async close(): Promise<void> {
        this.crsqliteManager.close();
    }
}
