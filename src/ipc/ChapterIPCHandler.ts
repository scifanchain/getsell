import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { ServiceContainer } from '../services/ServiceContainer';

/**
 * 章节相关的 IPC 处理器
 * 处理渲染进程发送的章节相关请求
 */
export class ChapterIPCHandler {
    constructor(
        private services: ServiceContainer
    ) {}

    /**
     * 注册所有章节相关的 IPC 处理器
     */
    initialize(): void {
        console.log('📖 章节相关 IPC 处理器已注册');

        // 创建章节
        ipcMain.handle('chapter:create', async (event: IpcMainInvokeEvent, authorId: string, chapterData: any) => {
            try {
                const chapter = await this.services.chapterService.createChapter(authorId, chapterData);
                return { success: true, data: chapter };
            } catch (error: any) {
                console.error('创建章节失败:', error);
                return { success: false, error: error.message };
            }
        });

        // 获取章节详情
        ipcMain.handle('chapter:get', async (event: IpcMainInvokeEvent, chapterId: string, userId?: string) => {
            try {
                const chapter = await this.services.chapterService.getChapter(chapterId, userId || 'user_mock_001');
                if (!chapter) {
                    return { success: false, error: '章节不存在' };
                }
                return { success: true, data: chapter };
            } catch (error: any) {
                console.error('获取章节详情失败:', error);
                return { success: false, error: error.message };
            }
        });

        // 获取作品的章节列表
        ipcMain.handle('chapter:list', async (event: IpcMainInvokeEvent, workId: string, userId?: string) => {
            try {
                const chapters = await this.services.chapterService.getChaptersByWork(workId, userId || 'user_mock_001');
                return { success: true, data: chapters };
            } catch (error: any) {
                console.error('获取章节列表失败:', error);
                return { success: false, error: error.message };
            }
        });

        // 更新章节
        ipcMain.handle('chapter:update', async (event: IpcMainInvokeEvent, chapterId: string, userId: string, updateData: any) => {
            try {
                const chapter = await this.services.chapterService.updateChapter(chapterId, userId, updateData);
                return { success: true, data: chapter };
            } catch (error: any) {
                console.error('更新章节失败:', error);
                return { success: false, error: error.message };
            }
        });

        // 删除章节
        ipcMain.handle('chapter:delete', async (event: IpcMainInvokeEvent, chapterId: string, userId?: string) => {
            try {
                await this.services.chapterService.deleteChapter(chapterId, userId || 'user_mock_001');
                return { success: true };
            } catch (error: any) {
                console.error('删除章节失败:', error);
                return { success: false, error: error.message };
            }
        });

        // 重新排序章节
        ipcMain.handle('chapter:reorder', async (event: IpcMainInvokeEvent, workId: string, userId: string, chapterOrders: Array<{ chapterId: string; orderIndex: number }>) => {
            try {
                await this.services.chapterService.reorderChapters(workId, userId, chapterOrders);
                return { success: true };
            } catch (error: any) {
                console.error('重新排序章节失败:', error);
                return { success: false, error: error.message };
            }
        });

        // 批量更新章节顺序（包括层级和父节点）
        ipcMain.handle('chapters:reorder', async (event: IpcMainInvokeEvent, userId: string, chapters: Array<{ id: string; parentId?: string; orderIndex: number; level: number }>) => {
            try {
                console.log(`批量更新 ${chapters.length} 个章节的顺序`);
                
                // 使用 ChapterRepository 的批量更新方法
                await this.services.repositoryContainer.chapterRepository.batchReorder(chapters);
                
                console.log('✅ 批量更新章节顺序成功');
                return { success: true, data: undefined };
            } catch (error: any) {
                console.error('批量更新章节顺序失败:', error);
                return { success: false, error: error.message };
            }
        });

        // 兼容旧接口：使用 chapterData 参数（不需要 authorId）
        ipcMain.handle('chapter:createLegacy', async (event: IpcMainInvokeEvent, chapterData: any) => {
            try {
                const authorId = chapterData.authorId || 'user_mock_001';
                const chapter = await this.services.chapterService.createChapter(authorId, chapterData);
                return { success: true, data: { chapterId: chapter.id, chapter } };
            } catch (error: any) {
                console.error('创建章节失败（旧接口）:', error);
                return { success: false, error: error.message };
            }
        });
    }
}