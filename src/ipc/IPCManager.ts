import { ServiceContainer } from '../services/ServiceContainer';
import { AuthorIPCHandler } from './AuthorIPCHandler';
import { WorkIPCHandler } from './WorkIPCHandler';
import { SystemIPCHandler } from './SystemIPCHandler';
import { ChapterIPCHandler } from './ChapterIPCHandler';
import { ContentIPCHandler } from './ContentIPCHandler';
import { DatabaseManager } from '../core/db-manager';

/**
 * IPC 处理器管理器
 * 负责注册所有 IPC 处理器
 */
export class IPCManager {
    private authorHandler: AuthorIPCHandler;
    private workHandler: WorkIPCHandler;
    private systemHandler: SystemIPCHandler;
    private chapterHandler: ChapterIPCHandler;
    private contentHandler: ContentIPCHandler;

    constructor(services: ServiceContainer, mainWindow: any, dbManager?: DatabaseManager) {
        this.authorHandler = new AuthorIPCHandler(services);
        this.workHandler = new WorkIPCHandler(services);
        this.systemHandler = new SystemIPCHandler(services, mainWindow, dbManager);
        this.chapterHandler = new ChapterIPCHandler(services);
        this.contentHandler = new ContentIPCHandler(services);
    }

    /**
     * 初始化所有 IPC 处理器
     */
    initialize() {
        console.log('✅ IPC 处理器已初始化');
        
        // 实际初始化各个处理器
        this.authorHandler.initialize();
        this.workHandler.initialize();
        this.chapterHandler.initialize();
        this.contentHandler.initialize();
        this.systemHandler.initialize();
    }

    /**
     * 清理所有 IPC 处理器
     */
    cleanup() {
        // 如果需要，可以在这里移除 IPC 监听器
        console.log('🧹 IPC 处理器已清理');
    }
}