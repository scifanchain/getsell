import { ServiceContainer } from '../services/ServiceContainer';
import { UserIPCHandler } from './UserIPCHandler';
import { WorkIPCHandler } from './WorkIPCHandler';
import { SystemIPCHandler } from './SystemIPCHandler';
import { ChapterIPCHandler } from '../services/ChapterIPCHandler';

/**
 * IPC 处理器管理器
 * 负责注册所有 IPC 处理器
 */
export class IPCManager {
    private userHandler: UserIPCHandler;
    private workHandler: WorkIPCHandler;
    private systemHandler: SystemIPCHandler;
    private chapterHandler: ChapterIPCHandler;

    constructor(services: ServiceContainer, mainWindow: any) {
        this.userHandler = new UserIPCHandler(services);
        this.workHandler = new WorkIPCHandler(services);
        this.systemHandler = new SystemIPCHandler(services, mainWindow);
        this.chapterHandler = new ChapterIPCHandler(services);
    }

    /**
     * 初始化所有 IPC 处理器
     */
    initialize() {
        console.log('✅ IPC 处理器已初始化');
        
        // 实际初始化各个处理器
        this.userHandler.initialize();
        this.workHandler.initialize();
        this.chapterHandler.initialize();
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