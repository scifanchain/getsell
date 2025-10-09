import { ipcMain } from 'electron';
import { ServiceContainer } from '../services/ServiceContainer';

/**
 * 作品相关的 IPC 处理器
 */
export class WorkIPCHandler {
    constructor(private services: ServiceContainer) {}

    initialize() {
        console.log('📚 作品相关 IPC 处理器已注册');
        this.registerHandlers();
    }

    private registerHandlers() {
        // 创建作品
        ipcMain.handle('work:create', async (event, authorId, workData) => {
            try {
                return await this.services.workService.createWork(authorId, workData);
            } catch (error) {
                console.error('Create work error:', error);
                throw error;
            }
        });

        // 获取作品详情
        ipcMain.handle('work:get', async (event, workId, userId) => {
            try {
                return await this.services.workService.getWork(workId, userId);
            } catch (error) {
                console.error('Get work error:', error);
                throw error;
            }
        });

        // 获取用户作品列表
        ipcMain.handle('work:getUserWorks', async (event, userId, options) => {
            try {
                return await this.services.workService.getUserWorks(userId, options);
            } catch (error) {
                console.error('Get user works error:', error);
                throw error;
            }
        });

        // 更新作品
        ipcMain.handle('work:update', async (event, workId, userId, updateData) => {
            try {
                return await this.services.workService.updateWork(workId, userId, updateData);
            } catch (error) {
                console.error('Update work error:', error);
                throw error;
            }
        });

        // 删除作品
        ipcMain.handle('work:delete', async (event, workId, userId) => {
            try {
                await this.services.workService.deleteWork(workId, userId);
                return { success: true };
            } catch (error) {
                console.error('Delete work error:', error);
                throw error;
            }
        });

        // 搜索作品
        ipcMain.handle('work:search', async (event, query, userId) => {
            try {
                return await this.services.workService.searchWorks(query, userId);
            } catch (error) {
                console.error('Search works error:', error);
                throw error;
            }
        });

        // 获取作品统计
        ipcMain.handle('work:getStats', async (event, workId) => {
            try {
                return await this.services.workService.getWorkStats(workId);
            } catch (error) {
                console.error('Get work stats error:', error);
                throw error;
            }
        });

        // 发布作品
        ipcMain.handle('work:publish', async (event, workId, userId) => {
            try {
                return await this.services.workService.publishWork(workId, userId);
            } catch (error) {
                console.error('Publish work error:', error);
                throw error;
            }
        });
    }
}