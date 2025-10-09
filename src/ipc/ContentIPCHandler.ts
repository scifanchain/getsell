import { ipcMain } from 'electron';
import { ServiceContainer } from '../services/ServiceContainer';

/**
 * 内容相关的 IPC 处理器
 */
export class ContentIPCHandler {
    constructor(private services: ServiceContainer) {
        this.registerHandlers();
    }

    /**
     * 初始化内容 IPC 处理器
     */
    initialize() {
        console.log('📝 内容相关 IPC 处理器已注册');
    }

    private registerHandlers() {
        // 创建内容
        ipcMain.handle('content:create', async (event, authorId, contentData) => {
            try {
                return await this.services.contentService.createContent(authorId, contentData);
            } catch (error) {
                console.error('Create content error:', error);
                throw error;
            }
        });

        // 获取内容
        ipcMain.handle('content:get', async (event, contentId, userId) => {
            try {
                return await this.services.contentService.getContent(contentId, userId);
            } catch (error) {
                console.error('Get content error:', error);
                throw error;
            }
        });

        // 获取章节的所有内容
        ipcMain.handle('content:getByChapter', async (event, chapterId, userId) => {
            try {
                return await this.services.contentService.getContentByChapter(chapterId, userId);
            } catch (error) {
                console.error('Get content by chapter error:', error);
                throw error;
            }
        });

        // 更新内容
        ipcMain.handle('content:update', async (event, contentId, userId, updateData) => {
            try {
                return await this.services.contentService.updateContent(contentId, userId, updateData);
            } catch (error) {
                console.error('Update content error:', error);
                throw error;
            }
        });

        // 自动保存内容
        ipcMain.handle('content:autoSave', async (event, contentId, userId, content) => {
            try {
                return await this.services.contentService.autoSaveContent(contentId, userId, content);
            } catch (error) {
                console.error('Auto save content error:', error);
                throw error;
            }
        });

        // 删除内容
        ipcMain.handle('content:delete', async (event, contentId, userId) => {
            try {
                return await this.services.contentService.deleteContent(contentId, userId);
            } catch (error) {
                console.error('Delete content error:', error);
                throw error;
            }
        });

        // 获取内容历史
        ipcMain.handle('content:getHistory', async (event, contentId, userId) => {
            try {
                return await this.services.contentService.getContentHistory(contentId, userId);
            } catch (error) {
                console.error('Get content history error:', error);
                throw error;
            }
        });
    }
}