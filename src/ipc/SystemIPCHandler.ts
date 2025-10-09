import { ipcMain } from 'electron';
import { ServiceContainer } from '../services/ServiceContainer';

/**
 * 系统和窗口相关的 IPC 处理器
 */
export class SystemIPCHandler {
    constructor(private services: ServiceContainer, private mainWindow: any) {}

    initialize() {
        console.log('⚙️ 系统相关 IPC 处理器已注册');
        this.registerHandlers();
    }

    private registerHandlers() {
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

        // 窗口控制
        ipcMain.handle('window:minimize', () => {
            try {
                if (this.mainWindow) {
                    this.mainWindow.minimize();
                }
                return { success: true };
            } catch (error: any) {
                console.error('Window minimize error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('window:maximize', () => {
            try {
                if (this.mainWindow) {
                    this.mainWindow.maximize();
                }
                return { success: true };
            } catch (error: any) {
                console.error('Window maximize error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('window:toggleMaximize', () => {
            try {
                if (this.mainWindow) {
                    if (this.mainWindow.isMaximized()) {
                        this.mainWindow.unmaximize();
                    } else {
                        this.mainWindow.maximize();
                    }
                }
                return { success: true };
            } catch (error: any) {
                console.error('Window toggle maximize error:', error);
                return { success: false, error: error.message };
            }
        });

        ipcMain.handle('window:close', () => {
            try {
                if (this.mainWindow) {
                    this.mainWindow.close();
                }
                return { success: true };
            } catch (error: any) {
                console.error('Window close error:', error);
                return { success: false, error: error.message };
            }
        });
    }
}