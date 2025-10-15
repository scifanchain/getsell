import { CRSQLiteManager } from '../core/crsqlite-manager';
import { 
    IAuthorRepository, 
    IWorkRepository, 
    IChapterRepository, 
    IContentRepository, 
    IStatsRepository 
} from './interfaces';
import { CRSQLiteAuthorRepository } from './crsqlite/CRSQLiteAuthorRepository';
import { CRSQLiteWorkRepository } from './crsqlite/CRSQLiteWorkRepository';
import { CRSQLiteChapterRepository } from './crsqlite/CRSQLiteChapterRepository';
import { CRSQLiteContentRepository } from './crsqlite/CRSQLiteContentRepository';
import { CRSQLiteCollaborationRepository } from './crsqlite/CRSQLiteCollaborationRepository';

export interface ICollaborationRepository {
    saveDocument(data: any): Promise<any>;
    createCollaborativeDocument(data: any): Promise<any>;
    findById(id: string): Promise<any | null>;
    findByContentId(contentId: string): Promise<any | null>;
    findCollaborativeDocument(contentId: string): Promise<any | null>;
    updateCollaborativeDocument(id: string, data: any): Promise<void>;
    createYjsUpdate(data: any): Promise<void>;
    createSession(data: any): Promise<void>;
    getUpdateStats(documentId: string): Promise<any>;
    delete(id: string): Promise<void>;
}

/**
 * Repository 容器
 * 负责创建和管理所有 Repository 实例
 * 
 * 完全基于 CR-SQLite，统一的 CRDT 数据库解决方案
 */
export class RepositoryContainer {
    private crsqliteManager: CRSQLiteManager;

    // Repository 实例
    private _authorRepository?: IAuthorRepository;
    private _workRepository?: IWorkRepository;
    private _chapterRepository?: IChapterRepository;
    private _contentRepository?: IContentRepository;
    private _statsRepository?: IStatsRepository;
    private _collaborationRepository?: ICollaborationRepository;

    constructor(crsqliteManager: CRSQLiteManager) {
        this.crsqliteManager = crsqliteManager;
    }

    /**
     * 获取作者 Repository
     */
    get authorRepository(): IAuthorRepository {
        if (!this._authorRepository) {
            this._authorRepository = new CRSQLiteAuthorRepository(this.crsqliteManager);
        }
        return this._authorRepository;
    }

    /**
     * 获取作品 Repository
     */
    get workRepository(): IWorkRepository {
        if (!this._workRepository) {
            this._workRepository = new CRSQLiteWorkRepository(this.crsqliteManager);
        }
        return this._workRepository;
    }

    /**
     * 获取章节 Repository
     */
    get chapterRepository(): IChapterRepository {
        if (!this._chapterRepository) {
            this._chapterRepository = new CRSQLiteChapterRepository(this.crsqliteManager);
        }
        return this._chapterRepository;
    }

    /**
     * 获取内容 Repository
     */
    get contentRepository(): IContentRepository {
        if (!this._contentRepository) {
            this._contentRepository = new CRSQLiteContentRepository(this.crsqliteManager);
        }
        return this._contentRepository;
    }

    /**
     * 获取统计 Repository
     * 提供基于 CR-SQLite 的统计功能
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
                    const totalWords = db.prepare('SELECT SUM(wordCount) as sum FROM contents').get() as { sum: number | null };
                    const totalChars = db.prepare('SELECT SUM(characterCount) as sum FROM contents').get() as { sum: number | null };
                    
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
                getAuthorStats: async (authorId: string) => {
                    const works = await this.workRepository.findByAuthor(authorId);
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
                    
                    // 处理 CR-SQLite 时间戳转换
                    let lastUpdated = new Date();
                    if (work?.updatedAt) {
                        // 如果 updatedAt 是数字(Unix 时间戳)，转换为 Date
                        if (typeof work.updatedAt === 'number') {
                            lastUpdated = new Date(work.updatedAt);
                        } else if (work.updatedAt instanceof Date) {
                            lastUpdated = work.updatedAt;
                        }
                    }
                    
                    return {
                        chapterCount: chapters.length,
                        contentCount: contents.length,
                        totalWords: work?.totalWords || 0,
                        totalCharacters: work?.totalCharacters || 0,
                        lastUpdated
                    };
                },
                refreshWorkStats: async (workId: string) => {
                    // CR-SQLite 中统计实时计算,无需刷新缓存
                    return;
                },
                getActivityStats: async (authorId: string, startDate: Date, endDate: Date) => {
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
     * 获取协同编辑 Repository
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
    get manager(): CRSQLiteManager {
        return this.crsqliteManager;
    }

    /**
     * 关闭所有连接
     */
    async close(): Promise<void> {
        if (this.crsqliteManager) {
            this.crsqliteManager.close();
        }
    }
}