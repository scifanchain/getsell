import { ContentData, PaginationOptions } from './types';

/**
 * 内容仓储接口
 * 定义所有内容相关的数据访问操作
 */
export interface IContentRepository {
    /**
     * 创建新内容
     * @param contentData 内容数据
     * @returns 创建的内容信息（包含统计数据）
     */
    create(contentData: ContentData): Promise<any>;

    /**
     * 根据ID查找内容
     * @param id 内容ID
     * @returns 内容详细信息
     */
    findById(id: string): Promise<any | null>;

    /**
     * 获取作品的内容列表
     * @param workId 作品ID
     * @param chapterId 可选的章节ID筛选
     * @param pagination 分页选项
     * @returns 内容列表
     */
    findByWork(workId: string, chapterId?: string | null, pagination?: PaginationOptions): Promise<any[]>;

    /**
     * 获取章节的内容列表
     * @param chapterId 章节ID
     * @param pagination 分页选项
     * @returns 内容列表
     */
    findByChapter(chapterId: string, pagination?: PaginationOptions): Promise<any[]>;

    /**
     * 更新内容
     * @param id 内容ID
     * @param updateData 更新数据
     * @returns 更新后的内容信息
     */
    update(id: string, updateData: Partial<ContentData>): Promise<any>;

    /**
     * 删除内容
     * @param id 内容ID
     */
    delete(id: string): Promise<void>;

    /**
     * 重新排序内容
     * @param workId 作品ID
     * @param chapterId 章节ID（可选）
     * @param contentOrders 内容ID和新顺序的映射
     */
    reorder(workId: string, chapterId: string | null, contentOrders: Array<{ id: string; orderIndex: number }>): Promise<void>;

    /**
     * 搜索内容
     * @param workId 作品ID
     * @param query 搜索关键词
     * @param chapterId 可选的章节ID筛选
     * @returns 匹配的内容列表
     */
    search(workId: string, query: string, chapterId?: string): Promise<any[]>;

    /**
     * 获取内容的版本历史
     * @param contentId 内容ID
     * @returns 版本历史列表
     */
    getVersionHistory(contentId: string): Promise<any[]>;

    /**
     * 创建内容版本
     * @param contentId 内容ID
     * @param versionData 版本数据
     * @returns 创建的版本信息
     */
    createVersion(contentId: string, versionData: any): Promise<any>;
}