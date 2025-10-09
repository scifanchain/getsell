import { RepositoryContainer } from '../data/RepositoryContainer';
import { GestallCrypto } from '../crypto/crypto';
import { UserService } from './UserService';
import { WorkService } from './WorkService';
import { ChapterService, IChapterService } from './ChapterService';
import { ContentService, IContentService } from './ContentService';
import { IUserService, IWorkService } from './interfaces';

/**
 * 服务容器
 * 负责创建和管理所有服务实例
 * 实现依赖注入模式
 */
export class ServiceContainer {
    private repositories: RepositoryContainer;
    private crypto: GestallCrypto;

    // 服务实例（懒加载）
    private _userService?: IUserService;
    private _workService?: IWorkService;
    private _chapterService?: IChapterService;
    private _contentService?: IContentService;

    constructor(repositories: RepositoryContainer) {
        this.repositories = repositories;
        this.crypto = new GestallCrypto();
    }

    /**
     * 获取用户服务
     */
    get userService(): IUserService {
        if (!this._userService) {
            this._userService = new UserService(this.repositories, this.crypto);
        }
        return this._userService;
    }

    /**
     * 获取作品服务
     */
    get workService(): IWorkService {
        if (!this._workService) {
            this._workService = new WorkService(this.repositories);
        }
        return this._workService;
    }

    /**
     * 获取章节服务
     */
    get chapterService(): IChapterService {
        if (!this._chapterService) {
            this._chapterService = new ChapterService(this.repositories);
        }
        return this._chapterService;
    }

    /**
     * 获取内容服务
     */
    get contentService(): IContentService {
        if (!this._contentService) {
            this._contentService = new ContentService(this.repositories);
        }
        return this._contentService;
    }

    /**
     * 获取 Repository 容器
     */
    get repositoryContainer(): RepositoryContainer {
        return this.repositories;
    }

    /**
     * 获取加密服务
     */
    get cryptoService(): GestallCrypto {
        return this.crypto;
    }
}