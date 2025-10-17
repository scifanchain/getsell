import type { Content, NewContent, UpdateContent, ContentVersion } from '../../db/schema';
import type { ContentData, QueryOptions } from '../../shared/types';

/**
 * 内容仓储接口
 * 定义所有内容相关的数据访问操作
 */
export interface IContentRepository {
    /**
     * 创建新内容
     * @param contentData 内容数据
     * @returns 创建的内容信息
     */
    create(contentData: Omit<NewContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Content>;

    /**
     * 根据ID查找内容
     * @param id 内容ID
     * @returns 内容详细信息
     */
    findById(id: string): Promise<Content | null>;

    /**
     * 获取作品的内容列表
     * @param workId 作品ID
     * @returns 内容列表
     */
    findByWork(workId: string): Promise<Content[]>;

    /**
     * 获取章节的内容列表
     * @param chapterId 章节ID
     * @param options 查询选项
     * @returns 内容列表
     */
    findByChapter(chapterId: string, options?: QueryOptions): Promise<Content[]>;

    /**
     * 更新内容
     * @param id 内容ID
     * @param updateData 更新数据
     * @returns 更新后的内容信息
     */
    update(id: string, updateData: UpdateContent): Promise<Content>;

    /**
     * 删除内容
     * @param id 内容ID
     */
    delete(id: string): Promise<void>;

    /**
     * 重新排序内容
     * @param workId 作品ID
     * @param contentOrders 内容ID和新顺序的映射
     */
    reorder(workId: string, contentOrders: Array<{ id: string; orderIndex: number }>): Promise<void>;

    /**
     * 搜索内容
     * @param query 搜索关键词
     * @returns 匹配的内容列表
     */
    search(query: string): Promise<Content[]>;

    /**
     * 获取内容的版本历史
     * @param contentId 内容ID
     * @returns 版本历史列表
     */
    getVersionHistory(contentId: string): Promise<ContentVersion[]>;

    /**
     * 创建内容版本
     * @param contentId 内容ID
     * @param contentJson 内容JSON
     * @param changeSummary 变更摘要
     * @param authorId 作者ID
     * @returns 创建的版本信息
     */
    createVersion(contentId: string, contentJson: string, changeSummary?: string, authorId?: string): Promise<ContentVersion>;

    /**
     * 获取特定版本
     * @param contentId 内容ID
     * @param versionNumber 版本号
     * @returns 版本信息
     */
    getVersion(contentId: string, versionNumber: number): Promise<ContentVersion | null>;

    /**
     * 恢复到指定版本
     * @param contentId 内容ID
     * @param versionNumber 版本号
     * @returns 恢复后的内容信息
     */
    restoreVersion(contentId: string, versionNumber: number): Promise<Content>;
}