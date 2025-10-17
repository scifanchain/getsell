import { ipcMain } from 'electron';
import { ServiceContainer } from '../services/ServiceContainer';
import { authorConfigStore } from '../core/storage/AuthorConfigStore';
import { DatabaseManager } from '../core/db-manager';

/**
 * 系统和窗口相关的 IPC 处理器
 */
export class SystemIPCHandler {
    constructor(
        private services: ServiceContainer, 
        private mainWindow: any,
        private dbManager?: DatabaseManager
    ) {}

    initialize() {
        console.log('⚙️ 系统相关 IPC 处理器已注册');
        this.registerHandlers();
    }

    private registerHandlers() {
        console.log('🔧 开始注册系统相关 IPC 处理器...')
        
        // 系统统计
        ipcMain.handle('system:getStats', async (event) => {
            try {
                const stats = await this.services.repositoryContainer.statsRepository.getSystemStats();
                return { success: true, data: { stats } };
            } catch (error) {
                console.error('Get system stats error:', error);
                throw error;
            }
        });
        console.log('✅ system:getStats 处理器已注册')

        // 生成ID
        ipcMain.handle('system:generateId', () => {
            const { ulid } = require('ulid');
            return ulid();
        });

        // 获取时间戳
        ipcMain.handle('system:getTimestamp', (event, ulidValue) => {
            try {
                const ulidGenerator = require('../core/ulid').default;
                return ulidGenerator.getTimestamp(ulidValue);
            } catch (error) {
                return null;
            }
        });

        // 作者配置管理
        ipcMain.handle('author:saveConfig', async (event, config) => {
            try {
                if (config.currentAuthorId !== undefined) {
                    await authorConfigStore.setCurrentAuthorId(config.currentAuthorId);
                }
                if (config.rememberLogin !== undefined) {
                    await authorConfigStore.setRememberLogin(config.rememberLogin);
                }
                if (config.autoLogin !== undefined) {
                    await authorConfigStore.setAutoLogin(config.autoLogin);
                }
                return { success: true };
            } catch (error) {
                console.error('Save author config error:', error);
                throw error;
            }
        });

        ipcMain.handle('author:loadConfig', async (event) => {
            try {
                const currentAuthorId = authorConfigStore.getCurrentAuthorId();
                const rememberLogin = authorConfigStore.shouldRememberLogin();
                const autoLogin = authorConfigStore.shouldAutoLogin();
                const isExpired = authorConfigStore.isLoginExpired();
                
                return { 
                    success: true, 
                    data: { 
                        currentAuthorId: isExpired ? undefined : currentAuthorId,
                        rememberLogin,
                        autoLogin,
                        isExpired
                    } 
                };
            } catch (error) {
                console.error('Load author config error:', error);
                throw error;
            }
        });

        ipcMain.handle('author:clearConfig', async (event) => {
            try {
                await authorConfigStore.clearAuthorData();
                return { success: true };
            } catch (error) {
                console.error('Clear author config error:', error);
                throw error;
            }
        });

        ipcMain.handle('author:refreshLogin', async (event) => {
            try {
                await authorConfigStore.refreshLoginTime();
                return { success: true };
            } catch (error) {
                console.error('Refresh login error:', error);
                throw error;
            }
        });

        ipcMain.handle('author:shouldRefresh', async (event) => {
            try {
                const shouldRefresh = authorConfigStore.shouldRefreshLogin();
                return { success: true, data: { shouldRefresh } };
            } catch (error) {
                console.error('Check refresh login error:', error);
                throw error;
            }
        });

        // 最后编辑内容管理
        ipcMain.handle('author:setLastEditedContent', async (event, { workId, chapterId, contentId }) => {
            try {
                await authorConfigStore.setLastEditedContent(workId, chapterId, contentId);
                return { success: true };
            } catch (error) {
                console.error('Set last edited content error:', error);
                throw error;
            }
        });

        ipcMain.handle('author:getLastEditedContent', async (event) => {
            try {
                const lastEditedContent = await authorConfigStore.getLastEditedContent();
                return { success: true, data: lastEditedContent };
            } catch (error) {
                console.error('Get last edited content error:', error);
                throw error;
            }
        });

        ipcMain.handle('author:clearLastEditedContent', async (event) => {
            try {
                await authorConfigStore.clearLastEditedContent();
                return { success: true };
            } catch (error) {
                console.error('Clear last edited content error:', error);
                throw error;
            }
        });

        // 窗口控制
        ipcMain.handle('window:minimize', () => {
            console.log('📨 收到窗口最小化请求');
            try {
                if (this.mainWindow) {
                    this.mainWindow.minimize();
                    console.log('✅ 窗口已最小化');
                }
                return { success: true };
            } catch (error: any) {
                console.error('Window minimize error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('window:maximize', () => {
            console.log('📨 收到窗口最大化请求');
            try {
                if (this.mainWindow) {
                    this.mainWindow.maximize();
                    console.log('✅ 窗口已最大化');
                }
                return { success: true };
            } catch (error: any) {
                console.error('Window maximize error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('window:toggleMaximize', () => {
            console.log('📨 收到切换最大化请求');
            try {
                if (this.mainWindow) {
                    if (this.mainWindow.isMaximized()) {
                        this.mainWindow.unmaximize();
                        console.log('✅ 窗口已还原');
                    } else {
                        this.mainWindow.maximize();
                        console.log('✅ 窗口已最大化');
                    }
                }
                return { success: true };
            } catch (error: any) {
                console.error('Window toggle maximize error:', error);
                return { success: false, error: error.message };
            }
        });

        // 🔧 优化：快速清理 + 强制退出保护
        ipcMain.handle('window:close', () => {
            console.log('📨 收到窗口关闭请求')
            
            // 立即启动强制退出保护（1秒后强制退出）
            const forceExitTimer = setTimeout(() => {
                console.log('⚡ 强制退出保护触发');
                process.exit(0);
            }, 1000);
            
            // 尝试快速清理关键资源
            try {
                console.log('🧹 快速清理关键资源...');
                
                // 通过构造函数传入的 dbManager 关闭数据库
                if (this.dbManager) {
                    try {
                        this.dbManager.close();
                        console.log('✅ 数据库连接已关闭');
                    } catch (dbError: any) {
                        console.log('⚠️ 数据库关闭出错，忽略:', dbError?.message || dbError);
                    }
                }
                
                console.log('📝 应用即将退出');
                
                // 清理成功，提前退出
                clearTimeout(forceExitTimer);
                process.exit(0);
                
            } catch (error: any) {
                console.error('❌ 清理时出错:', error?.message || error);
                // 清理失败，让强制退出保护处理
            }
            
            return { success: true };
        });
        console.log('✅ window:close 处理器已注册')
        console.log('🎉 系统相关 IPC 处理器注册完成')
    }
}